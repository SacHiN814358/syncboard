'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Compass,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Crosshair,
  ChevronDown,
  ChevronUp,
  X,
  Radio,
  Users,
} from 'lucide-react'
import { getElementBounds } from '@/features/board/hitTest'
import { clamp } from '@/lib/utils'
import { MIN_ZOOM, MAX_ZOOM } from '@/features/board/elements'

const MAP_WIDTH = 220
const MAP_HEIGHT = 140

/**
 * Interactive MiniMap & Collaborator Radar for SyncBoard.
 * Provides high-altitude canvas overview, click-to-teleport, drag-to-pan,
 * collaborator radar blips, and one-click Zoom-to-Fit.
 *
 * @param {{
 *   elements: any[],
 *   viewport: { panX: number, panY: number, zoom: number },
 *   onViewportChange: (newViewport: { panX: number, panY: number, zoom: number }) => void,
 *   remoteCursors?: Record<string, { x: number, y: number, name: string, color: string }>,
 *   collaborators?: any[],
 * }} props
 */
export default function MiniMap({
  elements = [],
  viewport,
  onViewportChange,
  remoteCursors = {},
  collaborators = [],
}) {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('syncboard_minimap_open')
      return saved !== null ? saved === 'true' : true
    }
    return true
  })

  const [windowDim, setWindowDim] = useState({ width: 1200, height: 800 })
  const canvasRef = useRef(null)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, startPanX: 0, startPanY: 0, scale: 1 })
  const boundsRef = useRef({ minX: 0, minY: 0, width: 1000, height: 1000, scale: 1, offsetX: 0, offsetY: 0 })

  // Listen to window resize to maintain exact camera viewport proportions
  useEffect(() => {
    const updateDim = () => {
      setWindowDim({ width: window.innerWidth, height: window.innerHeight })
    }
    updateDim()
    window.addEventListener('resize', updateDim)
    return () => window.removeEventListener('resize', updateDim)
  }, [])

  // Toggle minimap with 'M' hotkey
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA'
      ) {
        return
      }
      if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        setIsOpen((prev) => {
          const next = !prev
          if (typeof window !== 'undefined') {
            localStorage.setItem('syncboard_minimap_open', String(next))
          }
          return next
        })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Toggle open/close state and persist
  const handleToggleOpen = () => {
    setIsOpen((prev) => {
      const next = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem('syncboard_minimap_open', String(next))
      }
      return next
    })
  }

  // Calculate bounding box that encloses all elements and current camera frustum
  const calculateBounds = useCallback(() => {
    const viewW = windowDim.width
    const viewH = windowDim.height
    const camLeft = -viewport.panX / viewport.zoom
    const camTop = -viewport.panY / viewport.zoom
    const camRight = (viewW - viewport.panX) / viewport.zoom
    const camBottom = (viewH - viewport.panY) / viewport.zoom

    let minX = camLeft
    let minY = camTop
    let maxX = camRight
    let maxY = camBottom

    for (const el of elements) {
      const b = getElementBounds(el)
      if (!b) continue
      if (b.x < minX) minX = b.x
      if (b.y < minY) minY = b.y
      if (b.x + b.width > maxX) maxX = b.x + b.width
      if (b.y + b.height > maxY) maxY = b.y + b.height
    }

    // Generous padding around the content (at least 200 world units)
    const spanX = Math.max(maxX - minX, 600)
    const spanY = Math.max(maxY - minY, 400)
    const padX = spanX * 0.12
    const padY = spanY * 0.12

    const finalMinX = minX - padX
    const finalMinY = minY - padY
    const finalWidth = (maxX - minX) + padX * 2
    const finalHeight = (maxY - minY) + padY * 2

    const scale = Math.min(MAP_WIDTH / finalWidth, MAP_HEIGHT / finalHeight)
    const contentW = finalWidth * scale
    const contentH = finalHeight * scale
    const offsetX = (MAP_WIDTH - contentW) / 2
    const offsetY = (MAP_HEIGHT - contentH) / 2

    const bounds = {
      minX: finalMinX,
      minY: finalMinY,
      width: finalWidth,
      height: finalHeight,
      scale,
      offsetX,
      offsetY,
      camLeft,
      camTop,
      camRight,
      camBottom,
    }
    boundsRef.current = bounds
    return bounds
  }, [elements, viewport, windowDim])

  // Render the miniature radar canvas
  useEffect(() => {
    if (!isOpen) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = MAP_WIDTH * dpr
    canvas.height = MAP_HEIGHT * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const bounds = calculateBounds()
    const { minX, minY, scale, offsetX, offsetY } = bounds

    // 1. Sleek Radar Blueprint Background
    ctx.fillStyle = '#0f172a' // Dark Navy
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT)

    // Subtle radar grid pattern
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)'
    ctx.lineWidth = 0.5
    const gridSize = 22
    for (let x = 0; x <= MAP_WIDTH; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, MAP_HEIGHT)
      ctx.stroke()
    }
    for (let y = 0; y <= MAP_HEIGHT; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(MAP_WIDTH, y)
      ctx.stroke()
    }

    // 2. Render Miniature Elements
    for (const el of elements) {
      const b = getElementBounds(el)
      if (!b) continue

      const mx = offsetX + (b.x - minX) * scale
      const my = offsetY + (b.y - minY) * scale
      const mw = Math.max(b.width * scale, 2)
      const mh = Math.max(b.height * scale, 2)

      // Miniature Sticky Note
      if (el.type === 'sticky') {
        ctx.fillStyle = el.bgColor || '#fef08a'
        ctx.fillRect(mx, my, mw, mh)
        ctx.strokeStyle = 'rgba(0,0,0,0.2)'
        ctx.lineWidth = 0.5
        ctx.strokeRect(mx, my, mw, mh)
        continue
      }

      // Miniature Text Box
      if (el.type === 'text') {
        ctx.fillStyle = el.color || '#94a3b8'
        ctx.fillRect(mx, my, mw, Math.max(mh, 3))
        continue
      }

      // Miniature Pencil / Brush stroke
      if ((el.type === 'pen' || el.type === 'brush') && el.points && el.points.length > 1) {
        ctx.beginPath()
        ctx.strokeStyle = el.color || '#38bdf8'
        ctx.lineWidth = Math.max((el.strokeWidth || 2) * scale, 1)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        const first = el.points[0]
        ctx.moveTo(offsetX + (first.x - minX) * scale, offsetY + (first.y - minY) * scale)
        for (let i = 1; i < el.points.length; i++) {
          const pt = el.points[i]
          ctx.lineTo(offsetX + (pt.x - minX) * scale, offsetY + (pt.y - minY) * scale)
        }
        ctx.stroke()
        continue
      }

      // Miniature Shapes (rectangles, circles, diamonds, triangles, stars, etc.)
      const strokeColor = el.color || '#38bdf8'
      const fillColor = el.fillColor && el.fillColor !== 'transparent' ? el.fillColor : 'rgba(56, 189, 248, 0.25)'

      ctx.fillStyle = fillColor
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = Math.max((el.strokeWidth || 2) * scale, 0.8)

      if (el.type === 'circle') {
        ctx.beginPath()
        const cx = mx + mw / 2
        const cy = my + mh / 2
        const rx = mw / 2
        const ry = mh / 2
        ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      } else {
        // Box shapes / connectors / lines
        ctx.fillRect(mx, my, mw, mh)
        ctx.strokeRect(mx, my, mw, mh)
      }
    }

    // 3. Render Active Camera Frustum (Viewport Box)
    const camX = offsetX + (bounds.camLeft - minX) * scale
    const camY = offsetY + (bounds.camTop - minY) * scale
    const camW = (windowDim.width / viewport.zoom) * scale
    const camH = (windowDim.height / viewport.zoom) * scale

    // Viewport glow & fill
    ctx.fillStyle = 'rgba(59, 130, 246, 0.16)'
    ctx.fillRect(camX, camY, camW, camH)

    // Viewport border
    ctx.strokeStyle = '#60a5fa' // Bright Blue
    ctx.lineWidth = 1.5
    ctx.strokeRect(camX, camY, camW, camH)

    // Camera Corner brackets for tactile feel
    const cornerSize = Math.min(Math.max(camW * 0.15, 4), 8)
    ctx.strokeStyle = '#93c5fd'
    ctx.lineWidth = 2
    // Top-left
    ctx.beginPath()
    ctx.moveTo(camX, camY + cornerSize)
    ctx.lineTo(camX, camY)
    ctx.lineTo(camX + cornerSize, camY)
    ctx.stroke()
    // Top-right
    ctx.beginPath()
    ctx.moveTo(camX + camW - cornerSize, camY)
    ctx.lineTo(camX + camW, camY)
    ctx.lineTo(camX + camW, camY + cornerSize)
    ctx.stroke()
    // Bottom-left
    ctx.beginPath()
    ctx.moveTo(camX, camY + camH - cornerSize)
    ctx.lineTo(camX, camY + camH)
    ctx.lineTo(camX + cornerSize, camY + camH)
    ctx.stroke()
    // Bottom-right
    ctx.beginPath()
    ctx.moveTo(camX + camW - cornerSize, camY + camH)
    ctx.lineTo(camX + camW, camY + camH)
    ctx.lineTo(camX + camW, camY + camH - cornerSize)
    ctx.stroke()

    // 4. Render Collaborator Radar Blips
    const activeCursors = Object.entries(remoteCursors || {})
    for (const [userId, cur] of activeCursors) {
      if (cur.x === undefined || cur.y === undefined) continue
      const rx = offsetX + (cur.x - minX) * scale
      const ry = offsetY + (cur.y - minY) * scale

      // Radar pulse ring
      ctx.beginPath()
      ctx.arc(rx, ry, 6, 0, Math.PI * 2)
      ctx.fillStyle = `${cur.color || '#10b981'}44`
      ctx.fill()

      // Radar solid center
      ctx.beginPath()
      ctx.arc(rx, ry, 3, 0, Math.PI * 2)
      ctx.fillStyle = cur.color || '#10b981'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 0.8
      ctx.stroke()
    }
  }, [elements, viewport, windowDim, remoteCursors, isOpen, calculateBounds])

  // MiniMap Pointer Down: Teleport or initiate live drag
  const handlePointerDown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.setPointerCapture(e.pointerId)
    isDraggingRef.current = true

    const rect = canvas.getBoundingClientRect()
    const clickMiniX = e.clientX - rect.left
    const clickMiniY = e.clientY - rect.top

    const { minX, minY, scale, offsetX, offsetY, camLeft, camTop } = boundsRef.current

    // World coordinate under pointer
    const targetWorldX = minX + (clickMiniX - offsetX) / scale
    const targetWorldY = minY + (clickMiniY - offsetY) / scale

    // Check if clicked inside existing camera box: if yes, start drag; if no, teleport center first
    const camMiniX = offsetX + (camLeft - minX) * scale
    const camMiniY = offsetY + (camTop - minY) * scale
    const camW = (windowDim.width / viewport.zoom) * scale
    const camH = (windowDim.height / viewport.zoom) * scale

    const isInsideCamera =
      clickMiniX >= camMiniX &&
      clickMiniX <= camMiniX + camW &&
      clickMiniY >= camMiniY &&
      clickMiniY <= camMiniY + camH

    if (!isInsideCamera) {
      // Teleport camera so center of screen is at target world coordinate
      const newPanX = windowDim.width / 2 - targetWorldX * viewport.zoom
      const newPanY = windowDim.height / 2 - targetWorldY * viewport.zoom
      onViewportChange({ ...viewport, panX: newPanX, panY: newPanY })

      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        startPanX: newPanX,
        startPanY: newPanY,
        scale,
      }
    } else {
      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        startPanX: viewport.panX,
        startPanY: viewport.panY,
        scale,
      }
    }
  }

  // MiniMap Pointer Move: Real-time Camera Frustum Dragging
  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return
    e.preventDefault()
    e.stopPropagation()

    const { mouseX, mouseY, startPanX, startPanY, scale } = dragStartRef.current
    const dx = e.clientX - mouseX
    const dy = e.clientY - mouseY

    // Convert pixel delta on minimap into world units delta
    const worldDeltaX = dx / scale
    const worldDeltaY = dy / scale

    // In screen-space, moving camera right pans canvas left
    const newPanX = startPanX - worldDeltaX * viewport.zoom
    const newPanY = startPanY - worldDeltaY * viewport.zoom

    onViewportChange({ ...viewport, panX: newPanX, panY: newPanY })
  }

  const handlePointerUp = (e) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false
      try {
        canvasRef.current?.releasePointerCapture(e.pointerId)
      } catch (_) {}
    }
  }

  // Fit all elements into view (Zoom to Fit)
  const handleZoomToFit = useCallback(() => {
    if (!elements || elements.length === 0) {
      onViewportChange({ panX: 0, panY: 0, zoom: 1 })
      return
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const el of elements) {
      const b = getElementBounds(el)
      if (!b) continue
      if (b.x < minX) minX = b.x
      if (b.y < minY) minY = b.y
      if (b.x + b.width > maxX) maxX = b.x + b.width
      if (b.y + b.height > maxY) maxY = b.y + b.height
    }

    if (minX === Infinity) {
      onViewportChange({ panX: 0, panY: 0, zoom: 1 })
      return
    }

    const contentW = Math.max(maxX - minX, 100)
    const contentH = Math.max(maxY - minY, 100)
    const centerX = minX + contentW / 2
    const centerY = minY + contentH / 2

    // Screen padding (120px)
    const availW = Math.max(windowDim.width - 240, 200)
    const availH = Math.max(windowDim.height - 240, 200)

    const fitZoom = clamp(Math.min(availW / contentW, availH / contentH), MIN_ZOOM, 1.5)
    const newPanX = windowDim.width / 2 - centerX * fitZoom
    const newPanY = windowDim.height / 2 - centerY * fitZoom

    onViewportChange({ panX: newPanX, panY: newPanY, zoom: fitZoom })
  }, [elements, windowDim, onViewportChange])

  // Zoom In step
  const handleZoomIn = () => {
    const centerScreenX = windowDim.width / 2
    const centerScreenY = windowDim.height / 2
    const oldZoom = viewport.zoom
    const newZoom = clamp(oldZoom * 1.25, MIN_ZOOM, MAX_ZOOM)
    const worldX = (centerScreenX - viewport.panX) / oldZoom
    const worldY = (centerScreenY - viewport.panY) / oldZoom
    onViewportChange({
      panX: centerScreenX - worldX * newZoom,
      panY: centerScreenY - worldY * newZoom,
      zoom: newZoom,
    })
  }

  // Zoom Out step
  const handleZoomOut = () => {
    const centerScreenX = windowDim.width / 2
    const centerScreenY = windowDim.height / 2
    const oldZoom = viewport.zoom
    const newZoom = clamp(oldZoom / 1.25, MIN_ZOOM, MAX_ZOOM)
    const worldX = (centerScreenX - viewport.panX) / oldZoom
    const worldY = (centerScreenY - viewport.panY) / oldZoom
    onViewportChange({
      panX: centerScreenX - worldX * newZoom,
      panY: centerScreenY - worldY * newZoom,
      zoom: newZoom,
    })
  }

  // Reset Zoom to 100%
  const handleResetZoom = () => {
    const centerScreenX = windowDim.width / 2
    const centerScreenY = windowDim.height / 2
    const oldZoom = viewport.zoom
    const newZoom = 1.0
    const worldX = (centerScreenX - viewport.panX) / oldZoom
    const worldY = (centerScreenY - viewport.panY) / oldZoom
    onViewportChange({
      panX: centerScreenX - worldX * newZoom,
      panY: centerScreenY - worldY * newZoom,
      zoom: newZoom,
    })
  }

  const activeCollaboratorCount = Object.keys(remoteCursors || {}).length

  // Minimized Trigger Pill
  if (!isOpen) {
    return (
      <div className="fixed bottom-5 right-20 z-30 select-none animate-in fade-in duration-150">
        <button
          onClick={handleToggleOpen}
          className="h-10 px-3 rounded-full bg-white/95 backdrop-blur-md text-[#495057] hover:text-[#1971c2] shadow-lg hover:shadow-xl border border-[#dee2e6] hover:border-[#1971c2]/40 flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer group"
          title="Open MiniMap & Radar (Hotkey: M)"
        >
          <div className="relative flex items-center justify-center">
            <Compass className="w-4 h-4 text-[#1971c2] group-hover:rotate-45 transition-transform duration-300" />
            {activeCollaboratorCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
          </div>
          <span className="font-mono text-[11px] text-[#212529] font-bold">
            {Math.round(viewport.zoom * 100)}%
          </span>
          <span className="text-[10px] text-[#868e96] bg-[#f1f3f5] px-1.5 py-0.5 rounded-md font-mono hidden sm:inline">
            M
          </span>
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-5 right-20 z-30 select-none animate-in slide-in-from-bottom-2 fade-in duration-150">
      <div className="bg-[#0f172a]/95 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.5)] overflow-hidden w-[220px]">
        {/* Header Bar */}
        <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span className="font-bold text-[11px] tracking-wide text-white uppercase">
              Radar Map
            </span>
            {activeCollaboratorCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.2 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {activeCollaboratorCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
              {Math.round(viewport.zoom * 100)}%
            </span>
            <button
              onClick={handleToggleOpen}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Minimize MiniMap (Hotkey: M)"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* MiniMap Canvas View */}
        <div className="relative w-[220px] h-[140px] bg-[#0f172a] cursor-crosshair overflow-hidden group">
          <canvas
            ref={canvasRef}
            style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="w-full h-full block touch-none"
          />

          {/* Helper hint on hover */}
          <div className="absolute top-1 left-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity text-[9px] text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded font-mono">
            Click / Drag to Pan
          </div>
        </div>

        {/* Quick View Controls Bar */}
        <div className="px-2 py-1.5 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between gap-1 text-slate-400">
          {/* Zoom In / Out */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleZoomOut}
              className="p-1 rounded hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Zoom Out (Ctrl -)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 rounded hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Reset Zoom to 100%"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1 rounded hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Zoom In (Ctrl +)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Fit all elements to view */}
          <button
            onClick={handleZoomToFit}
            className="px-2 py-1 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 border border-sky-500/20 text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
            title="Fit all shapes & drawings to screen"
          >
            <Crosshair className="w-3 h-3" />
            <span>Fit All</span>
          </button>
        </div>
      </div>
    </div>
  )
}
