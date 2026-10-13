'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { generateId } from '@/lib/utils'
import {
  screenToWorld,
  worldToScreen,
  zoomAtPoint,
  applyViewportTransform,
  resetTransform,
} from './viewport'
import {
  drawGrid,
  drawElement,
  drawSelectionBox,
} from './renderer'
import { findElementAtPoint, getElementBounds } from './hitTest'

/**
 * High-performance HTML5 2D Canvas with requestAnimationFrame rendering.
 *
 * @param {{
 *   elements: import('./elements').CanvasElement[],
 *   onElementsChange: (elements: import('./elements').CanvasElement[]) => void,
 *   activeTool: import('./elements').ToolType,
 *   onSelectTool: (tool: import('./elements').ToolType) => void,
 *   currentColor: string,
 *   currentStrokeWidth: number,
 *   currentFillColor: string,
 *   currentStickyColor: string,
 *   currentFontSize: number,
 *   selectedElement: import('./elements').CanvasElement | null,
 *   onSelectElement: (el: import('./elements').CanvasElement | null) => void,
 *   viewport: { panX: number, panY: number, zoom: number },
 *   onViewportChange: (viewport: { panX: number, panY: number, zoom: number }) => void,
 *   onCursorMove?: (worldX: number, worldY: number) => void,
 *   onDrawPreview?: (element: any) => void,
 *   remotePreviewElement?: any,
 * }} props
 */
