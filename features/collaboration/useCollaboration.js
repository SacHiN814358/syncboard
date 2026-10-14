'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { COLLABORATOR_COLORS } from '@/features/board/elements'

/**
 * Hook for Supabase Realtime multiplayer collaboration.
 *
 * Channels:
 * 1. Presence: Announces this user, tracks who is in the room.
 * 2. Broadcast: Low-latency pointer/cursor positions and temporary drawing previews.
 * 3. Element Sync: Broadcasts finalized element additions, updates, deletions.
 *
 * @param {string} roomId
 * @param {{
 *   onRemoteElementsChange?: (elements: any[]) => void,
 *   onRemoteDrawPreview?: (drawData: any) => void,
 * }} callbacks
 */
export function useCollaboration(
  roomId,
  {
    onRemoteElementsChange,
    onRemoteDrawPreview,
    onReaction,
    onPresenterUpdate,
    onChatMessage,
    isHost = false,
  } = {}
) {
  const supabase = createClient()
  const channelRef = useRef(null)
  const onReactionRef = useRef(onReaction)
  const onPresenterUpdateRef = useRef(onPresenterUpdate)
  const onChatMessageRef = useRef(onChatMessage)

  useEffect(() => {
    onReactionRef.current = onReaction
  }, [onReaction])

  useEffect(() => {
    onPresenterUpdateRef.current = onPresenterUpdate
  }, [onPresenterUpdate])

  useEffect(() => {
    onChatMessageRef.current = onChatMessage
  }, [onChatMessage])

  // Stable local identity (starts with deterministic SSR default to avoid hydration mismatch)
  const [currentUser, setCurrentUser] = useState({
    id: 'usr-default',
    name: 'You',
    color: '#1971c2',
  })

  // Populate or generate persistent user identity on client mount only
  useEffect(() => {
    const saved = sessionStorage.getItem('syncboard_user')
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved))
        return
      } catch (_) {}
    }
    const colorIndex = Math.floor(Math.random() * COLLABORATOR_COLORS.length)
    const randomNum = Math.floor(100 + Math.random() * 900)
    const user = {
      id: `usr-${Math.random().toString(36).substring(2, 9)}`,
      name: `Dev ${randomNum}`,
      color: COLLABORATOR_COLORS[colorIndex],
    }
    sessionStorage.setItem('syncboard_user', JSON.stringify(user))
    setCurrentUser(user)
  }, [])

  const [collaborators, setCollaborators] = useState([])
  const [remoteCursors, setRemoteCursors] = useState({})
  const [isConnected, setIsConnected] = useState(false)
  const [isKicked, setIsKicked] = useState(false)
  const lastCursorSendRef = useRef(0)

  useEffect(() => {
    if (!supabase || !roomId) return

    const channelName = `syncboard:room:${roomId}`
    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: currentUser.id },
        broadcast: { ack: false },
      },
    })
    channelRef.current = channel

    // 1. Presence state sync (Who is online?)
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const peers = []
        for (const key in state) {
          const presences = state[key]
          if (presences && presences.length > 0) {
            const p = presences[0]
            if (p.id !== currentUser.id) {
              peers.push(p)
            }
          }
        }
        setCollaborators(peers)
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setRemoteCursors((prev) => {
          const next = { ...prev }
          delete next[key]
          return next
        })
      })

    // 2. Broadcast: Remote cursor movements (throttled)
    channel.on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
      if (!payload || payload.userId === currentUser.id) return
      setRemoteCursors((prev) => ({
        ...prev,
        [payload.userId]: {
          userId: payload.userId,
          name: payload.name,
          color: payload.color,
          x: payload.x,
          y: payload.y,
          lastSeen: Date.now(),
        },
      }))
    })

    // 3. Broadcast: In-progress stroke preview (transient)
    channel.on('broadcast', { event: 'draw_preview' }, ({ payload }) => {
      if (!payload || payload.userId === currentUser.id) return
      onRemoteDrawPreview?.(payload)
    })

    // 4. Broadcast: Finalized elements update
    channel.on('broadcast', { event: 'elements_update' }, ({ payload }) => {
      if (!payload || payload.senderId === currentUser.id) return
      onRemoteElementsChange?.(payload.elements)
    })

    // 5. Broadcast: Host removed/kicked a user
    channel.on('broadcast', { event: 'kick_user' }, ({ payload }) => {
      if (!payload) return
      if (payload.targetUserId === currentUser.id) {
        setIsKicked(true)
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current)
          channelRef.current = null
        }
      } else {
        setCollaborators((prev) => prev.filter((p) => p.id !== payload.targetUserId))
        setRemoteCursors((prev) => {
          const next = { ...prev }
          delete next[payload.targetUserId]
          return next
        })
      }
    })

    // 6. Broadcast: Emoji reaction event
    channel.on('broadcast', { event: 'emoji_reaction' }, ({ payload }) => {
      if (!payload) return
      onReactionRef.current?.(payload)
    })

    // 7. Broadcast: Presenter live viewport stream
    channel.on('broadcast', { event: 'presenter_view' }, ({ payload }) => {
      if (!payload || payload.userId === currentUser.id) return
      onPresenterUpdateRef.current?.(payload)
    })

    // 8. Broadcast: Realtime chat message
    channel.on('broadcast', { event: 'chat_message' }, ({ payload }) => {
      if (!payload) return
      onChatMessageRef.current?.(payload)
    })

    // Subscribe to channel
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true)
        await channel.track({
          id: currentUser.id,
          name: currentUser.name,
          color: currentUser.color,
          isHost: Boolean(isHost),
          joinedAt: new Date().toISOString(),
        })
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setIsConnected(false)
      }
    })

    // Stale cursor cleanup timer (prune cursors older than 10 seconds)
    const cleanupInterval = setInterval(() => {
      const now = Date.now()
      setRemoteCursors((prev) => {
        let changed = false
        const next = { ...prev }
        for (const uid in next) {
          if (now - next[uid].lastSeen > 8000) {
            delete next[uid]
            changed = true
          }
        }
        return changed ? next : prev
      })
    }, 4000)

    return () => {
      clearInterval(cleanupInterval)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsConnected(false)
    }
  }, [roomId, currentUser.id, currentUser.name, currentUser.color])

  /**
   * Broadcast pointer position in world coordinates (throttled to ~30ms).
   */
  const broadcastCursor = useCallback((worldX, worldY) => {
    const now = Date.now()
    if (now - lastCursorSendRef.current < 30) return
    lastCursorSendRef.current = now

    channelRef.current?.send({
      type: 'broadcast',
      event: 'cursor_move',
      payload: {
        userId: currentUser.id,
        name: currentUser.name,
        color: currentUser.color,
        x: worldX,
        y: worldY,
      },
    })
  }, [currentUser])

  /**
   * Broadcast transient in-progress drawing stroke for smooth real-time preview.
   */
  const broadcastDrawPreview = useCallback((previewElement) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'draw_preview',
      payload: {
        userId: currentUser.id,
        element: previewElement,
      },
    })
  }, [currentUser.id])

  /**
   * Broadcast finalized elements state to all connected peers.
   */
  const broadcastElementsUpdate = useCallback((elements) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'elements_update',
      payload: {
        senderId: currentUser.id,
        elements,
        timestamp: Date.now(),
      },
    })
  }, [currentUser.id])

  /**
   * Host kicks/removes an invited collaborator from this board.
   */
  const kickCollaborator = useCallback((targetUserId, targetUserName) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'kick_user',
      payload: {
        targetUserId,
        targetUserName,
        kickedBy: currentUser.name,
      },
    })
    setCollaborators((prev) => prev.filter((p) => p.id !== targetUserId))
    setRemoteCursors((prev) => {
      const next = { ...prev }
      delete next[targetUserId]
      return next
    })
  }, [currentUser.name])

  /**
   * Broadcast animated emoji reaction at (worldX, worldY).
   */
  const broadcastReaction = useCallback(
    (emoji, worldX, worldY) => {
      const reactionPayload = {
        id: `rx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: currentUser.id,
        userName: currentUser.name,
        userColor: currentUser.color,
        emoji,
        x: worldX,
        y: worldY,
        createdAt: Date.now(),
      }

      channelRef.current?.send({
        type: 'broadcast',
        event: 'emoji_reaction',
        payload: reactionPayload,
      })

      // Dispatch locally immediately for zero latency
      onReactionRef.current?.(reactionPayload)
    },
    [currentUser]
  )

  /**
   * Broadcast presenter view stream coordinates.
   */
  const broadcastPresenterView = useCallback(
    (viewport) => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'presenter_view',
        payload: {
          userId: currentUser.id,
          name: currentUser.name,
          color: currentUser.color,
          viewport,
        },
      })
    },
    [currentUser]
  )

  /**
   * Broadcast in-app realtime chat message.
   */
  const broadcastChatMessage = useCallback(
    (text) => {
      if (!text || !text.trim()) return null
      const messagePayload = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderColor: currentUser.color,
        text: text.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      channelRef.current?.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: messagePayload,
      })

      // Dispatch locally
      onChatMessageRef.current?.(messagePayload)
      return messagePayload
    },
    [currentUser]
  )

  return {
    currentUser,
    collaborators,
    remoteCursors,
    isConnected,
    isKicked,
    kickCollaborator,
    broadcastCursor,
    broadcastDrawPreview,
    broadcastElementsUpdate,
    broadcastReaction,
    broadcastPresenterView,
    broadcastChatMessage,
  }
}
