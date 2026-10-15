/**
 * SyncBoard — MS Paint Flood Fill Engine
 *
 * Implements high-performance, bounded offscreen raster flood-fill for
 * closed freehand regions drawn with pencil/pen strokes or intersecting lines.
 *
 * Key Capabilities:
 * 1. Bounded Memory & Speed: Renders a constrained ROI (800x800) around the seed point.
 * 2. Leak Prevention: If the fill reaches the buffer boundary, the region is unclosed;
 *    the fill safely aborts without polluting the canvas or UI.
 * 3. Color Tolerance: Uses Euclidean color distance to handle anti-aliasing along stroke edges.
 * 4. Edge Dilation: 1px dilation ensures no white halos/fringes appear between the fill and stroke.
 * 5. Full Serialization: Outputs a standard CanvasElement (type: 'image', isFloodFill: true)
 *    compatible with Supabase Realtime, PostgreSQL JSONB, Pan/Zoom, and Undo/Redo.
 */

import { generateId } from '@/lib/utils'
import { drawElement } from './renderer'
import { getElementBounds } from './hitTest'

/**
 * Convert hex color string to RGB object.
 * @param {string} hex
 * @returns {{r: number, g: number, b: number, a: number}}
 */
export function hexToRgb(hex) {
  if (!hex || hex === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 }
  }

  let clean = hex.replace('#', '').trim()
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('')
  }

  const num = parseInt(clean.slice(0, 6), 16)
  if (isNaN(num)) {
    return { r: 25, g: 113, b: 194, a: 255 }
  }

  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  const a = clean.length === 8 ? parseInt(clean.slice(6, 8), 16) : 255

  return { r, g, b, a }
}

/**
 * Perform MS Paint-style flood fill on freehand drawings.
 *
 * @param {{
 *   worldX: number,
 *   worldY: number,
 *   elements: import('./elements').CanvasElement[],
 *   fillColor: string,
 *   tolerance?: number,
 *   bufferSize?: number,
 * }} options
 * @returns {{
 *   success: boolean,
 *   element?: import('./elements').CanvasElement,
 *   reason?: 'unbounded' | 'already_filled' | 'too_small' | 'error',
 *   message?: string,
 * }}
 */
