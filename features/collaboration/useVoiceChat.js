'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
}

/**
 * High-performance WebRTC Mesh Live Voice Chat Hook for SyncBoard.
 * Uses MQTT as the low-latency signaling channel for zero-config P2P audio.
 */
export function useVoiceChat({
  currentUser,
  broadcastVoicePresence,
  broadcastVoiceSignal,
}) {
  const [isJoined, setIsJoined] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceUsers, setVoiceUsers] = useState({}) // { [userId]: { id, name, color, isMuted, isSpeaking, lastSeen } }

  const localStreamRef = useRef(null)
  const peerConnectionsRef = useRef({}) // { [userId]: RTCPeerConnection }
  const remoteAudiosRef = useRef({}) // { [userId]: HTMLAudioElement }
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const isJoinedRef = useRef(false)
  const isMutedRef = useRef(false)
  const isSpeakingRef = useRef(false)
  const currentUserRef = useRef(currentUser)

  currentUserRef.current = currentUser
  isJoinedRef.current = isJoined
  isMutedRef.current = isMuted

  // Close connection & clean up audio for a specific peer
  const closePeerConnection = useCallback((peerId) => {
    const pc = peerConnectionsRef.current[peerId]
    if (pc) {
      try {
        pc.close()
      } catch (_) {}
      delete peerConnectionsRef.current[peerId]
    }

    const audioEl = remoteAudiosRef.current[peerId]
    if (audioEl) {
      try {
        audioEl.srcObject = null
        audioEl.remove()
      } catch (_) {}
      delete remoteAudiosRef.current[peerId]
    }
  }, [])

  // Create an RTCPeerConnection for a remote peer
  const createPeerConnection = useCallback(
    (targetUserId) => {
      if (peerConnectionsRef.current[targetUserId]) {
        return peerConnectionsRef.current[targetUserId]
      }

      const pc = new RTCPeerConnection(ICE_SERVERS)

      // Add local audio tracks if we have any
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current)
        })
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          broadcastVoiceSignal?.({
            type: 'candidate',
            candidate: event.candidate,
            senderId: currentUserRef.current.id,
            targetId: targetUserId,
          })
        }
      }

      // Handle remote incoming audio track
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams
        if (!remoteStream) return

        let audioEl = remoteAudiosRef.current[targetUserId]
        if (!audioEl) {
          audioEl = document.createElement('audio')
          audioEl.autoplay = true
          audioEl.playsInline = true
          audioEl.style.display = 'none'
          document.body.appendChild(audioEl)
          remoteAudiosRef.current[targetUserId] = audioEl
        }
        audioEl.srcObject = remoteStream
        audioEl.play().catch(() => {})
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          closePeerConnection(targetUserId)
        }
      }

      peerConnectionsRef.current[targetUserId] = pc
      return pc
    },
    [broadcastVoiceSignal, closePeerConnection]
  )

  // Start checking local microphone audio level (speaking detector)
  const startSpeakingDetection = useCallback((stream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const audioCtx = new AudioCtx()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.4
      source.connect(analyser)

      audioContextRef.current = audioCtx
      analyserRef.current = analyser

      const checkAudio = () => {
        if (!analyserRef.current || !isJoinedRef.current) return

        const buffer = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(buffer)
        let sum = 0
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i]
        }
        const average = sum / buffer.length

        // Speaking threshold: volume above 14 and not muted
        const speakingNow = average > 14 && !isMutedRef.current

        if (speakingNow !== isSpeakingRef.current) {
          isSpeakingRef.current = speakingNow
          setIsSpeaking(speakingNow)
          broadcastVoicePresence?.({
            type: 'speaking',
            userId: currentUserRef.current.id,
            isSpeaking: speakingNow,
          })
        }
      }

      const interval = setInterval(checkAudio, 150)
      return () => clearInterval(interval)
    } catch (_) {}
  }, [broadcastVoicePresence])

  // Join Voice Call
  const joinVoice = useCallback(async () => {
    if (typeof window === 'undefined') return
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Voice chat not supported on this browser')
      return
    }

    try {
      toast.loading('Connecting microphone...', { id: 'voice-toast' })
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })

      localStreamRef.current = stream
      setIsJoined(true)
      setIsMuted(false)
      isJoinedRef.current = true
      isMutedRef.current = false

      // Add local user to voice users list
      setVoiceUsers((prev) => ({
        ...prev,
        [currentUser.id]: {
          id: currentUser.id,
          name: currentUser.name,
          color: currentUser.color,
          isMuted: false,
          isSpeaking: false,
          lastSeen: Date.now(),
        },
      }))

      // Start speaking detector
      startSpeakingDetection(stream)

      // Broadcast join to all peers in room
      broadcastVoicePresence?.({
        type: 'join',
        user: {
          id: currentUser.id,
          name: currentUser.name,
          color: currentUser.color,
          isMuted: false,
          isSpeaking: false,
        },
      })

      toast.success('Joined Live Voice Room! 🎙️', { id: 'voice-toast' })
    } catch (err) {
      console.error('Microphone access denied:', err)
      toast.error('Microphone permission denied! Please allow mic access in browser.', { id: 'voice-toast' })
    }
  }, [currentUser, broadcastVoicePresence, startSpeakingDetection])

  // Leave Voice Call
  const leaveVoice = useCallback(() => {
    // Notify room
    if (isJoinedRef.current) {
      broadcastVoicePresence?.({
        type: 'leave',
        userId: currentUserRef.current.id,
      })
    }

    // Stop local audio tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    // Close all WebRTC peer connections
    Object.keys(peerConnectionsRef.current).forEach((id) => {
      closePeerConnection(id)
    })

    // Close audio context
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close()
      } catch (_) {}
      audioContextRef.current = null
      analyserRef.current = null
    }

    setIsJoined(false)
    setIsMuted(false)
    setIsSpeaking(false)
    isJoinedRef.current = false
    isMutedRef.current = false
    isSpeakingRef.current = false

    setVoiceUsers((prev) => {
      const next = { ...prev }
      delete next[currentUserRef.current.id]
      return next
    })

    toast('Left Voice Room', { icon: '👋' })
  }, [broadcastVoicePresence, closePeerConnection])

  // Toggle Mute
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return
    const nextMuted = !isMuted
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted
    })
    setIsMuted(nextMuted)
    isMutedRef.current = nextMuted

    if (nextMuted) {
      setIsSpeaking(false)
      isSpeakingRef.current = false
    }

    setVoiceUsers((prev) => {
      const current = prev[currentUserRef.current.id]
      if (!current) return prev
      return {
        ...prev,
        [currentUserRef.current.id]: {
          ...current,
          isMuted: nextMuted,
          isSpeaking: nextMuted ? false : current.isSpeaking,
        },
      }
    })

    broadcastVoicePresence?.({
      type: 'mute_change',
      userId: currentUserRef.current.id,
      isMuted: nextMuted,
    })

    toast(nextMuted ? 'Mic Muted 🔇' : 'Mic Unmuted 🎙️', { id: 'mute-toast', duration: 1500 })
  }, [isMuted, broadcastVoicePresence])

  // Handle incoming voice presence events from peers
  const handleVoicePresence = useCallback(
    async (payload) => {
      if (!payload || !payload.type) return
      const myId = currentUserRef.current.id

      // 1. Peer joined voice
      if (payload.type === 'join' && payload.user) {
        if (payload.user.id === myId) return
        const peer = payload.user
        setVoiceUsers((prev) => ({
          ...prev,
          [peer.id]: {
            ...peer,
            lastSeen: Date.now(),
          },
        }))

        // If local user is ALREADY in voice, initiate WebRTC offer to this new peer
        if (isJoinedRef.current && localStreamRef.current) {
          try {
            const pc = createPeerConnection(peer.id)
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)
            broadcastVoiceSignal?.({
              type: 'offer',
              sdp: offer,
              senderId: myId,
              targetId: peer.id,
            })
          } catch (err) {
            console.error('Failed to create offer to joiner:', err)
          }
        }
        return
      }

      // 2. Peer left voice
      if (payload.type === 'leave' && payload.userId) {
        if (payload.userId === myId) return
        closePeerConnection(payload.userId)
        setVoiceUsers((prev) => {
          const next = { ...prev }
          delete next[payload.userId]
          return next
        })
        return
      }

      // 3. Peer mute change
      if (payload.type === 'mute_change' && payload.userId) {
        setVoiceUsers((prev) => {
          const peer = prev[payload.userId]
          if (!peer) return prev
          return {
            ...prev,
            [payload.userId]: {
              ...peer,
              isMuted: payload.isMuted,
              lastSeen: Date.now(),
            },
          }
        })
        return
      }

      // 4. Peer speaking change
      if (payload.type === 'speaking' && payload.userId) {
        setVoiceUsers((prev) => {
          const peer = prev[payload.userId]
          if (!peer) return prev
          return {
            ...prev,
            [payload.userId]: {
              ...peer,
              isSpeaking: payload.isSpeaking,
              lastSeen: Date.now(),
            },
          }
        })
        return
      }

      // 5. Heartbeat ping / answer
      if (payload.type === 'heartbeat' && payload.user) {
        if (payload.user.id === myId) return
        setVoiceUsers((prev) => ({
          ...prev,
          [payload.user.id]: {
            ...payload.user,
            lastSeen: Date.now(),
          },
        }))
      }
    },
    [createPeerConnection, broadcastVoiceSignal, closePeerConnection]
  )

  // Handle incoming WebRTC signals (offer, answer, candidate)
  const handleVoiceSignal = useCallback(
    async (payload) => {
      const myId = currentUserRef.current.id
      if (payload.targetId !== myId) return

      try {
        if (payload.type === 'offer') {
          let pc = peerConnectionsRef.current[payload.senderId]
          if (!pc) {
            pc = createPeerConnection(payload.senderId)
          }
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          broadcastVoiceSignal?.({
            type: 'answer',
            sdp: answer,
            senderId: myId,
            targetId: payload.senderId,
          })
        } else if (payload.type === 'answer') {
          const pc = peerConnectionsRef.current[payload.senderId]
          if (pc && pc.signalingState !== 'closed') {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
          }
        } else if (payload.type === 'candidate') {
          const pc = peerConnectionsRef.current[payload.senderId]
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
          }
        }
      } catch (err) {
        console.error('WebRTC signal handling error:', err)
      }
    },
    [createPeerConnection, broadcastVoiceSignal]
  )

  // Heartbeat loop: periodically broadcast presence and prune dead peers
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now()

      // Broadcast heartbeat if joined
      if (isJoinedRef.current && currentUserRef.current) {
        broadcastVoicePresence?.({
          type: 'heartbeat',
          user: {
            id: currentUserRef.current.id,
            name: currentUserRef.current.name,
            color: currentUserRef.current.color,
            isMuted: isMutedRef.current,
            isSpeaking: isSpeakingRef.current,
          },
        })
      }

      // Prune inactive voice users (>14s)
      setVoiceUsers((prev) => {
        let changed = false
        const next = { ...prev }
        for (const uid in next) {
          if (uid !== currentUserRef.current.id && now - (next[uid].lastSeen || 0) > 14000) {
            delete next[uid]
            closePeerConnection(uid)
            changed = true
          }
        }
        return changed ? next : prev
      })
    }, 4000)

    return () => clearInterval(timer)
  }, [broadcastVoicePresence, closePeerConnection])

  // Cleanup on unmount or tab close
  useEffect(() => {
    const onBeforeUnload = () => {
      if (isJoinedRef.current) {
        broadcastVoicePresence?.({
          type: 'leave',
          userId: currentUserRef.current.id,
        })
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      leaveVoice()
    }
  }, [broadcastVoicePresence, leaveVoice])

  return {
    isJoined,
    isMuted,
    isSpeaking,
    voiceUsers,
    voiceCount: Object.keys(voiceUsers).length,
    joinVoice,
    leaveVoice,
    toggleMute,
    handleVoicePresence,
    handleVoiceSignal,
  }
}
