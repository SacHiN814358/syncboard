'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const STARTER_BOARD_ELEMENTS = [
  {
    id: 'starter-rect-1',
    type: 'rectangle',
    x: 80,
    y: 100,
    width: 220,
    height: 110,
    color: '#2563eb',
    strokeWidth: 2,
    fillColor: '#eff6ff',
  },
  {
    id: 'starter-text-1',
    type: 'text',
    x: 105,
    y: 135,
    text: 'Client (You)\nPaint in Real-time 🎨',
    color: '#2563eb',
    fontSize: 16,
  },
  {
    id: 'starter-arrow-1',
    type: 'arrow',
    x1: 300,
    y1: 155,
    x2: 430,
    y2: 155,
    color: '#000000',
    strokeWidth: 2.5,
  },
  {
    id: 'starter-rect-2',
    type: 'rectangle',
    x: 430,
    y: 100,
    width: 240,
    height: 110,
    color: '#16a34a',
    strokeWidth: 2,
    fillColor: '#f0fdf4',
  },
  {
    id: 'starter-text-2',
    type: 'text',
    x: 455,
    y: 135,
    text: 'Peer Collaborator\nLive Strokes & Cursors ⚡',
    color: '#16a34a',
    fontSize: 16,
  },
  {
    id: 'starter-sticky-1',
    type: 'sticky',
    x: 80,
    y: 250,
    width: 240,
    height: 140,
    text: '💡 Paint Tips:\n• Pick Pencil or Brush upar se\n• Choose color & size right on top\n• Click & drag anywhere to paint!\n• Share code to draw together live!',
    bgColor: '#fff3bf',
  },
]

/**
 * Hook for persisting board data with localStorage backup and optional Supabase sync.
 *
 * @param {string} roomId
 */
export function useBoardStorage(roomId) {
  const supabase = createClient()
  const [boardTitle, setBoardTitle] = useState('Untitled Board')
  const [initialLoaded, setInitialLoaded] = useState(false)
  const [saveStatus, setSaveStatus] = useState('saved')
  const [roomPassword, setRoomPasswordState] = useState(() => {
    if (typeof window !== 'undefined' && roomId) {
      return localStorage.getItem(`syncboard_pwd_${roomId.trim().toUpperCase()}`) || ''
    }
    return ''
  })
  const [roomAccessMode, setRoomAccessModeState] = useState(() => {
    if (typeof window !== 'undefined' && roomId) {
      return localStorage.getItem(`syncboard_access_${roomId.trim().toUpperCase()}`) || 'protected'
    }
    return 'protected'
  })
  const saveTimeoutRef = useRef(null)
  const isPostgresReadyRef = useRef(false)

  const setRoomPassword = useCallback((pwd) => {
    const cleanRoom = (roomId || 'DEFAULT').trim().toUpperCase()
    setRoomPasswordState(pwd || '')
    if (typeof window !== 'undefined') {
      if (pwd) {
        localStorage.setItem(`syncboard_pwd_${cleanRoom}`, pwd)
      } else {
        localStorage.removeItem(`syncboard_pwd_${cleanRoom}`)
      }
    }
  }, [roomId])

  const setRoomAccessMode = useCallback((mode) => {
    const cleanRoom = (roomId || 'DEFAULT').trim().toUpperCase()
    const validMode = mode === 'open' ? 'open' : 'protected'
    setRoomAccessModeState(validMode)
    if (typeof window !== 'undefined') {
      localStorage.setItem(`syncboard_access_${cleanRoom}`, validMode)
    }
  }, [roomId])

  // 1. Load initial board elements from cache or database
  const loadBoard = useCallback(async () => {
    if (!roomId) return STARTER_BOARD_ELEMENTS

    const cleanRoom = roomId.trim().toUpperCase()
    const localKey = `syncboard_room_${cleanRoom}`
    const isHost = typeof window !== 'undefined' && localStorage.getItem(`syncboard_host_${cleanRoom}`) === 'true'

    // If host and no saved board, show starter template; if guest/joining, start clean waiting for peer sync
    let fallbackElements = isHost ? STARTER_BOARD_ELEMENTS : []

    try {
      const cached = localStorage.getItem(localKey)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed.elements && Array.isArray(parsed.elements) && parsed.elements.length > 0) {
          fallbackElements = parsed.elements
        }
        if (parsed.title) {
          setBoardTitle(parsed.title)
        }
      }
    } catch (_) {}

    // Check optional Supabase with quick timeout so it never blocks or hangs
    if (supabase) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2000)

        const { data, error } = await supabase
          .from('syncboard_rooms')
          .select('*')
          .eq('id', cleanRoom)
          .abortSignal(controller.signal)
          .maybeSingle()

        clearTimeout(timeoutId)

        if (!error && data) {
          isPostgresReadyRef.current = true
          if (data.title) setBoardTitle(data.title)
          if (Array.isArray(data.elements) && data.elements.length > 0) {
            setInitialLoaded(true)
            return data.elements
          }
        } else if (!error && !data && isHost) {
          isPostgresReadyRef.current = true
          supabase.from('syncboard_rooms').insert({
            id: cleanRoom,
            title: 'Untitled Board',
            elements: fallbackElements,
          }).then(() => {})
        }
      } catch (_) {
        isPostgresReadyRef.current = false
      }
    }

    setInitialLoaded(true)
    return fallbackElements
  }, [roomId, supabase])

  // 2. Debounced save to localStorage and optional Supabase
  const saveBoard = useCallback(
    (elements, title = boardTitle) => {
      setSaveStatus('saving')
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)

      saveTimeoutRef.current = setTimeout(async () => {
        const cleanRoom = (roomId || 'DEFAULT').trim().toUpperCase()

        // 1. Save to local storage
        try {
          localStorage.setItem(
            `syncboard_room_${cleanRoom}`,
            JSON.stringify({ id: cleanRoom, title, elements, updatedAt: Date.now() })
          )
        } catch (_) {}

        // 2. Save to Supabase if available
        if (supabase && isPostgresReadyRef.current) {
          try {
            await supabase.from('syncboard_rooms').upsert({
              id: cleanRoom,
              title,
              elements,
              updated_at: new Date().toISOString(),
            })
          } catch (_) {}
        }

        setSaveStatus('saved')
      }, 700)
    },
    [roomId, boardTitle, supabase]
  )

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  return {
    boardTitle,
    setBoardTitle,
    initialLoaded,
    saveStatus,
    loadBoard,
    saveBoard,
    roomPassword,
    setRoomPassword,
    roomAccessMode,
    setRoomAccessMode,
  }
}
