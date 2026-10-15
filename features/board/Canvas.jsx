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
} from './hitTest'
import { BOX_SHAPES, LINE_SHAPES } from './elements'

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

    // Paint Bucket Tool: Fill clicked shape with color
    if (activeTool === 'bucket') {
      const currentListForBucket = elementsRef.current || elements || []
      const hit = findElementAtPoint(world.x, world.y, currentListForBucket, 14 / viewport.zoom)
      if (hit) {
        const fillToApply = currentFillColor && currentFillColor !== 'transparent' ? currentFillColor : (currentColor || '#1971c2')
        const updated = currentListForBucket.map((el) => {
          if (el.id !== hit.id) return el
          if (LINE_SHAPES.includes(el.type)) {
            return { ...el, color: fillToApply }
          }
          return { ...el, fillColor: fillToApply }
        })
        elementsRef.current = updated
        onElementsChange(updated)
        if (selectedElement && selectedElement.id === hit.id) {
          onSelectElement({ ...selectedElement, fillColor: fillToApply })
        }
        toast.success('Filled with color! 🎨', { id: 'fill-toast', duration: 1200 })
        needsRepaintRef.current = true
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
            ? 'pointer'
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
          movedEl = { ...el, x: targetWorldX, y: targetWorldY }
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
        current.x = Math.min(startW.worldX, world.x)
        current.y = Math.min(startW.worldY, world.y)
        current.width = Math.abs(world.x - startW.worldX)
        current.height = Math.abs(world.y - startW.worldY)
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
          ? 'pointer'
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

  // 8. Double Click to edit Text/Sticky or fill Shape with color
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
      if (hit.type === 'text' || hit.type === 'sticky') {
        onSelectElement(hit)
        onSelectTool?.('select')
        setEditingText({
          id: hit.id,
          x: hit.x,
          y: hit.y,
          width: hit.width,
          height: hit.height,
          text: hit.text || '',
          type: hit.type,
        })
      } else {
        // Double-click to fill any shape or pen stroke!
        const fillToApply = currentFillColor && currentFillColor !== 'transparent' ? currentFillColor : (currentColor || '#1971c2')
        const updated = current.map((el) => {
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
              id: editingText.id,
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
    }

    setEditingText(null)
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
              style={{
                width: `${editingText.width || 200}px`,
                height: `${editingText.height || 140}px`,
              }}
              className="p-3.5 pt-6 bg-transparent text-[#1e293b] border-none outline-none resize-none font-sans text-sm rounded leading-relaxed"
              placeholder="Write a note..."
            />
          )}
        </div>
      )}
    </div>
  )
}
