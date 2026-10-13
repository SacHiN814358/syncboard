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
export function useCollaboration(roomId, { onRemoteElementsChange, onRemoteDrawPreview } = {}) {
  const supabase = createClient()
  const channelRef = useRef(null)

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

    // Subscribe to channel
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true)
        await channel.track({
          id: currentUser.id,
          name: currentUser.name,
          color: currentUser.color,
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

  return {
    currentUser,
    collaborators,
    remoteCursors,
    isConnected,
    broadcastCursor,
    broadcastDrawPreview,
    broadcastElementsUpdate,
  }
}
