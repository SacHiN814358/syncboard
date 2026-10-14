'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { COLLABORATOR_COLORS } from '@/features/board/elements'
import { createMqttConnection } from '@/lib/realtime/mqttClient'

/**
 * High-performance multiplayer collaboration engine powered by resilient WebSockets.
 * Enables instant cross-laptop synchronization with zero server setup.
 *
 * @param {string} roomId
 * @param {{
 *   onRemoteElementsChange?: (elements: any[]) => void,
 *   onRemoteTitleChange?: (title: string) => void,
 *   onRemoteDrawPreview?: (drawData: any) => void,
 *   onReaction?: (reaction: any) => void,
 *   onPresenterUpdate?: (presenterData: any) => void,
 *   onChatMessage?: (chatData: any) => void,
 *   isHost?: boolean,
 *   currentElements?: any[],
 *   boardTitle?: string,
 * }} options
 */
export function useCollaboration(
  roomId,
  {
    onRemoteElementsChange,
    onRemoteTitleChange,
    onRemoteDrawPreview,
    onReaction,
    onPresenterUpdate,
    onChatMessage,
    isHost = false,
    currentElements = [],
    boardTitle = '',
  } = {}
) {
  const clientRef = useRef(null)
  const onRemoteElementsChangeRef = useRef(onRemoteElementsChange)
  const onRemoteTitleChangeRef = useRef(onRemoteTitleChange)
  const onRemoteDrawPreviewRef = useRef(onRemoteDrawPreview)
  const onReactionRef = useRef(onReaction)
  const onPresenterUpdateRef = useRef(onPresenterUpdate)
  const onChatMessageRef = useRef(onChatMessage)
  const currentElementsRef = useRef(currentElements)
  const boardTitleRef = useRef(boardTitle)

  useEffect(() => {
    onRemoteElementsChangeRef.current = onRemoteElementsChange
  }, [onRemoteElementsChange])

  useEffect(() => {
    onRemoteTitleChangeRef.current = onRemoteTitleChange
  }, [onRemoteTitleChange])

  useEffect(() => {
    onRemoteDrawPreviewRef.current = onRemoteDrawPreview
  }, [onRemoteDrawPreview])

  useEffect(() => {
    onReactionRef.current = onReaction
  }, [onReaction])

  useEffect(() => {
    onPresenterUpdateRef.current = onPresenterUpdate
  }, [onPresenterUpdate])

  useEffect(() => {
    onChatMessageRef.current = onChatMessage
  }, [onChatMessage])

  useEffect(() => {
    currentElementsRef.current = currentElements
  }, [currentElements])

  useEffect(() => {
    boardTitleRef.current = boardTitle
  }, [boardTitle])

  // Stable local user identity
  const [currentUser, setCurrentUser] = useState({
    id: 'usr-default',
    name: 'You',
    color: '#1971c2',
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
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
  const lastPreviewSendRef = useRef(0)

  // Clean room code
  const cleanRoom = (roomId || 'DEFAULT').toUpperCase().trim()

  useEffect(() => {
    if (!cleanRoom || typeof window === 'undefined') return

    const topicBase = `syncboard/v2/room/${cleanRoom}`
    const client = createMqttConnection(currentUser.id, cleanRoom)
    clientRef.current = client

    // Subscribe to all room channels
    client.on('connect', () => {
      setIsConnected(true)
      const wildcardTopic = `${topicBase}/#`
      client.subscribe(wildcardTopic, { qos: 0 }, (err) => {
        if (!err) {
          // Announce presence
          const joinPayload = {
            type: 'join',
            user: {
              id: currentUser.id,
              name: currentUser.name,
              color: currentUser.color,
              isHost: Boolean(isHost),
              joinedAt: new Date().toISOString(),
            },
            timestamp: Date.now(),
          }
          client.publish(`${topicBase}/presence`, JSON.stringify(joinPayload))

          // Request latest board state from any online collaborator
          client.publish(
            `${topicBase}/sync_request`,
            JSON.stringify({ requesterId: currentUser.id })
          )
        }
      })
    })

    client.on('offline', () => setIsConnected(false))
    client.on('reconnect', () => setIsConnected(true))
    client.on('error', () => {})

    // Handle incoming messages on all topics
    client.on('message', (topic, rawMessage) => {
      try {
        const payload = JSON.parse(rawMessage.toString())
        const subtopic = topic.replace(`${topicBase}/`, '')

        switch (subtopic) {
          case 'presence': {
            if (payload.userId === currentUser.id || payload.user?.id === currentUser.id) return
            const peer = payload.user || { id: payload.userId }

            if (payload.type === 'leave') {
              setCollaborators((prev) => prev.filter((c) => c.id !== peer.id))
              setRemoteCursors((prev) => {
                const next = { ...prev }
                delete next[peer.id]
                return next
              })
              return
            }

            // Join or heartbeat
            setCollaborators((prev) => {
              const existingIndex = prev.findIndex((c) => c.id === peer.id)
              const updatedPeer = { ...peer, lastSeen: Date.now() }
              if (existingIndex >= 0) {
                const next = [...prev]
                next[existingIndex] = { ...next[existingIndex], ...updatedPeer }
                return next
              }
              return [...prev, updatedPeer]
            })

            // If a new peer joined and we already have elements, answer them with state
            if (payload.type === 'join' && currentElementsRef.current?.length > 0) {
              client.publish(
                `${topicBase}/sync_response`,
                JSON.stringify({
                  targetId: peer.id,
                  elements: currentElementsRef.current,
                  title: boardTitleRef.current,
                })
              )
            }
            break
          }

          case 'sync_request': {
            if (payload.requesterId === currentUser.id) return
            // Send current board state back to the newly joined peer
            if (currentElementsRef.current && currentElementsRef.current.length > 0) {
              client.publish(
                `${topicBase}/sync_response`,
                JSON.stringify({
                  targetId: payload.requesterId,
                  elements: currentElementsRef.current,
                  title: boardTitleRef.current,
                })
              )
            }
            break
          }

          case 'sync_response': {
            if (payload.targetId !== currentUser.id) return
            if (Array.isArray(payload.elements) && payload.elements.length > 0) {
              onRemoteElementsChangeRef.current?.(payload.elements)
            }
            if (payload.title && onRemoteTitleChangeRef.current) {
              onRemoteTitleChangeRef.current(payload.title)
            }
            break
          }

          case 'cursor': {
            if (payload.userId === currentUser.id) return
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
            break
          }

          case 'draw_preview': {
            if (payload.userId === currentUser.id) return
            onRemoteDrawPreviewRef.current?.(payload)
            break
          }

          case 'elements': {
            if (payload.senderId === currentUser.id) return
            if (Array.isArray(payload.elements)) {
              onRemoteDrawPreviewRef.current?.({ userId: payload.senderId, element: null })
              onRemoteElementsChangeRef.current?.(payload.elements)
            }
            break
          }

          case 'reaction': {
            onReactionRef.current?.(payload)
            break
          }

          case 'presenter': {
            if (payload.userId === currentUser.id) return
            onPresenterUpdateRef.current?.(payload)
            break
          }

          case 'chat': {
            onChatMessageRef.current?.(payload)
            break
          }

          case 'kick': {
            if (payload.targetUserId === currentUser.id) {
              setIsKicked(true)
              try {
                client.end(true)
              } catch (_) {}
            } else {
              setCollaborators((prev) => prev.filter((p) => p.id !== payload.targetUserId))
              setRemoteCursors((prev) => {
                const next = { ...prev }
                delete next[payload.targetUserId]
                return next
              })
            }
            break
          }

          default:
            break
        }
      } catch (_) {}
    })

    // Heartbeat loop every 4.5s
    const heartbeatTimer = setInterval(() => {
      if (client.connected) {
        client.publish(
          `${topicBase}/presence`,
          JSON.stringify({
            type: 'heartbeat',
            user: {
              id: currentUser.id,
              name: currentUser.name,
              color: currentUser.color,
              isHost: Boolean(isHost),
            },
            timestamp: Date.now(),
          })
        )
      }

      // Prune inactive peers (>12s)
      const now = Date.now()
      setCollaborators((prev) => prev.filter((c) => now - (c.lastSeen || 0) < 14000))
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
    }, 4500)

    return () => {
      clearInterval(heartbeatTimer)
      try {
        if (client.connected) {
          client.publish(
            `${topicBase}/presence`,
            JSON.stringify({ type: 'leave', userId: currentUser.id })
          )
        }
        client.end(true)
      } catch (_) {}
      clientRef.current = null
      setIsConnected(false)
    }
  }, [cleanRoom, currentUser.id, currentUser.name, currentUser.color, isHost])

  /**
   * Broadcast pointer position in world coordinates (throttled to ~30ms).
   */
  const broadcastCursor = useCallback(
    (worldX, worldY) => {
      const now = Date.now()
      if (now - lastCursorSendRef.current < 28) return
      lastCursorSendRef.current = now

      if (!clientRef.current?.connected) return

      clientRef.current.publish(
        `syncboard/v2/room/${cleanRoom}/cursor`,
        JSON.stringify({
          userId: currentUser.id,
          name: currentUser.name,
          color: currentUser.color,
          x: Math.round(worldX),
          y: Math.round(worldY),
        })
      )
    },
    [cleanRoom, currentUser]
  )

  /**
   * Broadcast temporary stroke preview in real time (throttled for streaming, immediate for clear).
   */
  const broadcastDrawPreview = useCallback(
    (element) => {
      if (!clientRef.current?.connected) return
      const now = Date.now()

      // If clearing preview, send immediately without throttle
      if (!element) {
        lastPreviewSendRef.current = 0
        clientRef.current.publish(
          `syncboard/v2/room/${cleanRoom}/draw_preview`,
          JSON.stringify({
            userId: currentUser.id,
            element: null,
            timestamp: now,
          })
        )
        return
      }

      // Throttle preview streaming to ~28ms (~35 FPS) to keep WebSocket buffer ultra-clean
      if (now - lastPreviewSendRef.current < 28) return
      lastPreviewSendRef.current = now

      clientRef.current.publish(
        `syncboard/v2/room/${cleanRoom}/draw_preview`,
        JSON.stringify({
          userId: currentUser.id,
          element,
          timestamp: now,
        })
      )
    },
    [cleanRoom, currentUser]
  )

  /**
   * Broadcast finalized elements change to all peers.
   */
  const broadcastElementsUpdate = useCallback(
    (elements) => {
      if (!clientRef.current?.connected) return
      clientRef.current.publish(
        `syncboard/v2/room/${cleanRoom}/elements`,
        JSON.stringify({
          senderId: currentUser.id,
          elements,
        })
      )
    },
    [cleanRoom, currentUser]
  )

  /**
   * Broadcast emoji reaction.
   */
  const broadcastReaction = useCallback(
    (emoji, x, y) => {
      const reactionPayload = {
        id: `rx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: currentUser.id,
        emoji,
        x,
        y,
        color: currentUser.color,
        name: currentUser.name,
      }

      if (clientRef.current?.connected) {
        clientRef.current.publish(
          `syncboard/v2/room/${cleanRoom}/reaction`,
          JSON.stringify(reactionPayload)
        )
      }
      onReactionRef.current?.(reactionPayload)
    },
    [cleanRoom, currentUser]
  )

  /**
   * Broadcast presenter view stream coordinates.
   */
  const broadcastPresenterView = useCallback(
    (viewport, isPresenting = true) => {
      if (!clientRef.current?.connected) return
      clientRef.current.publish(
        `syncboard/v2/room/${cleanRoom}/presenter`,
        JSON.stringify({
          userId: currentUser.id,
          name: currentUser.name,
          color: currentUser.color,
          viewport,
          isPresenting: Boolean(isPresenting),
          timestamp: Date.now(),
        })
      )
    },
    [cleanRoom, currentUser]
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

      if (clientRef.current?.connected) {
        clientRef.current.publish(
          `syncboard/v2/room/${cleanRoom}/chat`,
          JSON.stringify(messagePayload)
        )
      }
      onChatMessageRef.current?.(messagePayload)
      return messagePayload
    },
    [cleanRoom, currentUser]
  )

  /**
   * Kick collaborator from room (host action).
   */
  const kickCollaborator = useCallback(
    (targetUserId) => {
      if (!clientRef.current?.connected) return
      clientRef.current.publish(
        `syncboard/v2/room/${cleanRoom}/kick`,
        JSON.stringify({
          targetUserId,
          hostId: currentUser.id,
        })
      )
      setCollaborators((prev) => prev.filter((c) => c.id !== targetUserId))
      setRemoteCursors((prev) => {
        const next = { ...prev }
        delete next[targetUserId]
        return next
      })
    },
    [cleanRoom, currentUser]
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