export default function Canvas({
  elements,
  onElementsChange,
  activeTool,
  onSelectTool,
  currentColor,
  currentStrokeWidth,
  currentFillColor,
  currentStickyColor,
  currentFontSize,
  selectedElement,
  onSelectElement,
  viewport,
  onViewportChange,
  onCursorMove,
  onDrawPreview,
  remotePreviews,
}) {
  const canvasRef = useRef(null)

  // Interaction State (Mutable to prevent React re-render lag during 60 FPS drawing)
  const isInteractingRef = useRef(false)
  const interactionModeRef = useRef('none') // 'draw' | 'pan' | 'drag-element' | 'erase'
  const pointerStartRef = useRef({ x: 0, y: 0, worldX: 0, worldY: 0 })
  const lastPanPosRef = useRef({ x: 0, y: 0 })
  const transientElementRef = useRef(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const isSpacePressedRef = useRef(false)

  // Inline text editing state
  const [editingText, setEditingText] = useState(null) // { id, x, y, text, type }
  const textInputRef = useRef(null)

  // Needs repaint flag for requestAnimationFrame
  const needsRepaintRef = useRef(true)

  // 1. requestAnimationFrame Render Loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animationFrameId

    const render = () => {
      if (needsRepaintRef.current) {
        needsRepaintRef.current = false

        const dpr = window.devicePixelRatio || 1
        const width = canvas.clientWidth
        const height = canvas.clientHeight

        // Resize buffer if needed
        if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
          canvas.width = width * dpr
          canvas.height = height * dpr
        }

        // Clear canvas
        ctx.save()
        resetTransform(ctx, dpr)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)

        // Apply viewport transform with DPR (Ensures 100% 1:1 pixel accuracy under mouse pointer!)
        applyViewportTransform(ctx, viewport, dpr)

        // Draw Dot Grid in world space
        drawGrid(ctx, width, height, viewport)

        // Draw all committed elements
        for (const el of elements) {
          drawElement(ctx, el)
        }

        // Draw transient (in-progress) element for local user
        if (transientElementRef.current) {
          drawElement(ctx, transientElementRef.current)
        }

        // Draw remote collaborators' transient previews (multi-user live painting!)
        if (remotePreviews) {
          for (const preview of Object.values(remotePreviews)) {
            if (preview) drawElement(ctx, preview)
          }
        }

        // Draw selection box & handles
        if (selectedElement) {
          const bounds = getElementBounds(selectedElement)
          if (bounds) {
            drawSelectionBox(ctx, bounds)
          }
        }

        ctx.restore()
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [elements, viewport, selectedElement, remotePreviews])

  // Trigger repaint whenever elements, viewport, or selection changes
  useEffect(() => {
    needsRepaintRef.current = true
  }, [elements, viewport, selectedElement, remotePreviews])

  // 2. Window Resize Handler
  useEffect(() => {
    const handleResize = () => {
      needsRepaintRef.current = true
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 3. Spacebar Pan Modifier
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        isSpacePressedRef.current = true
        if (canvasRef.current) canvasRef.current.style.cursor = 'grab'
      }
    }
    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false
        if (canvasRef.current) {
          canvasRef.current.style.cursor = activeTool === 'pan' ? 'grab' : 'crosshair'
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [activeTool])

  // 4. Mouse Wheel Zoom (Centered on cursor)
  const handleWheel = useCallback(
    (e) => {
      e.preventDefault()
      const rect = canvasRef.current.getBoundingClientRect()
      const cursorX = e.clientX - rect.left
      const cursorY = e.clientY - rect.top

      // Trackpad pinch or mouse wheel
      const delta = -e.deltaY * 0.0015
      const newViewport = zoomAtPoint(viewport, delta, cursorX, cursorY)
      onViewportChange(newViewport)
      needsRepaintRef.current = true
    },
    [viewport, onViewportChange]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // 5. Pointer Down
  const handlePointerDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const world = screenToWorld(screenX, screenY, viewport)

    pointerStartRef.current = { x: screenX, y: screenY, worldX: world.x, worldY: world.y }
    isInteractingRef.current = true

    // Check if space is held or middle click -> Pan
    if (isSpacePressedRef.current || e.button === 1 || activeTool === 'pan') {
      interactionModeRef.current = 'pan'
      lastPanPosRef.current = { x: e.clientX, y: e.clientY }
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing'
      return
    }

    // Select Tool: check hit test
    if (activeTool === 'select') {
      const hit = findElementAtPoint(world.x, world.y, elements, 10 / viewport.zoom)
      if (hit) {
        onSelectElement(hit)
        interactionModeRef.current = 'drag-element'
        dragOffsetRef.current = {
          x: world.x - (hit.x || hit.x1 || 0),
          y: world.y - (hit.y || hit.y1 || 0),
        }
      } else {
        onSelectElement(null)
        interactionModeRef.current = 'none'
      }
      needsRepaintRef.current = true
      return
    }

    // Eraser Tool
    if (activeTool === 'eraser') {
      interactionModeRef.current = 'erase'
      eraseAtPoint(world.x, world.y)
      return
    }

    // Text Tool: Click to place text
    if (activeTool === 'text') {
      setEditingText({
        id: generateId(),
        x: world.x,
        y: world.y,
        text: '',
        type: 'text',
      })
      isInteractingRef.current = false
      return
    }

    // Sticky Note Tool: Click to place note
    if (activeTool === 'sticky') {
      const newSticky = {
        id: generateId(),
        type: 'sticky',
        x: world.x - 100,
        y: world.y - 70,
        width: 200,
        height: 140,
        text: '',
        bgColor: currentStickyColor,
      }
      onElementsChange([...elements, newSticky])
      onSelectElement(newSticky)
      setEditingText({
        id: newSticky.id,
        x: newSticky.x,
        y: newSticky.y,
        text: '',
        type: 'sticky',
      })
      isInteractingRef.current = false
      onSelectTool('select')
      return
    }

    // Drawing Tools: Pen, Shapes
    interactionModeRef.current = 'draw'

    if (activeTool === 'pen' || activeTool === 'brush') {
      transientElementRef.current = {
        id: generateId(),
        type: activeTool,
        points: [{ x: world.x, y: world.y }],
        color: currentColor,
        strokeWidth: activeTool === 'brush' ? Math.max(6, currentStrokeWidth * 2) : currentStrokeWidth,
      }
    } else if (['rectangle', 'diamond', 'triangle', 'star', 'heart', 'hexagon', 'cloud'].includes(activeTool)) {
      transientElementRef.current = {
        id: generateId(),
        type: activeTool,
        x: world.x,
        y: world.y,
        width: 0,
        height: 0,
        color: currentColor,
        strokeWidth: currentStrokeWidth,
        fillColor: currentFillColor,
      }
    } else if (activeTool === 'circle') {
      transientElementRef.current = {
        id: generateId(),
        type: 'circle',
        x: world.x,
        y: world.y,
        radiusX: 0,
        radiusY: 0,
        color: currentColor,
        strokeWidth: currentStrokeWidth,
        fillColor: currentFillColor,
      }
    } else if (['line', 'arrow', 'double-arrow'].includes(activeTool)) {
      transientElementRef.current = {
        id: generateId(),
        type: activeTool,
        x1: world.x,
        y1: world.y,
        x2: world.x,
        y2: world.y,
        color: currentColor,
        strokeWidth: currentStrokeWidth,
      }
    }

    needsRepaintRef.current = true
  }

  // 6. Pointer Move
  const handlePointerMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const world = screenToWorld(screenX, screenY, viewport)

    // Broadcast cursor position for remote peers
    onCursorMove?.(world.x, world.y)

    if (!isInteractingRef.current) return

    // Pan Mode
    if (interactionModeRef.current === 'pan') {
      const dx = e.clientX - lastPanPosRef.current.x
      const dy = e.clientY - lastPanPosRef.current.y
      lastPanPosRef.current = { x: e.clientX, y: e.clientY }

      onViewportChange({
        ...viewport,
        panX: viewport.panX + dx,
        panY: viewport.panY + dy,
      })
      needsRepaintRef.current = true
      return
    }

    // Drag Selected Element Mode
    if (interactionModeRef.current === 'drag-element' && selectedElement) {
      const targetWorldX = world.x - dragOffsetRef.current.x
      const targetWorldY = world.y - dragOffsetRef.current.y

      const updated = elements.map((el) => {
        if (el.id !== selectedElement.id) return el

        if (el.type === 'pen') {
          const dx = world.x - pointerStartRef.current.worldX
          const dy = world.y - pointerStartRef.current.worldY
          pointerStartRef.current.worldX = world.x
          pointerStartRef.current.worldY = world.y
          return {
            ...el,
            points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
          }
        } else if (el.type === 'line' || el.type === 'arrow' || el.type === 'double-arrow') {
          const dx = world.x - pointerStartRef.current.worldX
          const dy = world.y - pointerStartRef.current.worldY
          pointerStartRef.current.worldX = world.x
          pointerStartRef.current.worldY = world.y
          return {
            ...el,
            x1: el.x1 + dx,
            y1: el.y1 + dy,
            x2: el.x2 + dx,
            y2: el.y2 + dy,
          }
        } else {
          return { ...el, x: targetWorldX, y: targetWorldY }
        }
      })

      onElementsChange(updated)
      onSelectElement(updated.find((el) => el.id === selectedElement.id) || null)
      needsRepaintRef.current = true
      return
    }

    // Eraser Mode: continuous erase on drag
    if (interactionModeRef.current === 'erase') {
      eraseAtPoint(world.x, world.y)
      return
    }

    // Draw Mode
    if (interactionModeRef.current === 'draw' && transientElementRef.current) {
      const current = transientElementRef.current
      const startW = pointerStartRef.current

      if (current.type === 'pen' || current.type === 'brush') {
        current.points.push({ x: world.x, y: world.y })
      } else if (['rectangle', 'diamond', 'triangle', 'star', 'heart', 'hexagon', 'cloud'].includes(current.type)) {
        current.x = Math.min(startW.worldX, world.x)
        current.y = Math.min(startW.worldY, world.y)
        current.width = Math.abs(world.x - startW.worldX)
        current.height = Math.abs(world.y - startW.worldY)
      } else if (current.type === 'circle') {
        current.x = (startW.worldX + world.x) / 2
        current.y = (startW.worldY + world.y) / 2
        current.radiusX = Math.abs(world.x - startW.worldX) / 2
        current.radiusY = Math.abs(world.y - startW.worldY) / 2
      } else if (['line', 'arrow', 'double-arrow'].includes(current.type)) {
        current.x2 = world.x
        current.y2 = world.y
      }

      // Broadcast transient drawing preview to collaborators
      onDrawPreview?.(current)
      needsRepaintRef.current = true
    }
  }

  // 7. Pointer Up
  const handlePointerUp = () => {
    if (!isInteractingRef.current) return
    isInteractingRef.current = false

    if (canvasRef.current) {
      canvasRef.current.style.cursor =
        isSpacePressedRef.current || activeTool === 'pan' ? 'grab' : 'crosshair'
    }

    // Commit transient element
    if (interactionModeRef.current === 'draw' && transientElementRef.current) {
      const el = transientElementRef.current
      transientElementRef.current = null
      onDrawPreview?.(null) // clear transient preview

      // Filter out accidental clicks (0 width/height)
      let isValid = true
      if (['rectangle', 'diamond', 'triangle', 'star', 'heart', 'hexagon', 'cloud'].includes(el.type) && el.width < 3 && el.height < 3) isValid = false
      if (el.type === 'circle' && el.radiusX < 2 && el.radiusY < 2) isValid = false
      if ((el.type === 'pen' || el.type === 'brush') && el.points.length < 2) isValid = false

      if (isValid) {
        onElementsChange([...elements, el])
        onSelectElement(el)
      }
    }

    interactionModeRef.current = 'none'
    needsRepaintRef.current = true
  }

  // Erase helper
  const eraseAtPoint = (wx, wy) => {
    const hit = findElementAtPoint(wx, wy, elements, 12 / viewport.zoom)
    if (hit) {
      const filtered = elements.filter((el) => el.id !== hit.id)
      onElementsChange(filtered)
      if (selectedElement?.id === hit.id) onSelectElement(null)
      needsRepaintRef.current = true
    }
  }

  // 8. Double Click to edit existing Text or Sticky Note
  const handleDoubleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const world = screenToWorld(screenX, screenY, viewport)

    const hit = findElementAtPoint(world.x, world.y, elements, 8 / viewport.zoom)
    if (hit && (hit.type === 'text' || hit.type === 'sticky')) {
      setEditingText({
        id: hit.id,
        x: hit.x,
        y: hit.y,
        text: hit.text || '',
        type: hit.type,
      })
    }
  }

  // 9. Commit inline text edit
  const commitTextEdit = () => {
    if (!editingText) return
    const textVal = textInputRef.current?.value || ''

    if (editingText.type === 'text') {
      if (textVal.trim()) {
        const existing = elements.find((el) => el.id === editingText.id)
        if (existing) {
          onElementsChange(
            elements.map((el) => (el.id === editingText.id ? { ...el, text: textVal } : el))
          )
        } else {
          onElementsChange([
            ...elements,
            {
              id: editingText.id,
              type: 'text',
              x: editingText.x,
              y: editingText.y,
              text: textVal,
              color: currentColor,
              fontSize: currentFontSize,
            },
          ])
        }
      } else {
        // Remove empty text
        onElementsChange(elements.filter((el) => el.id !== editingText.id))
      }
    } else if (editingText.type === 'sticky') {
      onElementsChange(
        elements.map((el) => (el.id === editingText.id ? { ...el, text: textVal } : el))
      )
    }

    setEditingText(null)
    needsRepaintRef.current = true
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-white select-none">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        className="w-full h-full block touch-none"
        style={{
          cursor: activeTool === 'pan' ? 'grab' : activeTool === 'select' ? 'default' : 'crosshair',
        }}
      />

      {/* Inline Textarea Overlay for Text & Sticky Notes */}
      {editingText && (
        <div
          className="absolute z-30"
          style={{
            left: `${worldToScreen(editingText.x, editingText.y, viewport).x}px`,
            top: `${worldToScreen(editingText.x, editingText.y, viewport).y}px`,
            transform: `scale(${viewport.zoom})`,
            transformOrigin: 'top left',
          }}
        >
          {editingText.type === 'text' ? (
            <textarea
              ref={textInputRef}
              autoFocus
              defaultValue={editingText.text}
              onBlur={commitTextEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  commitTextEdit()
                }
                if (e.key === 'Escape') setEditingText(null)
              }}
              className="p-1 min-w-[120px] bg-transparent text-[#1e1e1e] border border-[#1971c2] rounded outline-none resize-none overflow-hidden font-sans"
              style={{ fontSize: `${currentFontSize}px`, color: currentColor }}
              rows={Math.max(1, (editingText.text || '').split('\n').length)}
              placeholder="Type something..."
            />
          ) : (
            <textarea
              ref={textInputRef}
              autoFocus
              defaultValue={editingText.text}
              onBlur={commitTextEdit}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setEditingText(null)
              }}
              className="p-3 w-[200px] h-[140px] bg-transparent text-[#1e1e1e] border-none outline-none resize-none font-sans text-sm rounded"
              placeholder="Write a note..."
            />
          )}
        </div>
      )}
    </div>
  )
}
