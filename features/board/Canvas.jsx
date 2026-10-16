'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { generateId, processImageFile } from '@/lib/utils'
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
  drawHoverBox,
  drawMagneticAnchors,
  isDarkColor,
} from './renderer'
import {
  findElementAtPoint,
  getElementBounds,
  hitTestElement,
  getResizeHandleAtPoint,
  getCursorForHandle,
  getElementAnchors,
  getAnchorCoordinates,
  findNearestAnchor,
  getElbowPoints,
} from './hitTest'
import { BOX_SHAPES, LINE_SHAPES } from './elements'
import { performFloodFill } from './floodFill'
import { Plus, Magnet } from 'lucide-react'

const BUCKET_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23212529' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z'/%3E%3Cpath d='m5 2 5 5'/%3E%3Cpath d='M2 13h15'/%3E%3Cpath d='M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z' fill='%231971c2'/%3E%3C/svg%3E") 4 20, crosshair`

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
  onDeleteElement,
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
  const interactionModeRef = useRef('none') // 'draw' | 'pan' | 'drag-element' | 'resize-element' | 'erase'
  const pointerStartRef = useRef({ x: 0, y: 0, worldX: 0, worldY: 0 })
  const lastPanPosRef = useRef({ x: 0, y: 0 })
  const transientElementRef = useRef(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const resizeHandleRef = useRef(null)
  const resizeStartRef = useRef(null)
  const lastClickTimeRef = useRef(0)
  const lastClickedElementIdRef = useRef(null)
  const isSpacePressedRef = useRef(false)

  // Inline text editing state
  const [editingText, setEditingText] = useState(null) // { id, x, y, text, type }
  const textInputRef = useRef(null)

  // Smart Grid Snapping for Miro/Excalidraw Flowcharts & Diagrams
  const [gridSnap, setGridSnap] = useState(true)
  const gridSnapRef = useRef(true)
  useEffect(() => {
    gridSnapRef.current = gridSnap
  }, [gridSnap])
  const snapToGrid = (val, size = 20) => Math.round(val / size) * size

  // Needs repaint flag for requestAnimationFrame
  const needsRepaintRef = useRef(true)
  const lastPointerWorldPosRef = useRef({ x: 0, y: 0 })
  const activeSnapAnchorRef = useRef(null) // { elementId, anchor, x, y }
  const visibleAnchorsRef = useRef([]) // Array of anchor coordinates for visible snap points
  const hoveredBucketElementRef = useRef(null)

  // Synchronized prop refs for zero-teardown 60 FPS rendering
  const elementsRef = useRef(elements)
  const remotePreviewsRef = useRef(remotePreviews)
  const viewportRef = useRef(viewport)
  const selectedElementRef = useRef(selectedElement)
  const lastPreviewTimeRef = useRef(0)
  const dragUpdatedElementsRef = useRef(null)

  useEffect(() => {
    elementsRef.current = elements
    needsRepaintRef.current = true
  }, [elements])

  useEffect(() => {
    remotePreviewsRef.current = remotePreviews
    needsRepaintRef.current = true
  }, [remotePreviews])

  useEffect(() => {
    viewportRef.current = viewport
    needsRepaintRef.current = true
  }, [viewport])

  useEffect(() => {
    selectedElementRef.current = selectedElement
    needsRepaintRef.current = true
  }, [selectedElement])

  // Process & insert image onto board
  const handleProcessAndInsertImage = useCallback(
    async (file, targetWorldX, targetWorldY) => {
      try {
        const { src, width, height, aspectRatio } = await processImageFile(file, 1200)

        const maxDisplayW = 420
        let displayW = width
        let displayH = height
        if (displayW > maxDisplayW) {
          displayH = Math.round((displayH * maxDisplayW) / displayW)
          displayW = maxDisplayW
        }

        const fallbackX =
          (-viewport.panX + (typeof window !== 'undefined' ? window.innerWidth : 1200) / 2) /
            viewport.zoom -
          displayW / 2
        const fallbackY =
          (-viewport.panY + (typeof window !== 'undefined' ? window.innerHeight : 800) / 2) /
            viewport.zoom -
          displayH / 2

        const wx = targetWorldX != null ? targetWorldX - displayW / 2 : fallbackX
        const wy = targetWorldY != null ? targetWorldY - displayH / 2 : fallbackY

        const newImage = {
          id: generateId(),
          type: 'image',
          x: Math.round(wx),
          y: Math.round(wy),
          width: displayW,
          height: displayH,
          src,
          aspectRatio,
        }

        const latest = elementsRef.current || elements || []
        const updated = [...latest, newImage]
        elementsRef.current = updated
        onElementsChange(updated)
        onSelectElement(newImage)
        onSelectTool?.('select')
        needsRepaintRef.current = true
      } catch (err) {
        console.error('Error inserting image:', err)
      }
    },
    [elements, viewport, onElementsChange, onSelectElement, onSelectTool]
  )

  // 1. Stable, non-tearing 60 FPS Render Loop
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

        const currentVp = viewportRef.current || { panX: 0, panY: 0, zoom: 1 }

        // Apply viewport transform with DPR (Ensures 100% 1:1 pixel accuracy under mouse pointer!)
        applyViewportTransform(ctx, currentVp, dpr)

        // Draw Dot Grid in world space
        drawGrid(ctx, width, height, currentVp)

        // Draw all committed elements
        const currentElements = dragUpdatedElementsRef.current || elementsRef.current || []
        for (const el of currentElements) {
          drawElement(ctx, el)
        }

        // Draw transient (in-progress) element for local user
        if (transientElementRef.current) {
          drawElement(ctx, transientElementRef.current)
        }

        // Draw remote collaborators' transient previews (multi-user live painting!)
        if (remotePreviewsRef.current) {
          for (const preview of Object.values(remotePreviewsRef.current)) {
            if (preview) drawElement(ctx, preview)
          }
        }

        // Draw selection box & handles
        if (selectedElementRef.current) {
          const bounds = getElementBounds(selectedElementRef.current)
          if (bounds) {
            drawSelectionBox(ctx, bounds)
          }
        }

        // Draw magnetic connection anchors when drawing lines/arrows
        if (visibleAnchorsRef.current.length > 0 || activeSnapAnchorRef.current) {
          drawMagneticAnchors(ctx, visibleAnchorsRef.current, activeSnapAnchorRef.current)
        }

        // Draw bucket hover highlight
        if (activeTool === 'bucket' && hoveredBucketElementRef.current) {
          const bounds = getElementBounds(hoveredBucketElementRef.current)
          if (bounds) {
            drawHoverBox(ctx, bounds, '#1971c2')
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
  }, [])

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

  // Clipboard Paste Handler (Ctrl+V Image Paste onto Canvas)
  useEffect(() => {
    const handlePaste = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return
      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) {
            handleProcessAndInsertImage(
              file,
              lastPointerWorldPosRef.current.x,
              lastPointerWorldPosRef.current.y
            )
          }
          break
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [handleProcessAndInsertImage])

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
    dragUpdatedElementsRef.current = null

    // If switching to drawing or non-select tool, deselect previous element so handles don't interfere
    if (activeTool !== 'select' && selectedElement) {
      onSelectElement(null)
    }

    // Check if space is held or middle click -> Pan
    if (isSpacePressedRef.current || e.button === 1 || activeTool === 'pan') {
      interactionModeRef.current = 'pan'
      lastPanPosRef.current = { x: e.clientX, y: e.clientY }
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing'
      return
    }

    // 1. Check if clicking on a resize handle of the currently selected element (Select Tool ONLY)
    if (activeTool === 'select' && selectedElement) {
      const bounds = getElementBounds(selectedElement)
      if (bounds) {
        const handle = getResizeHandleAtPoint(world.x, world.y, bounds, 14 / viewport.zoom)
        if (handle) {
          interactionModeRef.current = 'resize-element'
          resizeHandleRef.current = handle
          resizeStartRef.current = {
            handle,
            startWorldX: world.x,
            startWorldY: world.y,
            initialElement: { ...selectedElement },
            initialBounds: { ...bounds },
          }
          if (canvasRef.current) canvasRef.current.style.cursor = getCursorForHandle(handle)
          needsRepaintRef.current = true
          return
        }
      }
    }

    // 2. Double-Click detection on any element across ALL tools (Double-click any shape to fill it!)
    const now = Date.now()
    const currentList = elementsRef.current || elements || []
    const hitUnderPointer = findElementAtPoint(world.x, world.y, currentList, 14 / viewport.zoom)
    const isDouble =
      now - lastClickTimeRef.current < 450 &&
      hitUnderPointer &&
      hitUnderPointer.id === lastClickedElementIdRef.current

    lastClickTimeRef.current = now
    lastClickedElementIdRef.current = hitUnderPointer ? hitUnderPointer.id : null

    if (isDouble && hitUnderPointer) {
      isInteractingRef.current = false
      interactionModeRef.current = 'none'
      dragUpdatedElementsRef.current = null
      transientElementRef.current = null

      if (hitUnderPointer.type === 'text' || hitUnderPointer.type === 'sticky') {
        onSelectElement(hitUnderPointer)
        onSelectTool?.('select')
        setEditingText({
          id: hitUnderPointer.id,
          x: hitUnderPointer.x,
          y: hitUnderPointer.y,
          width: hitUnderPointer.width,
          height: hitUnderPointer.height,
          text: hitUnderPointer.text || '',
          type: hitUnderPointer.type,
        })
        needsRepaintRef.current = true
        return
      }

      // Any shape or stroke: Double-click fills with active color!
      const fillToApply = currentFillColor && currentFillColor !== 'transparent' ? currentFillColor : (currentColor || '#1971c2')
      const updated = currentList.map((el) => {
        if (el.id !== hitUnderPointer.id) return el
        if (LINE_SHAPES.includes(el.type)) {
          return { ...el, color: fillToApply }
        }
        return { ...el, fillColor: fillToApply }
      })
      elementsRef.current = updated
      onElementsChange(updated)
      const filledEl = updated.find((el) => el.id === hitUnderPointer.id)
      onSelectElement(filledEl || null)
      toast.success('Filled with color! 🎨', { id: 'fill-toast', duration: 1200 })
      needsRepaintRef.current = true
      return
    }

    // 3. If element is already selected and user clicks directly on it (Select Tool ONLY)
    if (activeTool === 'select' && selectedElement && hitUnderPointer && hitUnderPointer.id === selectedElement.id) {
      interactionModeRef.current = 'drag-element'
      dragOffsetRef.current = {
        x: world.x - (selectedElement.x ?? selectedElement.x1 ?? 0),
        y: world.y - (selectedElement.y ?? selectedElement.y1 ?? 0),
      }
      if (canvasRef.current) canvasRef.current.style.cursor = 'move'
      needsRepaintRef.current = true
      return
    }

    // 4. Select Tool: check hit test
    if (activeTool === 'select') {
      if (hitUnderPointer) {
        onSelectElement(hitUnderPointer)
        interactionModeRef.current = 'drag-element'
        dragOffsetRef.current = {
          x: world.x - (hitUnderPointer.x ?? hitUnderPointer.x1 ?? 0),
          y: world.y - (hitUnderPointer.y ?? hitUnderPointer.y1 ?? 0),
        }
        if (canvasRef.current) canvasRef.current.style.cursor = 'move'
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
      const latest = elementsRef.current || elements || []
      const updated = [...latest, newSticky]
      elementsRef.current = updated
      onElementsChange(updated)
      onSelectElement(newSticky)
      setEditingText({
        id: newSticky.id,
        x: newSticky.x,
        y: newSticky.y,
        width: newSticky.width,
        height: newSticky.height,
        text: '',
        type: 'sticky',
      })
      isInteractingRef.current = false
      onSelectTool('select')
      return
    }

    // Paint Bucket Tool: Fill clicked shape or freehand closed region
    if (activeTool === 'bucket') {
      const currentListForBucket = elementsRef.current || elements || []
      const hit = findElementAtPoint(world.x, world.y, currentListForBucket, 14 / viewport.zoom)

      const fillToApply =
        currentFillColor !== undefined && currentFillColor !== null
          ? currentFillColor
          : currentColor || '#1971c2'

      if (hit) {
        // If hit is an existing flood fill image and user clicked "No Fill" (transparent), remove it
        if (hit.isFloodFill && fillToApply === 'transparent') {
          const updated = currentListForBucket.filter((el) => el.id !== hit.id)
          elementsRef.current = updated
          onElementsChange(updated)
          if (selectedElement && selectedElement.id === hit.id) {
            onSelectElement(null)
          }
          toast.success('Removed fill! 🎨', { id: 'fill-toast', duration: 1200 })
          needsRepaintRef.current = true
          isInteractingRef.current = false
          return
        }

        // Native vector shape or closed stroke fill
        const updated = currentListForBucket.map((el) => {
          if (el.id !== hit.id) return el
          if (LINE_SHAPES.includes(el.type)) {
            return { ...el, color: fillToApply }
          }
          return { ...el, fillColor: fillToApply }
        })
        elementsRef.current = updated
        onElementsChange(updated)
        const filledEl = updated.find((el) => el.id === hit.id)
        onSelectElement(filledEl || null)
        toast.success('Filled with color! 🎨', { id: 'fill-toast', duration: 1200 })
        needsRepaintRef.current = true
      } else {
        // No native shape was hit -> Run MS Paint Flood Fill on freehand drawings / closed regions!
        const result = performFloodFill({
          worldX: world.x,
          worldY: world.y,
          elements: currentListForBucket,
          fillColor: fillToApply,
        })

        if (result.success && result.element) {
          // Find the earliest overlapping pen/line element to insert underneath stroke outlines
          const newEl = result.element
          const bNew = { x: newEl.x, y: newEl.y, width: newEl.width, height: newEl.height }
          let insertIdx = currentListForBucket.length

          for (let i = 0; i < currentListForBucket.length; i++) {
            const item = currentListForBucket[i]
            if (item.type === 'pen' || item.type === 'brush' || LINE_SHAPES.includes(item.type)) {
              const bItem = getElementBounds(item)
              if (
                bItem &&
                bItem.x < bNew.x + bNew.width &&
                bItem.x + bItem.width > bNew.x &&
                bItem.y < bNew.y + bNew.height &&
                bItem.y + bItem.height > bNew.y
              ) {
                insertIdx = i
                break
              }
            }
          }

          const updated = [...currentListForBucket]
          updated.splice(insertIdx, 0, newEl)
          elementsRef.current = updated
          onElementsChange(updated)
          onSelectElement(newEl)
          toast.success('Freehand region filled! 🎨', { id: 'fill-toast', duration: 1200 })
          needsRepaintRef.current = true
        } else if (result.reason === 'unbounded') {
          toast.error(
            result.message || 'Region is not closed! Please close any gaps in your drawing 🎨',
            {
              id: 'fill-toast',
              duration: 2500,
            }
          )
        } else if (result.reason === 'already_filled') {
          toast(result.message || 'Region is already filled with this color', {
            id: 'fill-toast',
            duration: 1200,
          })
        }
      }

      isInteractingRef.current = false
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
    } else if (BOX_SHAPES.includes(activeTool)) {
      const startX = gridSnapRef.current ? snapToGrid(world.x) : world.x
      const startY = gridSnapRef.current ? snapToGrid(world.y) : world.y
      transientElementRef.current = {
        id: generateId(),
        type: activeTool,
        x: startX,
        y: startY,
        width: 0,
        height: 0,
        color: currentColor,
        strokeWidth: currentStrokeWidth,
        fillColor: currentFillColor,
      }
    } else if (activeTool === 'circle') {
      const startX = gridSnapRef.current ? snapToGrid(world.x) : world.x
      const startY = gridSnapRef.current ? snapToGrid(world.y) : world.y
      transientElementRef.current = {
        id: generateId(),
        type: 'circle',
        x: startX,
        y: startY,
        radiusX: 0,
        radiusY: 0,
        color: currentColor,
        strokeWidth: currentStrokeWidth,
        fillColor: currentFillColor,
      }
    } else if (LINE_SHAPES.includes(activeTool)) {
      const snap = findNearestAnchor(world.x, world.y, elements, null, 26 / viewport.zoom)
      const startX = snap ? snap.x : world.x
      const startY = snap ? snap.y : world.y

      transientElementRef.current = {
        id: generateId(),
        type: activeTool,
        x1: startX,
        y1: startY,
        x2: startX,
        y2: startY,
        color: currentColor,
        strokeWidth: currentStrokeWidth,
        startBinding: snap ? { elementId: snap.elementId, anchor: snap.anchor } : null,
      }
      activeSnapAnchorRef.current = snap
      const snapEl = snap ? elements.find((el) => el.id === snap.elementId) : null
      visibleAnchorsRef.current = snapEl ? getElementAnchors(snapEl) : []
    }

    needsRepaintRef.current = true
  }

  // 6. Pointer Move
  const handlePointerMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const world = screenToWorld(screenX, screenY, viewport)
    lastPointerWorldPosRef.current = { x: world.x, y: world.y }

    // Broadcast cursor position for remote peers
    onCursorMove?.(world.x, world.y)

    // Hover cursor feedback when not dragging
    if (!isInteractingRef.current) {
      if (selectedElement && canvasRef.current) {
        const bounds = getElementBounds(selectedElement)
        if (bounds) {
          const handle = getResizeHandleAtPoint(world.x, world.y, bounds, 12 / viewport.zoom)
          if (handle) {
            canvasRef.current.style.cursor = getCursorForHandle(handle)
            return
          }
          if (hitTestElement(world.x, world.y, selectedElement, 8 / viewport.zoom)) {
            canvasRef.current.style.cursor = 'move'
            return
          }
        }
      }
      if (canvasRef.current) {
        canvasRef.current.style.cursor =
          isSpacePressedRef.current || activeTool === 'pan'
            ? 'grab'
            : activeTool === 'select'
            ? 'default'
            : activeTool === 'bucket'
            ? BUCKET_CURSOR
            : activeTool === 'text'
            ? 'text'
            : activeTool === 'eraser'
            ? 'cell'
            : 'crosshair'
      }

      // Magnetic connection indicators on hover with line/arrow tool
      if (LINE_SHAPES.includes(activeTool)) {
        const snap = findNearestAnchor(world.x, world.y, elements, null, 28 / viewport.zoom)
        if (snap) {
          activeSnapAnchorRef.current = snap
          const el = elements.find((item) => item.id === snap.elementId)
          visibleAnchorsRef.current = el ? getElementAnchors(el) : []
        } else {
          activeSnapAnchorRef.current = null
          const hoveredEl = findElementAtPoint(world.x, world.y, elements, 24 / viewport.zoom)
          visibleAnchorsRef.current =
            hoveredEl && !LINE_SHAPES.includes(hoveredEl.type) ? getElementAnchors(hoveredEl) : []
        }
        needsRepaintRef.current = true
      } else if (visibleAnchorsRef.current.length > 0 || activeSnapAnchorRef.current) {
        visibleAnchorsRef.current = []
        activeSnapAnchorRef.current = null
        needsRepaintRef.current = true
      }

      // Hover feedback for Paint Bucket Tool
      if (activeTool === 'bucket') {
        const hit = findElementAtPoint(world.x, world.y, elementsRef.current || elements || [], 14 / viewport.zoom)
        if (hit?.id !== hoveredBucketElementRef.current?.id) {
          hoveredBucketElementRef.current = hit
          needsRepaintRef.current = true
        }
      } else if (hoveredBucketElementRef.current) {
        hoveredBucketElementRef.current = null
        needsRepaintRef.current = true
      }

      return
    }

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

    // Resize Selected Element Mode (Grabbing any of the 8 handles)
    if (
      interactionModeRef.current === 'resize-element' &&
      resizeStartRef.current &&
      selectedElement
    ) {
      const { handle, startWorldX, startWorldY, initialElement, initialBounds } =
        resizeStartRef.current
      const dx = world.x - startWorldX
      const dy = world.y - startWorldY

      let newX = initialBounds.x
      let newY = initialBounds.y
      let newW = initialBounds.width
      let newH = initialBounds.height

      if (handle.includes('e')) {
        newW = Math.max(10, initialBounds.width + dx)
      }
      if (handle.includes('s')) {
        newH = Math.max(10, initialBounds.height + dy)
      }
      if (handle.includes('w')) {
        const targetW = initialBounds.width - dx
        if (targetW >= 10) {
          newX = initialBounds.x + dx
          newW = targetW
        }
      }
      if (handle.includes('n')) {
        const targetH = initialBounds.height - dy
        if (targetH >= 10) {
          newY = initialBounds.y + dy
          newH = targetH
        }
      }

      let updatedEl = { ...initialElement }

      if (BOX_SHAPES.includes(initialElement.type) || initialElement.type === 'sticky' || initialElement.type === 'image') {
        let w = newW
        let h = newH
        if (initialElement.type === 'image' && initialElement.aspectRatio) {
          if (['nw', 'ne', 'sw', 'se'].includes(resizeHandleRef.current)) {
            h = Math.round(w / initialElement.aspectRatio)
          }
        }
        updatedEl = {
          ...initialElement,
          x: newX,
          y: newY,
          width: w,
          height: h,
        }
      } else if (initialElement.type === 'circle') {
        updatedEl = {
          ...initialElement,
          x: newX + newW / 2,
          y: newY + newH / 2,
          radiusX: newW / 2,
          radiusY: newH / 2,
        }
      } else if (LINE_SHAPES.includes(initialElement.type)) {
        updatedEl = {
          ...initialElement,
          x1: initialElement.x1 <= initialElement.x2 ? newX : newX + newW,
          y1: initialElement.y1 <= initialElement.y2 ? newY : newY + newH,
          x2: initialElement.x1 <= initialElement.x2 ? newX + newW : newX,
          y2: initialElement.y1 <= initialElement.y2 ? newY + newH : newY,
        }
      } else if (initialElement.type === 'text') {
        updatedEl = {
          ...initialElement,
          x: newX,
          y: newY,
        }
      }

      const updated = elements.map((el) => (el.id === selectedElement.id ? updatedEl : el))

      // Update connected lines & arrows when shape is resized
      for (let i = 0; i < updated.length; i++) {
        const item = updated[i]
        if (LINE_SHAPES.includes(item.type)) {
          let changed = false
          let nextLine = { ...item }

          if (item.startBinding?.elementId === updatedEl.id) {
            const pt = getAnchorCoordinates(updatedEl, item.startBinding.anchor)
            if (pt) {
              nextLine.x1 = pt.x
              nextLine.y1 = pt.y
              changed = true
            }
          }

          if (item.endBinding?.elementId === updatedEl.id) {
            const pt = getAnchorCoordinates(updatedEl, item.endBinding.anchor)
            if (pt) {
              nextLine.x2 = pt.x
              nextLine.y2 = pt.y
              changed = true
            }
          }

          if (changed) {
            updated[i] = nextLine
          }
        }
      }

      dragUpdatedElementsRef.current = updated
      onSelectElement(updatedEl)
      needsRepaintRef.current = true
      return
    }

    // Drag Selected Element Mode
    if (interactionModeRef.current === 'drag-element' && selectedElement) {
      const targetWorldX = world.x - dragOffsetRef.current.x
      const targetWorldY = world.y - dragOffsetRef.current.y

      let movedEl = null

      const currentElements = dragUpdatedElementsRef.current || elementsRef.current || elements
      const updated = currentElements.map((el) => {
        if (el.id !== selectedElement.id) return el

        if (el.type === 'pen') {
          const dx = world.x - pointerStartRef.current.worldX
          const dy = world.y - pointerStartRef.current.worldY
          pointerStartRef.current.worldX = world.x
          pointerStartRef.current.worldY = world.y
          movedEl = {
            ...el,
            points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
          }
          return movedEl
        } else if (LINE_SHAPES.includes(el.type)) {
          const dx = world.x - pointerStartRef.current.worldX
          const dy = world.y - pointerStartRef.current.worldY
          pointerStartRef.current.worldX = world.x
          pointerStartRef.current.worldY = world.y
          movedEl = {
            ...el,
            x1: el.x1 + dx,
            y1: el.y1 + dy,
            x2: el.x2 + dx,
            y2: el.y2 + dy,
          }
          return movedEl
        } else {
          const finalX = gridSnapRef.current ? snapToGrid(targetWorldX) : targetWorldX
          const finalY = gridSnapRef.current ? snapToGrid(targetWorldY) : targetWorldY
          movedEl = { ...el, x: finalX, y: finalY }
          return movedEl
        }
      })

      // Update connected line and arrow bindings when shape moves!
      if (movedEl) {
        for (let i = 0; i < updated.length; i++) {
          const item = updated[i]
          if (LINE_SHAPES.includes(item.type)) {
            let changed = false
            let nextLine = { ...item }

            if (item.startBinding?.elementId === movedEl.id) {
              const pt = getAnchorCoordinates(movedEl, item.startBinding.anchor)
              if (pt) {
                nextLine.x1 = pt.x
                nextLine.y1 = pt.y
                changed = true
              }
            }

            if (item.endBinding?.elementId === movedEl.id) {
              const pt = getAnchorCoordinates(movedEl, item.endBinding.anchor)
              if (pt) {
                nextLine.x2 = pt.x
                nextLine.y2 = pt.y
                changed = true
              }
            }

            if (changed) {
              updated[i] = nextLine
            }
          }
        }
      }

      dragUpdatedElementsRef.current = updated
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
        const roundedX = Math.round(world.x * 10) / 10
        const roundedY = Math.round(world.y * 10) / 10
        const lastPt = current.points[current.points.length - 1]
        if (!lastPt || Math.hypot(roundedX - lastPt.x, roundedY - lastPt.y) >= 1.5) {
          current.points.push({ x: roundedX, y: roundedY })
        }
      } else if (BOX_SHAPES.includes(current.type)) {
        const curX = gridSnapRef.current ? snapToGrid(world.x) : world.x
        const curY = gridSnapRef.current ? snapToGrid(world.y) : world.y
        current.x = Math.min(startW.worldX, curX)
        current.y = Math.min(startW.worldY, curY)
        current.width = Math.abs(curX - startW.worldX)
        current.height = Math.abs(curY - startW.worldY)
      } else if (current.type === 'circle') {
        current.x = (startW.worldX + world.x) / 2
        current.y = (startW.worldY + world.y) / 2
        current.radiusX = Math.abs(world.x - startW.worldX) / 2
        current.radiusY = Math.abs(world.y - startW.worldY) / 2
      } else if (LINE_SHAPES.includes(current.type)) {
        const startElId = current.startBinding?.elementId
        const snap = findNearestAnchor(world.x, world.y, elements, startElId, 26 / viewport.zoom)
        if (snap) {
          current.x2 = snap.x
          current.y2 = snap.y
          current.endBinding = { elementId: snap.elementId, anchor: snap.anchor }
          activeSnapAnchorRef.current = snap
          const targetEl = elements.find((item) => item.id === snap.elementId)
          visibleAnchorsRef.current = targetEl ? getElementAnchors(targetEl) : []
        } else {
          current.x2 = world.x
          current.y2 = world.y
          current.endBinding = null
          activeSnapAnchorRef.current = null
          const startEl = current.startBinding
            ? elements.find((item) => item.id === current.startBinding.elementId)
            : null
          visibleAnchorsRef.current = startEl ? getElementAnchors(startEl) : []
        }
      }

      // Broadcast transient drawing preview to collaborators (smooth 35ms / 30 FPS stream)
      const now = Date.now()
      if (now - lastPreviewTimeRef.current >= 35) {
        lastPreviewTimeRef.current = now
        onDrawPreview?.(current)
      }
      needsRepaintRef.current = true
    }
  }

  // 7. Pointer Up
  const handlePointerUp = (e) => {
    try {
      if (e?.target && e?.pointerId != null) {
        e.target.releasePointerCapture(e.pointerId)
      }
    } catch (_) {}

    if (!isInteractingRef.current) return
    isInteractingRef.current = false

    if (canvasRef.current) {
      canvasRef.current.style.cursor =
        isSpacePressedRef.current || activeTool === 'pan'
          ? 'grab'
          : activeTool === 'select'
          ? 'default'
          : activeTool === 'bucket'
          ? BUCKET_CURSOR
          : 'crosshair'
    }

    // Commit any dragged or resized element changes cleanly ONCE on mouse release
    if (dragUpdatedElementsRef.current) {
      elementsRef.current = dragUpdatedElementsRef.current
      onElementsChange(dragUpdatedElementsRef.current)
      dragUpdatedElementsRef.current = null
    }

    if (interactionModeRef.current === 'resize-element') {
      interactionModeRef.current = 'none'
      resizeHandleRef.current = null
      resizeStartRef.current = null
      needsRepaintRef.current = true
      return
    }

    // Commit transient element
    if (interactionModeRef.current === 'draw' && transientElementRef.current) {
      const el = { ...transientElementRef.current }
      transientElementRef.current = null
      lastPreviewTimeRef.current = 0
      onDrawPreview?.(null) // clear transient preview immediately

      // Filter out accidental clicks (0 width/height)
      let isValid = true
      if (BOX_SHAPES.includes(el.type) && el.width < 3 && el.height < 3) isValid = false
      if (LINE_SHAPES.includes(el.type) && Math.hypot(el.x2 - el.x1, el.y2 - el.y1) < 3) isValid = false
      if (el.type === 'circle' && el.radiusX < 2 && el.radiusY < 2) isValid = false
      if ((el.type === 'pen' || el.type === 'brush') && (!el.points || el.points.length < 2)) isValid = false

      if (isValid) {
        const currentList = elementsRef.current || elements || []
        const updated = currentList.some((item) => item.id === el.id)
          ? currentList.map((item) => (item.id === el.id ? el : item))
          : [...currentList, el]
        elementsRef.current = updated
        onElementsChange(updated)
      }
    }

    interactionModeRef.current = 'none'
    activeSnapAnchorRef.current = null
    visibleAnchorsRef.current = []
    needsRepaintRef.current = true
  }

  // Erase helper (Syncs instant deletion across all connected laptops)
  const eraseAtPoint = (wx, wy) => {
    const current = elementsRef.current || elements || []
    const hit = findElementAtPoint(wx, wy, current, 14 / viewport.zoom)
    if (hit) {
      const filtered = current.filter((el) => el.id !== hit.id)
      elementsRef.current = filtered
      if (onDeleteElement) {
        onDeleteElement(hit.id)
      } else {
        onElementsChange(filtered)
      }
      if (selectedElementRef.current?.id === hit.id) onSelectElement(null)
      needsRepaintRef.current = true
    }
  }

  // 8. Double Click to edit Text/Sticky/Shape/Connector or fill Shape with color
  const handleDoubleClick = (e) => {
    isInteractingRef.current = false
    interactionModeRef.current = 'none'
    dragUpdatedElementsRef.current = null
    transientElementRef.current = null

    const rect = canvasRef.current.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const world = screenToWorld(screenX, screenY, viewport)

    const current = elementsRef.current || elements || []
    const hit = findElementAtPoint(world.x, world.y, current, 14 / viewport.zoom)
    if (hit) {
      onSelectElement(hit)
      onSelectTool?.('select')

      // If bucket tool is explicitly active, fill color
      if (activeTool === 'bucket') {
        const fillToApply =
          currentFillColor && currentFillColor !== 'transparent'
            ? currentFillColor
            : currentColor || '#1971c2'
        const updated = current.map((el) => {
          if (el.id !== hit.id) return el
          if (LINE_SHAPES.includes(el.type)) return { ...el, color: fillToApply }
          return { ...el, fillColor: fillToApply }
        })
        elementsRef.current = updated
        onElementsChange(updated)
        toast.success('Filled with color! 🎨', { id: 'fill-toast', duration: 1200 })
        needsRepaintRef.current = true
        return
      }

      // Miro / Excalidraw: Double-click to edit text inside ANY shape, connector, text, or sticky note
      if (hit.type === 'text') {
        setEditingText({
          id: hit.id,
          x: hit.x,
          y: hit.y,
          text: hit.text || '',
          type: 'text',
          fontSize: hit.fontSize || currentFontSize,
          color: hit.color || currentColor,
        })
      } else if (hit.type === 'sticky') {
        setEditingText({
          id: hit.id,
          x: hit.x,
          y: hit.y,
          width: hit.width,
          height: hit.height,
          text: hit.text || '',
          type: 'sticky',
        })
      } else if (LINE_SHAPES.includes(hit.type)) {
        let midX = (hit.x1 + hit.x2) / 2
        let midY = (hit.y1 + hit.y2) / 2
        if (hit.type === 'elbow-arrow' || hit.type === 'elbow-line') {
          const pts = getElbowPoints(hit)
          midX = (pts[1].x + pts[2].x) / 2
          midY = (pts[1].y + pts[2].y) / 2
        }
        setEditingText({
          id: hit.id,
          x: midX,
          y: midY,
          text: hit.text || '',
          type: 'connector',
          fontSize: hit.fontSize || 13,
          color: hit.color || currentColor,
        })
      } else if (BOX_SHAPES.includes(hit.type) || hit.type === 'circle') {
        const bounds = getElementBounds(hit)
        if (bounds) {
          setEditingText({
            id: hit.id,
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            text: hit.text || '',
            type: 'shape',
            fontSize: hit.fontSize || 14,
            color: hit.textColor || (isDarkColor(hit.fillColor) ? '#ffffff' : hit.color || '#1e293b'),
          })
        }
      }
      needsRepaintRef.current = true
    }
  }

  // 9. Commit inline text edit
  const commitTextEdit = () => {
    if (!editingText) return
    const textVal = textInputRef.current?.value || ''
    const current = elementsRef.current || elements || []

    if (editingText.type === 'text') {
      if (textVal.trim()) {
        const existing = current.find((el) => el.id === editingText.id)
        let updated
        if (existing) {
          updated = current.map((el) => (el.id === editingText.id ? { ...el, text: textVal } : el))
        } else {
          updated = [
            ...current,
            {
              id: generateId(),
              type: 'text',
              x: editingText.x,
              y: editingText.y,
              text: textVal,
              color: currentColor,
              fontSize: currentFontSize,
            },
          ]
        }
        elementsRef.current = updated
        onElementsChange(updated)
      } else {
        // Remove empty text
        const updated = current.filter((el) => el.id !== editingText.id)
        elementsRef.current = updated
        if (onDeleteElement) {
          onDeleteElement(editingText.id)
        } else {
          onElementsChange(updated)
        }
      }
    } else if (editingText.type === 'sticky') {
      const updated = current.map((el) => (el.id === editingText.id ? { ...el, text: textVal } : el))
      elementsRef.current = updated
      onElementsChange(updated)
    } else if (editingText.type === 'shape' || editingText.type === 'connector') {
      const updated = current.map((el) => (el.id === editingText.id ? { ...el, text: textVal } : el))
      elementsRef.current = updated
      onElementsChange(updated)
    }

    setEditingText(null)
    needsRepaintRef.current = true
  }

  // 10. Miro-Style Quick-Add Connected Shape Node
  const handleQuickAdd = (direction) => {
    if (!selectedElement) return
    const current = elementsRef.current || elements || []
    const b = getElementBounds(selectedElement)
    if (!b) return

    const spacing = 120
    let newX = b.x
    let newY = b.y
    let startAnchor = 'right'
    let endAnchor = 'left'

    if (direction === 'right') {
      newX = b.x + b.width + spacing
      newY = b.y
      startAnchor = 'right'
      endAnchor = 'left'
    } else if (direction === 'bottom') {
      newX = b.x
      newY = b.y + b.height + spacing
      startAnchor = 'bottom'
      endAnchor = 'top'
    } else if (direction === 'left') {
      newX = b.x - b.width - spacing
      newY = b.y
      startAnchor = 'left'
      endAnchor = 'right'
    } else if (direction === 'top') {
      newX = b.x
      newY = b.y - b.height - spacing
      startAnchor = 'top'
      endAnchor = 'bottom'
    }

    if (gridSnapRef.current) {
      newX = snapToGrid(newX)
      newY = snapToGrid(newY)
    }

    const newShapeId = generateId()
    let newShape
    if (selectedElement.type === 'circle') {
      newShape = {
        id: newShapeId,
        type: 'circle',
        x: newX + b.width / 2,
        y: newY + b.height / 2,
        radiusX: selectedElement.radiusX || 50,
        radiusY: selectedElement.radiusY || 50,
        color: selectedElement.color || '#212529',
        strokeWidth: selectedElement.strokeWidth || 2,
        fillColor: selectedElement.fillColor || 'transparent',
        text: '',
      }
    } else {
      newShape = {
        id: newShapeId,
        type: selectedElement.type,
        x: newX,
        y: newY,
        width: b.width,
        height: b.height,
        color: selectedElement.color || '#212529',
        strokeWidth: selectedElement.strokeWidth || 2,
        fillColor: selectedElement.fillColor || 'transparent',
        text: '',
      }
    }

    const p1 = getAnchorCoordinates(selectedElement, startAnchor) || { x: b.x + b.width, y: b.y + b.height / 2 }
    const p2 = getAnchorCoordinates(newShape, endAnchor) || { x: newX, y: newY + b.height / 2 }

    const newConnector = {
      id: generateId(),
      type: 'elbow-arrow',
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
      color: selectedElement.color || '#212529',
      strokeWidth: selectedElement.strokeWidth || 2,
      startBinding: { elementId: selectedElement.id, anchor: startAnchor },
      endBinding: { elementId: newShapeId, anchor: endAnchor },
    }

    const updated = [...current, newConnector, newShape]
    elementsRef.current = updated
    onElementsChange(updated)
    onSelectElement(newShape)

    const newBounds = getElementBounds(newShape)
    setEditingText({
      id: newShapeId,
      x: newBounds.x,
      y: newBounds.y,
      width: newBounds.width,
      height: newBounds.height,
      text: '',
      type: 'shape',
      fontSize: 14,
      color: newShape.textColor || (isDarkColor(newShape.fillColor) ? '#ffffff' : newShape.color || '#1e293b'),
    })
    needsRepaintRef.current = true
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-white select-none"
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
      }}
      onDrop={(e) => {
        e.preventDefault()
        const rect = canvasRef.current.getBoundingClientRect()
        const screenX = e.clientX - rect.left
        const screenY = e.clientY - rect.top
        const world = screenToWorld(screenX, screenY, viewport)
        const files = e.dataTransfer?.files
        if (files && files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            if (files[i].type.startsWith('image/')) {
              handleProcessAndInsertImage(files[i], world.x + i * 24, world.y + i * 24)
            }
          }
        }
      }}
    >
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

      {/* Miro-Style Quick-Add Connected Shape Handles */}
      {selectedElement &&
        activeTool === 'select' &&
        interactionModeRef.current === 'none' &&
        !editingText &&
        (BOX_SHAPES.includes(selectedElement.type) || selectedElement.type === 'circle') &&
        (() => {
          const b = getElementBounds(selectedElement)
          if (!b) return null
          const p1 = worldToScreen(b.x, b.y, viewport)
          const p2 = worldToScreen(b.x + b.width, b.y + b.height, viewport)
          const screenW = p2.x - p1.x
          const screenH = p2.y - p1.y
          const midX = p1.x + screenW / 2
          const midY = p1.y + screenH / 2

          return (
            <div className="absolute inset-0 pointer-events-none z-20">
              {/* Right + Handle */}
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  handleQuickAdd('right')
                }}
                title="Add step right (Miro Quick-Add)"
                className="absolute w-5 h-5 rounded-full bg-[#1971c2] text-white hover:bg-[#1864ab] hover:scale-125 transition-transform flex items-center justify-center shadow-md pointer-events-auto cursor-pointer -translate-x-1/2 -translate-y-1/2 border border-white"
                style={{ left: `${p2.x + 16}px`, top: `${midY}px` }}
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>

              {/* Bottom + Handle */}
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  handleQuickAdd('bottom')
                }}
                title="Add step down (Miro Quick-Add)"
                className="absolute w-5 h-5 rounded-full bg-[#1971c2] text-white hover:bg-[#1864ab] hover:scale-125 transition-transform flex items-center justify-center shadow-md pointer-events-auto cursor-pointer -translate-x-1/2 -translate-y-1/2 border border-white"
                style={{ left: `${midX}px`, top: `${p2.y + 16}px` }}
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>

              {/* Left + Handle */}
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  handleQuickAdd('left')
                }}
                title="Add step left (Miro Quick-Add)"
                className="absolute w-5 h-5 rounded-full bg-[#1971c2] text-white hover:bg-[#1864ab] hover:scale-125 transition-transform flex items-center justify-center shadow-md pointer-events-auto cursor-pointer -translate-x-1/2 -translate-y-1/2 border border-white"
                style={{ left: `${p1.x - 16}px`, top: `${midY}px` }}
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>

              {/* Top + Handle */}
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  handleQuickAdd('top')
                }}
                title="Add step up (Miro Quick-Add)"
                className="absolute w-5 h-5 rounded-full bg-[#1971c2] text-white hover:bg-[#1864ab] hover:scale-125 transition-transform flex items-center justify-center shadow-md pointer-events-auto cursor-pointer -translate-x-1/2 -translate-y-1/2 border border-white"
                style={{ left: `${midX}px`, top: `${p1.y - 16}px` }}
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          )
        })()}

      {/* Inline Textarea Overlay for Text, Shapes, Sticky Notes & Connectors */}
      {editingText && (
        <div
          className="absolute z-30"
          style={{
            left: `${worldToScreen(editingText.x, editingText.y, viewport).x}px`,
            top: `${worldToScreen(editingText.x, editingText.y, viewport).y}px`,
            transform: editingText.type === 'shape' || editingText.type === 'connector' ? undefined : `scale(${viewport.zoom})`,
            transformOrigin: 'top left',
          }}
        >
          {editingText.type === 'text' && (
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
          )}

          {editingText.type === 'sticky' && (
            <textarea
              ref={textInputRef}
              autoFocus
              defaultValue={editingText.text}
              onBlur={commitTextEdit}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setEditingText(null)
              }}
              style={{
                width: `${editingText.width || 200}px`,
                height: `${editingText.height || 140}px`,
              }}
              className="p-3.5 pt-6 bg-transparent text-[#1e293b] border-none outline-none resize-none font-sans text-sm rounded leading-relaxed"
              placeholder="Write a note..."
            />
          )}

          {editingText.type === 'shape' && (
            <div
              className="flex items-center justify-center"
              style={{
                width: `${(editingText.width || 120) * viewport.zoom}px`,
                height: `${(editingText.height || 60) * viewport.zoom}px`,
              }}
            >
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
                style={{
                  fontSize: `${Math.max(12, (editingText.fontSize || 14) * viewport.zoom)}px`,
                  color: editingText.color || '#1e293b',
                }}
                className="w-[88%] text-center p-1.5 bg-white/95 shadow-md border-2 border-[#1971c2] rounded-lg outline-none resize-none overflow-hidden font-sans font-medium"
                rows={Math.max(1, (editingText.text || '').split('\n').length)}
                placeholder="Type label..."
              />
            </div>
          )}

          {editingText.type === 'connector' && (
            <div className="-translate-x-1/2 -translate-y-1/2">
              <input
                ref={textInputRef}
                autoFocus
                defaultValue={editingText.text}
                onBlur={commitTextEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commitTextEdit()
                  }
                  if (e.key === 'Escape') setEditingText(null)
                }}
                className="px-2.5 py-1 text-xs font-semibold text-center bg-white border-2 border-[#1971c2] shadow-lg rounded-md outline-none min-w-[75px]"
                placeholder="e.g. Yes / No"
              />
            </div>
          )}
        </div>
      )}

      {/* Grid Snapping Floating Toggle */}
      <button
        onClick={() => setGridSnap((prev) => !prev)}
        title={gridSnap ? 'Grid Snapping Active (Click to disable)' : 'Grid Snapping Off (Click to enable)'}
        className={`absolute bottom-5 right-5 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md shadow-md transition-all cursor-pointer border ${
          gridSnap
            ? 'bg-[#e7f5ff]/95 text-[#1971c2] border-[#a5d8ff]'
            : 'bg-white/90 text-[#868e96] border-[#dee2e6] hover:text-[#495057]'
        }`}
      >
        <Magnet className="w-3.5 h-3.5" />
        <span>{gridSnap ? 'Grid Snap ON' : 'Grid Snap OFF'}</span>
      </button>
    </div>
  )
}
