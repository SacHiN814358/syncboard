'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { generateId } from '@/lib/utils'

const DEFAULT_BOARD_ELEMENTS = [
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
    text: '💡 Paint Tips:\n• Pick Pencil or Brush upar se\n• Choose color & size right on top\n• Click & drag anywhere to paint!\n• Share link to draw together live!',
    bgColor: '#fff3bf',
  },
]

/**
 * Hook for persisting board data to Supabase with localStorage backup.
 *
 * @param {string} roomId
 */
export function useBoardStorage(roomId) {
  const supabase = createClient()
  const [boardTitle, setBoardTitle] = useState('Untitled Board')
  const [initialLoaded, setInitialLoaded] = useState(false)
  const [saveStatus, setSaveStatus] = useState('saved') // 'saved' | 'saving' | 'offline'
  const saveTimeoutRef = useRef(null)
  const isPostgresReadyRef = useRef(false)

  // 1. Load initial board elements from Supabase or localStorage
  const loadBoard = useCallback(async () => {
    if (!roomId) return DEFAULT_BOARD_ELEMENTS

    // Check localStorage first for instant paint
    const localKey = `syncboard_room_${roomId}`
    let fallbackElements = DEFAULT_BOARD_ELEMENTS
    try {
      const cached = localStorage.getItem(localKey)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed.elements && parsed.elements.length > 0) {
          fallbackElements = parsed.elements
        }
        if (parsed.title) {
          setBoardTitle(parsed.title)
        }
      }
    } catch (_) {}

    if (!supabase) {
      setInitialLoaded(true)
      return fallbackElements
    }

    try {
      const { data, error } = await supabase
        .from('syncboard_rooms')
        .select('*')
        .eq('id', roomId)
        .maybeSingle()

      if (!error && data) {
        isPostgresReadyRef.current = true
        if (data.title) setBoardTitle(data.title)
        if (Array.isArray(data.elements) && data.elements.length > 0) {
          setInitialLoaded(true)
          return data.elements
        }
      } else if (!error && !data) {
        // Room doesn't exist yet: insert starter room
        isPostgresReadyRef.current = true
        await supabase.from('syncboard_rooms').insert({
          id: roomId,
          title: 'Untitled Board',
          elements: fallbackElements,
        })
      }
    } catch (_) {
      isPostgresReadyRef.current = false
    }

    setInitialLoaded(true)
    return fallbackElements
  }, [roomId, supabase])

  // 2. Debounced save to Supabase and localStorage
  const saveBoard = useCallback(
    (elements, title = boardTitle) => {
      setSaveStatus('saving')
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)

      saveTimeoutRef.current = setTimeout(async () => {
        // Save to localStorage immediately
        try {
          localStorage.setItem(
            `syncboard_room_${roomId}`,
            JSON.stringify({ id: roomId, title, elements, updatedAt: Date.now() })
          )
        } catch (_) {}

        if (supabase && isPostgresReadyRef.current) {
          try {
            const { error } = await supabase.from('syncboard_rooms').upsert({
              id: roomId,
              title,
              elements,
              updated_at: new Date().toISOString(),
            })

            if (!error) {
              setSaveStatus('saved')
              return
            }
          } catch (_) {}
        }

        // If Supabase table isn't created yet or network offline, state is 'local'
        setSaveStatus('saved')
      }, 900)
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
  }
}