export function performFloodFill({
  worldX,
  worldY,
  elements,
  fillColor,
  tolerance = 38,
  bufferSize = 800,
}) {
  if (typeof document === 'undefined') {
    return { success: false, reason: 'error', message: 'Not in browser environment' }
  }

  const fillRgb = hexToRgb(fillColor)
  if (fillRgb.a === 0) {
    // Transparent fill on empty space is a no-op
    return { success: false, reason: 'already_filled', message: 'Selected color is transparent' }
  }

  // 1. Calculate Region of Interest (ROI) centered at (worldX, worldY)
  const half = Math.round(bufferSize / 2)
  const roiX = Math.round(worldX - half)
  const roiY = Math.round(worldY - half)
  const width = bufferSize
  const height = bufferSize

  // 2. Filter elements that intersect this ROI
  const roiBox = { x: roiX, y: roiY, width, height }
  const relevantElements = elements.filter((el) => {
    const b = getElementBounds(el)
    if (!b) return false
    return (
      b.x <= roiBox.x + roiBox.width &&
      b.x + b.width >= roiBox.x &&
      b.y <= roiBox.y + roiBox.height &&
      b.y + b.height >= roiBox.y
    )
  })

  // 3. Render relevant elements onto offscreen canvas with pure white background
  const offscreen = document.createElement('canvas')
  offscreen.width = width
  offscreen.height = height
  const ctx = offscreen.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    return { success: false, reason: 'error', message: 'Could not create offscreen context' }
  }

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  ctx.translate(-roiX, -roiY)
  for (const el of relevantElements) {
    drawElement(ctx, el)
  }
  ctx.restore()

  // 4. Sample seed pixel
  const startX = Math.round(worldX - roiX)
  const startY = Math.round(worldY - roiY)

  if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
    return { success: false, reason: 'error', message: 'Click coordinates outside buffer' }
  }

  const imgData = ctx.getImageData(0, 0, width, height)
  const data = imgData.data

  let seedIdx = (startY * width + startX) * 4
  let targetR = data[seedIdx]
  let targetG = data[seedIdx + 1]
  let targetB = data[seedIdx + 2]

  // If clicked directly on a dark stroke boundary pixel, search immediate 5x5 neighborhood for interior
  const isDarkStroke = targetR < 60 && targetG < 60 && targetB < 60
  if (isDarkStroke) {
    let bestDist = -1
    let bestX = startX
    let bestY = startY

    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const nx = startX + dx
        const ny = startY + dy
        if (nx >= 2 && nx < width - 2 && ny >= 2 && ny < height - 2) {
          const nIdx = (ny * width + nx) * 4
          const r = data[nIdx]
          const g = data[nIdx + 1]
          const b = data[nIdx + 2]
          const lum = r * 0.299 + g * 0.587 + b * 0.114
          if (lum > bestDist) {
            bestDist = lum
            bestX = nx
            bestY = ny
          }
        }
      }
    }

    if (bestDist > 80) {
      const newIdx = (bestY * width + bestX) * 4
      targetR = data[newIdx]
      targetG = data[newIdx + 1]
      targetB = data[newIdx + 2]
    }
  }

  // If target already matches fill color within tolerance, no-op
  const dFill =
    (targetR - fillRgb.r) ** 2 +
    (targetG - fillRgb.g) ** 2 +
    (targetB - fillRgb.b) ** 2
  if (dFill < 100) {
    return { success: false, reason: 'already_filled', message: 'Region is already filled with this color' }
  }

  // 5. Scanline Queue-Based Flood Fill with Leak Prevention
  const totalPixels = width * height
  const visited = new Uint8Array(totalPixels)
  const queue = new Int32Array(totalPixels)
  let queueStart = 0
  let queueEnd = 0

  const startPixel = startY * width + startX
  queue[queueEnd++] = startPixel
  visited[startPixel] = 1

  const toleranceSq = tolerance * tolerance

  function matchesTarget(pixelIdx) {
    const idx = pixelIdx * 4
    const dr = data[idx] - targetR
    const dg = data[idx + 1] - targetG
    const db = data[idx + 2] - targetB
    return dr * dr + dg * dg + db * db <= toleranceSq
  }

  let isUnbounded = false
  let minFillX = width
  let maxFillX = 0
  let minFillY = height
  let maxFillY = 0
  let filledCount = 0

  const minEdge = 3
  const maxEdgeX = width - 4
  const maxEdgeY = height - 4

  while (queueStart < queueEnd) {
    const p = queue[queueStart++]
    const py = Math.floor(p / width)
    const px = p % width

    // Boundary Detection: If flood fill reaches the buffer boundary, the region is OPEN!
    if (px <= minEdge || px >= maxEdgeX || py <= minEdge || py >= maxEdgeY) {
      isUnbounded = true
      break
    }

    if (px < minFillX) minFillX = px
    if (px > maxFillX) maxFillX = px
    if (py < minFillY) minFillY = py
    if (py > maxFillY) maxFillY = py
    filledCount++

    // Check 4-connected neighbors
    const nUp = p - width
    const nDown = p + width
    const nLeft = p - 1
    const nRight = p + 1

    if (py > 0 && !visited[nUp] && matchesTarget(nUp)) {
      visited[nUp] = 1
      queue[queueEnd++] = nUp
    }
    if (py < height - 1 && !visited[nDown] && matchesTarget(nDown)) {
      visited[nDown] = 1
      queue[queueEnd++] = nDown
    }
    if (px > 0 && !visited[nLeft] && matchesTarget(nLeft)) {
      visited[nLeft] = 1
      queue[queueEnd++] = nLeft
    }
    if (px < width - 1 && !visited[nRight] && matchesTarget(nRight)) {
      visited[nRight] = 1
      queue[queueEnd++] = nRight
    }
  }

  // 6. Handle Leaks / Unclosed Boundaries
  if (isUnbounded) {
    return {
      success: false,
      reason: 'unbounded',
      message: 'Region is not closed! Please close any gaps in your drawing to fill it 🎨',
    }
  }

  if (filledCount < 9) {
    return {
      success: false,
      reason: 'too_small',
      message: 'Clicked area is too small to fill',
    }
  }

  // 7. Edge Dilation (1px) to prevent white halos between fill and strokes
  const dilated = new Uint8Array(visited)
  for (let y = minFillY; y <= maxFillY; y++) {
    for (let x = minFillX; x <= maxFillX; x++) {
      const p = y * width + x
      if (visited[p]) {
        // Expand to adjacent non-visited pixels if they are not dark stroke centers
        const adj = [p - 1, p + 1, p - width, p + width]
        for (const ap of adj) {
          if (ap >= 0 && ap < totalPixels && !dilated[ap]) {
            const aIdx = ap * 4
            const lum = data[aIdx] * 0.299 + data[aIdx + 1] * 0.587 + data[aIdx + 2] * 0.114
            if (lum > 30) {
              dilated[ap] = 1
            }
          }
        }
      }
    }
  }

  // 8. Crop to Bounding Box & Generate Output Mask Canvas
  const pad = 2
  const cropX = Math.max(0, minFillX - pad)
  const cropY = Math.max(0, minFillY - pad)
  const cropW = Math.min(width - cropX, maxFillX - cropX + pad * 2)
  const cropH = Math.min(height - cropY, maxFillY - cropY + pad * 2)

  const outCanvas = document.createElement('canvas')
  outCanvas.width = cropW
  outCanvas.height = cropH
  const outCtx = outCanvas.getContext('2d')
  if (!outCtx) {
    return { success: false, reason: 'error', message: 'Could not create output canvas' }
  }

  const outImgData = outCtx.createImageData(cropW, cropH)
  const outData = outImgData.data

  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const srcP = (cropY + y) * width + (cropX + x)
      if (dilated[srcP]) {
        const destIdx = (y * cropW + x) * 4
        outData[destIdx] = fillRgb.r
        outData[destIdx + 1] = fillRgb.g
        outData[destIdx + 2] = fillRgb.b
        outData[destIdx + 3] = fillRgb.a
      }
    }
  }

  outCtx.putImageData(outImgData, 0, 0)
  const dataUrl = outCanvas.toDataURL('image/png')

  // 9. Return New CanvasElement
  return {
    success: true,
    element: {
      id: generateId(),
      type: 'image',
      x: roiX + cropX,
      y: roiY + cropY,
      width: cropW,
      height: cropH,
      src: dataUrl,
      isFloodFill: true,
      fillColor: fillColor,
    },
  }
}
