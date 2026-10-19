'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Map as MapIcon,
  Minus,
  Plus,
} from 'lucide-react'
import { getElementBounds } from '@/features/board/hitTest'
import { clamp } from '@/lib/utils'
import { MIN_ZOOM, MAX_ZOOM } from '@/features/board/elements'

const MAP_WIDTH = 208
const MAP_HEIGHT = 132

/**
 * Modern, Figma-style Minimalist MiniMap & Canvas Radar.
 * Provides high-altitude canvas overview, click-to-teleport, drag-to-pan,
 * collaborator presence, and one-click Zoom-to-Fit.
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
  const [isHoveringCamera, setIsHoveringCamera] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const canvasRef = useRef(null)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, startPanX: 0, startPanY: 0, scale: 1 })
  const boundsRef = useRef({
    minX: 0,
    minY: 0,
    width: 1000,
    height: 1000,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    camX: 0,
    camY: 0,
    camW: 50,
    camH: 30,
  })

  // Listen to window resize
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

  const handleToggleOpen = () => {
    setIsOpen((prev) => {
      const next = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem('syncboard_minimap_open', String(next))
      }
      return next
    })
  }

  // Calculate bounding box that encloses elements and camera frustum
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

    const spanX = Math.max(maxX - minX, 500)
    const spanY = Math.max(maxY - minY, 350)
    const padX = spanX * 0.1
    const padY = spanY * 0.1

    const finalMinX = minX - padX
    const finalMinY = minY - padY
    const finalWidth = (maxX - minX) + padX * 2
    const finalHeight = (maxY - minY) + padY * 2

    const scale = Math.min(MAP_WIDTH / finalWidth, MAP_HEIGHT / finalHeight)
    const contentW = finalWidth * scale
    const contentH = finalHeight * scale
    const offsetX = (MAP_WIDTH - contentW) / 2
    const offsetY = (MAP_HEIGHT - contentH) / 2

    const camX = offsetX + (camLeft - finalMinX) * scale
    const camY = offsetY + (camTop - finalMinY) * scale
    const camW = Math.max((viewW / viewport.zoom) * scale, 12)
    const camH = Math.max((viewH / viewport.zoom) * scale, 8)

    const bounds = {
      minX: finalMinX,
      minY: finalMinY,
      width: finalWidth,
      height: finalHeight,
      scale,
      offsetX,
      offsetY,
      camX,
      camY,
      camW,
      camH,
    }
    boundsRef.current = bounds
    return bounds
  }, [elements, viewport, windowDim])

  // Canvas drawing
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
    const { minX, minY, scale, offsetX, offsetY, camX, camY, camW, camH } = bounds

    // 1. Clean Canvas Paper Background
    ctx.fillStyle = '#f8fafc' // Slate-50
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT)

    // Subtle micro dot-grid
    ctx.fillStyle = '#cbd5e1' // Slate-300
    const dotSpacing = 16
    for (let x = 8; x < MAP_WIDTH; x += dotSpacing) {
      for (let y = 8; y < MAP_HEIGHT; y += dotSpacing) {
        ctx.beginPath()
        ctx.arc(x, y, 0.75, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // 2. Render Elements with Smooth Rounded Shapes
    for (const el of elements) {
      const b = getElementBounds(el)
      if (!b) continue

      const mx = offsetX + (b.x - minX) * scale
      const my = offsetY + (b.y - minY) * scale
      const mw = Math.max(b.width * scale, 2)
      const mh = Math.max(b.height * scale, 2)

      // Sticky Notes
      if (el.type === 'sticky') {
        ctx.fillStyle = el.bgColor || '#fef08a'
        if (ctx.roundRect) {
          ctx.beginPath()
          ctx.roundRect(mx, my, mw, mh, 2)
          ctx.fill()
        } else {
          ctx.fillRect(mx, my, mw, mh)
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.1)'
        ctx.lineWidth = 0.5
        ctx.stroke()
        continue
      }

      // Text Box
      if (el.type === 'text') {
        ctx.fillStyle = '#94a3b8'
        if (ctx.roundRect) {
          ctx.beginPath()
          ctx.roundRect(mx, my, mw, Math.max(mh, 2.5), 1.5)
          ctx.fill()
        } else {
          ctx.fillRect(mx, my, mw, Math.max(mh, 2.5))
        }
        continue
      }

      // Miniature Stamp / Sticker
      if (el.type === 'stamp') {
        ctx.fillStyle = '#f59e0b'
        ctx.beginPath()
        ctx.arc(mx + mw / 2, my + mh / 2, Math.max(mw / 2, 2.5), 0, Math.PI * 2)
        ctx.fill()
        continue
      }

      // Pencil / Brush strokes
      if ((el.type === 'pen' || el.type === 'brush') && el.points && el.points.length > 1) {
        ctx.beginPath()
        ctx.strokeStyle = el.color || '#334155'
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

      // Shapes (rectangles, diamonds, triangles, circles, stars)
      const strokeColor = el.color || '#0284c7'
      const hasFill = el.fillColor && el.fillColor !== 'transparent'
      const fillColor = hasFill ? el.fillColor : 'rgba(2, 132, 199, 0.15)'

      ctx.fillStyle = fillColor
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = Math.max((el.strokeWidth || 2) * scale, 0.75)

      if (el.type === 'circle') {
        ctx.beginPath()
        const cx = mx + mw / 2
        const cy = my + mh / 2
        ctx.ellipse(cx, cy, Math.max(mw / 2, 1), Math.max(mh / 2, 1), 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      } else {
        if (ctx.roundRect && mw > 4 && mh > 4) {
          ctx.beginPath()
          ctx.roundRect(mx, my, mw, mh, 2)
          ctx.fill()
          ctx.stroke()
        } else {
          ctx.fillRect(mx, my, mw, mh)
          ctx.strokeRect(mx, my, mw, mh)
        }
      }
    }

    // 3. Render Camera Viewport (Figma-Style Glass Frustum)
    // Subtle backdrop shadow
    ctx.shadowColor = 'rgba(25, 113, 194, 0.2)'
    ctx.shadowBlur = 6
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 1

    // Translucent soft blue glass fill
    ctx.fillStyle = 'rgba(25, 113, 194, 0.08)'
    if (ctx.roundRect) {
      ctx.beginPath()
      ctx.roundRect(camX, camY, camW, camH, 3)
      ctx.fill()
    } else {
      ctx.fillRect(camX, camY, camW, camH)
    }

    // Clean brand blue border
    ctx.shadowColor = 'transparent'
    ctx.strokeStyle = '#1971c2'
    ctx.lineWidth = 1.5
    if (ctx.roundRect) {
      ctx.beginPath()
      ctx.roundRect(camX, camY, camW, camH, 3)
      ctx.stroke()
    } else {
      ctx.strokeRect(camX, camY, camW, camH)
    }

    // 4. Collaborator Presence Dots
    const activeCursors = Object.entries(remoteCursors || {})
    for (const [userId, cur] of activeCursors) {
      if (cur.x === undefined || cur.y === undefined) continue
      const rx = offsetX + (cur.x - minX) * scale
      const ry = offsetY + (cur.y - minY) * scale

      // Soft halo
      ctx.beginPath()
      ctx.arc(rx, ry, 5, 0, Math.PI * 2)
      ctx.fillStyle = `${cur.color || '#10b981'}33`
      ctx.fill()

      // Avatar circle with crisp white outline
      ctx.beginPath()
      ctx.arc(rx, ry, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = cur.color || '#10b981'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 0.75
      ctx.stroke()
    }
  }, [elements, viewport, windowDim, remoteCursors, isOpen, calculateBounds])

  // Pointer Down: Click to teleport or start dragging camera
  const handlePointerDown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.setPointerCapture(e.pointerId)
    isDraggingRef.current = true
    setIsDragging(true)

    const rect = canvas.getBoundingClientRect()
    const clickMiniX = e.clientX - rect.left
    const clickMiniY = e.clientY - rect.top

    const { minX, minY, scale, offsetX, offsetY, camX, camY, camW, camH } = boundsRef.current

    // Check if clicked inside camera box
    const isInsideCamera =
      clickMiniX >= camX &&
      clickMiniX <= camX + camW &&
      clickMiniY >= camY &&
      clickMiniY <= camY + camH

    if (!isInsideCamera) {
      // Teleport camera center to clicked position
      const targetWorldX = minX + (clickMiniX - offsetX) / scale
      const targetWorldY = minY + (clickMiniY - offsetY) / scale

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

  // Pointer Move: Drag camera frustum
  const handlePointerMove = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Update cursor hover state
    const rect = canvas.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const { camX, camY, camW, camH } = boundsRef.current
    const inside = px >= camX && px <= camX + camW && py >= camY && py <= camY + camH
    setIsHoveringCamera(inside)

    if (!isDraggingRef.current) return
    e.preventDefault()
    e.stopPropagation()

    const { mouseX, mouseY, startPanX, startPanY, scale } = dragStartRef.current
    const dx = e.clientX - mouseX
    const dy = e.clientY - mouseY

    const worldDeltaX = dx / scale
    const worldDeltaY = dy / scale

    const newPanX = startPanX - worldDeltaX * viewport.zoom
    const newPanY = startPanY - worldDeltaY * viewport.zoom

    onViewportChange({ ...viewport, panX: newPanX, panY: newPanY })
  }

  const handlePointerUp = (e) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false
      setIsDragging(false)
      try {
        canvasRef.current?.releasePointerCapture(e.pointerId)
      } catch (_) {}
    }
  }

  // Zoom to Fit Content
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

    const availW = Math.max(windowDim.width - 200, 200)
    const availH = Math.max(windowDim.height - 200, 200)

    const fitZoom = clamp(Math.min(availW / contentW, availH / contentH), MIN_ZOOM, 1.5)
    const newPanX = windowDim.width / 2 - centerX * fitZoom
    const newPanY = windowDim.height / 2 - centerY * fitZoom

    onViewportChange({ panX: newPanX, panY: newPanY, zoom: fitZoom })
  }, [elements, windowDim, onViewportChange])

  // Zoom In / Out
  const handleZoomDelta = (factor) => {
    const centerScreenX = windowDim.width / 2
    const centerScreenY = windowDim.height / 2
    const oldZoom = viewport.zoom
    const newZoom = clamp(oldZoom * factor, MIN_ZOOM, MAX_ZOOM)
    const worldX = (centerScreenX - viewport.panX) / oldZoom
    const worldY = (centerScreenY - viewport.panY) / oldZoom
    onViewportChange({
      panX: centerScreenX - worldX * newZoom,
      panY: centerScreenY - worldY * newZoom,
      zoom: newZoom,
    })
  }

  // Reset to 100%
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

  // Minimized Compact Pill
  if (!isOpen) {
    return (
      <div className="fixed bottom-5 right-20 z-30 select-none animate-in fade-in duration-150">
        <button
          onClick={handleToggleOpen}
          className="h-9 px-3 rounded-xl bg-white/95 backdrop-blur-md text-[#495057] hover:text-[#1971c2] shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:shadow-md border border-[#e2e8f0] flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer group"
          title="Show Canvas Map (M)"
        >
          <MapIcon className="w-3.5 h-3.5 text-[#1971c2] group-hover:scale-110 transition-transform" />
          <span className="font-mono text-[11px] text-[#212529]">
            {Math.round(viewport.zoom * 100)}%
          </span>
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-5 right-20 z-30 select-none animate-in fade-in zoom-in-95 duration-150 group">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-[#e2e8f0] shadow-[0_12px_36px_-6px_rgba(0,0,0,0.14)] overflow-hidden w-[208px]">
        {/* Canvas Preview */}
        <div className="relative w-[208px] h-[132px] overflow-hidden bg-[#f8fafc]">
          <canvas
            ref={canvasRef}
            style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className={`w-full h-full block touch-none ${
              isDragging ? 'cursor-grabbing' : isHoveringCamera ? 'cursor-grab' : 'cursor-crosshair'
            }`}
          />

          {/* Minimal Floating Minimize Button (top-right) */}
          <button
            onClick={handleToggleOpen}
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md bg-white/80 hover:bg-white text-[#868e96] hover:text-[#212529] shadow-xs flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100"
            title="Minimize Map (M)"
          >
            <Minus className="w-3 h-3" />
          </button>
        </div>

        {/* Minimal Bottom Controls Pill */}
        <div className="px-2 py-1.5 border-t border-[#f1f3f5] bg-white flex items-center justify-between text-xs text-[#495057]">
          {/* Zoom Percentage (click to 100%) */}
          <button
            onClick={handleResetZoom}
            className="px-1.5 py-0.5 rounded-md font-mono text-[11px] font-bold text-[#495057] hover:text-[#1971c2] hover:bg-[#f1f3f5] transition-colors cursor-pointer"
            title="Reset to 100%"
          >
            {Math.round(viewport.zoom * 100)}%
          </button>

          {/* Zoom Buttons & Fit */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleZoomDelta(1 / 1.25)}
              className="w-5 h-5 rounded-md hover:bg-[#f1f3f5] flex items-center justify-center text-[#495057] hover:text-[#212529] transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleZoomDelta(1.25)}
              className="w-5 h-5 rounded-md hover:bg-[#f1f3f5] flex items-center justify-center text-[#495057] hover:text-[#212529] transition-colors cursor-pointer"
              title="Zoom In"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={handleZoomToFit}
              className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold text-[#1971c2] hover:bg-[#e7f5ff] flex items-center gap-1 transition-colors cursor-pointer"
              title="Fit all elements to screen"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Fit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
