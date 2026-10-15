/**
 * SyncBoard — Canvas Renderer
 *
 * Pure rendering functions. Each function takes a CanvasRenderingContext2D
 * and element data, and draws it. No state management here.
 */

/**
 * Draw the dot grid background.
 * Grid is drawn in world space so it pans and zooms with the canvas.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} canvasWidth - CSS pixels
 * @param {number} canvasHeight - CSS pixels
 * @param {{panX: number, panY: number, zoom: number}} viewport
 */
export function drawGrid(ctx, canvasWidth, canvasHeight, viewport) {
  const { panX, panY, zoom } = viewport

  // Adaptive grid spacing: collapse to larger intervals when zoomed out
  let baseSpacing = 24
  if (zoom < 0.3) baseSpacing = 96
  else if (zoom < 0.6) baseSpacing = 48

  const spacing = baseSpacing

  // Calculate visible world bounds
  const worldLeft = -panX / zoom
  const worldTop = -panY / zoom
  const worldRight = (canvasWidth - panX) / zoom
  const worldBottom = (canvasHeight - panY) / zoom

  // Snap to grid lines
  const startX = Math.floor(worldLeft / spacing) * spacing
  const startY = Math.floor(worldTop / spacing) * spacing

  const dotRadius = Math.max(0.8, 1.2 / zoom)
  // Subtle dot color — adapts slightly with zoom
  const alpha = Math.min(0.35, 0.18 + zoom * 0.06)

  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`

  for (let wx = startX; wx <= worldRight; wx += spacing) {
    for (let wy = startY; wy <= worldBottom; wy += spacing) {
      ctx.beginPath()
      ctx.arc(wx, wy, dotRadius, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

/**
 * Draw a pen (freehand) stroke.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./elements').PenElement} el
 */
export function drawPen(ctx, el) {
  if (!el.points || el.points.length < 2) return

  // Fill loop if fillColor is specified
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.beginPath()
    ctx.moveTo(el.points[0].x, el.points[0].y)
    for (let i = 1; i < el.points.length; i++) {
      ctx.lineTo(el.points[i].x, el.points[i].y)
    }
    ctx.closePath()
    ctx.fill()
  }

  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(el.points[0].x, el.points[0].y)

  // Use quadratic curves for smoother freehand strokes
  for (let i = 1; i < el.points.length - 1; i++) {
    const midX = (el.points[i].x + el.points[i + 1].x) / 2
    const midY = (el.points[i].y + el.points[i + 1].y) / 2
    ctx.quadraticCurveTo(el.points[i].x, el.points[i].y, midX, midY)
  }

  // Draw to last point
  const last = el.points[el.points.length - 1]
  ctx.lineTo(last.x, last.y)
  ctx.stroke()
}

/**
 * Draw a rectangle.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./elements').RectangleElement} el
 */
export function drawRectangle(ctx, el) {
  const r = 3 // subtle corner radius

  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.beginPath()
    ctx.roundRect(el.x, el.y, el.width, el.height, r)
    ctx.fill()
  }

  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.roundRect(el.x, el.y, el.width, el.height, r)
  ctx.stroke()
}

/**
 * Draw an ellipse.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./elements').CircleElement} el
 */
export function drawCircle(ctx, el) {
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.beginPath()
    ctx.ellipse(el.x, el.y, Math.abs(el.radiusX), Math.abs(el.radiusY), 0, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.beginPath()
  ctx.ellipse(el.x, el.y, Math.abs(el.radiusX), Math.abs(el.radiusY), 0, 0, Math.PI * 2)
  ctx.stroke()
}

/**
 * Draw a line.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./elements').LineElement} el
 */
export function drawLine(ctx, el) {
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(el.x1, el.y1)
  ctx.lineTo(el.x2, el.y2)
  ctx.stroke()
}

/**
 * Draw an arrow (line with arrowhead at end point).
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./elements').ArrowElement} el
 */
export function drawArrow(ctx, el) {
  ctx.strokeStyle = el.color
  ctx.fillStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.lineCap = 'round'

  // Shaft
  ctx.beginPath()
  ctx.moveTo(el.x1, el.y1)
  ctx.lineTo(el.x2, el.y2)
  ctx.stroke()

  // Arrowhead
  const angle = Math.atan2(el.y2 - el.y1, el.x2 - el.x1)
  const headLen = Math.max(10, el.strokeWidth * 4)
  const headAngle = Math.PI / 7

  ctx.beginPath()
  ctx.moveTo(el.x2, el.y2)
  ctx.lineTo(
    el.x2 - headLen * Math.cos(angle - headAngle),
    el.y2 - headLen * Math.sin(angle - headAngle)
  )
  ctx.lineTo(
    el.x2 - headLen * Math.cos(angle + headAngle),
    el.y2 - headLen * Math.sin(angle + headAngle)
  )
  ctx.closePath()
  ctx.fill()
}

/**
 * Draw a text element.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./elements').TextElement} el
 */
export function drawText(ctx, el) {
  if (!el.text) return

  ctx.fillStyle = el.color
  ctx.font = `${el.fontSize}px Inter, system-ui, -apple-system, sans-serif`
  ctx.textBaseline = 'top'

  const lines = el.text.split('\n')
  const lineHeight = el.fontSize * 1.4

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], el.x, el.y + i * lineHeight)
  }
}

// In-memory cache for loaded images so canvas redraws are instant and flicker-free
const imageCache = new Map()

/**
 * Draw a sticky note.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./elements').StickyElement} el
 */
export function drawSticky(ctx, el) {
  const r = 6

  // Shadow
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.12)'
  ctx.shadowBlur = 10
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 4

  // Background
  ctx.fillStyle = el.bgColor || '#fff3bf'
  ctx.beginPath()
  ctx.roundRect(el.x, el.y, el.width, el.height, r)
  ctx.fill()
  ctx.restore()

  // Top adhesive header strip (gives realistic Post-it depth)
  ctx.save()
  ctx.fillStyle = 'rgba(0, 0, 0, 0.04)'
  ctx.beginPath()
  ctx.roundRect(el.x, el.y, el.width, Math.min(22, el.height * 0.18), [r, r, 0, 0])
  ctx.fill()
  ctx.restore()

  // Subtle border
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(el.x, el.y, el.width, el.height, r)
  ctx.stroke()

  // Corner fold at bottom right for authenticity
  const foldSize = Math.min(14, el.width * 0.1, el.height * 0.1)
  if (foldSize > 6) {
    ctx.save()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)'
    ctx.beginPath()
    ctx.moveTo(el.x + el.width - foldSize, el.y + el.height)
    ctx.lineTo(el.x + el.width, el.y + el.height - foldSize)
    ctx.lineTo(el.x + el.width, el.y + el.height)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  // Text
  if (el.text) {
    const fontSize = el.fontSize || 15
    ctx.fillStyle = el.textColor || '#1e293b'
    ctx.font = `${fontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    ctx.textBaseline = 'top'

    const padding = 14
    const topPadding = 26
    const maxWidth = el.width - padding * 2
    const lines = wrapText(ctx, el.text, maxWidth)
    const lineHeight = fontSize * 1.35

    for (let i = 0; i < lines.length; i++) {
      const textY = el.y + topPadding + i * lineHeight
      if (textY + lineHeight > el.y + el.height - padding) break
      ctx.fillText(lines[i], el.x + padding, textY)
    }
  }
}

/**
 * Draw an image element on canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./elements').ImageElement} el
 */
export function drawImageElement(ctx, el) {
  if (!el.src) return

  let img = imageCache.get(el.src)
  if (!img) {
    img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = el.src
    imageCache.set(el.src, img)
  }

  const r = 6 // slight rounded corner

  if (img.complete && img.naturalWidth > 0) {
    ctx.save()
    // Clip to rounded rectangle
    ctx.beginPath()
    ctx.roundRect(el.x, el.y, el.width, el.height, r)
    ctx.clip()
    ctx.drawImage(img, el.x, el.y, el.width, el.height)
    ctx.restore()

    // Subtle crisp border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(el.x, el.y, el.width, el.height, r)
    ctx.stroke()
  } else {
    // Placeholder while image is downloading or rendering
    ctx.save()
    ctx.fillStyle = '#f8fafc'
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(el.x, el.y, el.width, el.height, r)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#94a3b8'
    ctx.font = '12px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🖼️ Loading image...', el.x + el.width / 2, el.y + el.height / 2)
    ctx.restore()
  }
}

/**
 * Draw selection indicator around an element.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x: number, y: number, width: number, height: number}} bounds
 */
export function drawSelectionBox(ctx, bounds) {
  if (!bounds) return
  const pad = 4
  const bx = bounds.x - pad
  const by = bounds.y - pad
  const bw = bounds.width + pad * 2
  const bh = bounds.height + pad * 2

  ctx.save()
  ctx.strokeStyle = '#1971c2'
  ctx.lineWidth = 1.5
  ctx.setLineDash([])
  ctx.strokeRect(bx, by, bw, bh)

  // 8 Resize handles (4 corners + 4 edge centers)
  const handleSize = 8
  const half = handleSize / 2
  const r = 2

  const handles = [
    [bx, by],
    [bx + bw, by],
    [bx + bw, by + bh],
    [bx, by + bh],
    [bx + bw / 2, by],
    [bx + bw / 2, by + bh],
    [bx, by + bh / 2],
    [bx + bw, by + bh / 2],
  ]

  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#1971c2'
  ctx.lineWidth = 1.5

  for (const [hx, hy] of handles) {
    ctx.beginPath()
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(hx - half, hy - half, handleSize, handleSize, r)
    } else {
      ctx.rect(hx - half, hy - half, handleSize, handleSize)
    }
    ctx.fill()
    ctx.stroke()
  }
  ctx.restore()
}

/**
 * Draw a subtle hover highlight box around a shape (e.g. for bucket fill tool).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x: number, y: number, width: number, height: number}} bounds
 * @param {string} [color='#1971c2']
 */
export function drawHoverBox(ctx, bounds, color = '#1971c2') {
  if (!bounds) return
  const pad = 4
  const bx = bounds.x - pad
  const by = bounds.y - pad
  const bw = bounds.width + pad * 2
  const bh = bounds.height + pad * 2

  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 4])
  ctx.strokeRect(bx, by, bw, bh)
  ctx.restore()
}

/**
 * Draw magnetic anchor connection point indicators.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x: number, y: number}[]} anchors
 * @param {{x: number, y: number} | null} [activeAnchor=null]
 */
export function drawMagneticAnchors(ctx, anchors, activeAnchor = null) {
  if (!anchors || anchors.length === 0) return

  ctx.save()
  for (const a of anchors) {
    const isSnapped =
      activeAnchor && Math.hypot(a.x - activeAnchor.x, a.y - activeAnchor.y) < 2
    const size = isSnapped ? 6 : 4

    // Outer glow for snapped anchor
    if (isSnapped) {
      ctx.beginPath()
      ctx.arc(a.x, a.y, 11, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(25, 113, 194, 0.22)'
      ctx.fill()
    }

    // Inner anchor circle
    ctx.beginPath()
    ctx.arc(a.x, a.y, size, 0, Math.PI * 2)
    ctx.fillStyle = isSnapped ? '#1971c2' : '#ffffff'
    ctx.strokeStyle = '#1971c2'
    ctx.lineWidth = isSnapped ? 2 : 1.5
    ctx.fill()
    ctx.stroke()
  }
  ctx.restore()
}

export function drawDiamond(ctx, el) {
  const cx = el.x + el.width / 2
  const cy = el.y + el.height / 2
  ctx.beginPath()
  ctx.moveTo(cx, el.y)
  ctx.lineTo(el.x + el.width, cy)
  ctx.lineTo(cx, el.y + el.height)
  ctx.lineTo(el.x, cy)
  ctx.closePath()
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.fill()
  }
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.lineJoin = 'round'
  ctx.stroke()
}

export function drawTriangle(ctx, el) {
  ctx.beginPath()
  ctx.moveTo(el.x + el.width / 2, el.y)
  ctx.lineTo(el.x + el.width, el.y + el.height)
  ctx.lineTo(el.x, el.y + el.height)
  ctx.closePath()
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.fill()
  }
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.lineJoin = 'round'
  ctx.stroke()
}

export function drawStar(ctx, el) {
  const cx = el.x + el.width / 2
  const cy = el.y + el.height / 2
  const outerR = Math.min(Math.abs(el.width), Math.abs(el.height)) / 2
  const innerR = outerR * 0.45
  const points = 5
  const step = Math.PI / points
  ctx.beginPath()
  for (let i = 0; i < 2 * points; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const angle = i * step - Math.PI / 2
    const px = cx + r * Math.cos(angle)
    const py = cy + r * Math.sin(angle)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.fill()
  }
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.lineJoin = 'round'
  ctx.stroke()
}

export function drawHeart(ctx, el) {
  const x = el.x
  const y = el.y
  const w = el.width
  const h = el.height
  ctx.beginPath()
  const topH = h * 0.3
  ctx.moveTo(x + w / 2, y + h)
  ctx.bezierCurveTo(x, y + h * 0.6, x, y, x + w / 4, y)
  ctx.bezierCurveTo(x + w / 2, y, x + w / 2, y + topH, x + w / 2, y + topH)
  ctx.bezierCurveTo(x + w / 2, y + topH, x + w / 2, y, x + (3 * w) / 4, y)
  ctx.bezierCurveTo(x + w, y, x + w, y + h * 0.6, x + w / 2, y + h)
  ctx.closePath()
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.fill()
  }
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.lineJoin = 'round'
  ctx.stroke()
}

export function drawHexagon(ctx, el) {
  const cx = el.x + el.width / 2
  const cy = el.y + el.height / 2
  const rx = Math.abs(el.width) / 2
  const ry = Math.abs(el.height) / 2
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3
    const px = cx + rx * Math.cos(angle)
    const py = cy + ry * Math.sin(angle)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.fill()
  }
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.lineJoin = 'round'
  ctx.stroke()
}

export function drawCloud(ctx, el) {
  const x = el.x
  const y = el.y
  const w = el.width
  const h = el.height
  ctx.beginPath()
  ctx.moveTo(x + w * 0.2, y + h * 0.7)
  ctx.bezierCurveTo(x, y + h * 0.7, x, y + h * 0.4, x + w * 0.2, y + h * 0.4)
  ctx.bezierCurveTo(x + w * 0.15, y + h * 0.1, x + w * 0.45, y + h * 0.1, x + w * 0.5, y + h * 0.3)
  ctx.bezierCurveTo(x + w * 0.6, y + h * 0.15, x + w * 0.85, y + h * 0.2, x + w * 0.85, y + h * 0.45)
  ctx.bezierCurveTo(x + w, y + h * 0.45, x + w, y + h * 0.7, x + w * 0.8, y + h * 0.7)
  ctx.closePath()
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.fill()
  }
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.lineJoin = 'round'
  ctx.stroke()
}

export function drawDoubleArrow(ctx, el) {
  ctx.strokeStyle = el.color
  ctx.fillStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.lineCap = 'round'

  // Shaft
  ctx.beginPath()
  ctx.moveTo(el.x1, el.y1)
  ctx.lineTo(el.x2, el.y2)
  ctx.stroke()

  const angle = Math.atan2(el.y2 - el.y1, el.x2 - el.x1)
  const headLen = Math.max(10, el.strokeWidth * 4)
  const headAngle = Math.PI / 7

  // Forward Arrowhead
  ctx.beginPath()
  ctx.moveTo(el.x2, el.y2)
  ctx.lineTo(el.x2 - headLen * Math.cos(angle - headAngle), el.y2 - headLen * Math.sin(angle - headAngle))
  ctx.lineTo(el.x2 - headLen * Math.cos(angle + headAngle), el.y2 - headLen * Math.sin(angle + headAngle))
  ctx.closePath()
  ctx.fill()

  // Backward Arrowhead
  ctx.beginPath()
  ctx.moveTo(el.x1, el.y1)
  ctx.lineTo(el.x1 + headLen * Math.cos(angle - headAngle), el.y1 + headLen * Math.sin(angle - headAngle))
  ctx.lineTo(el.x1 + headLen * Math.cos(angle + headAngle), el.y1 + headLen * Math.sin(angle + headAngle))
  ctx.closePath()
  ctx.fill()
}

export function drawRoundedRectangle(ctx, el) {
  const r = Math.min(16, Math.abs(el.width) / 4, Math.abs(el.height) / 4)
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(el.x, el.y, el.width, el.height, r)
  } else {
    ctx.rect(el.x, el.y, el.width, el.height)
  }
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.fill()
  }
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.stroke()
}

export function drawRightTriangle(ctx, el) {
  ctx.beginPath()
  ctx.moveTo(el.x, el.y)
  ctx.lineTo(el.x, el.y + el.height)
  ctx.lineTo(el.x + el.width, el.y + el.height)
  ctx.closePath()
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.fill()
  }
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.lineJoin = 'round'
  ctx.stroke()
}

export function drawRegularPolygon(ctx, el, sides, startAngle = -Math.PI / 2) {
  const cx = el.x + el.width / 2
  const cy = el.y + el.height / 2
  const rx = Math.abs(el.width) / 2
  const ry = Math.abs(el.height) / 2
  ctx.beginPath()
  for (let i = 0; i < sides; i++) {
    const angle = startAngle + (i * 2 * Math.PI) / sides
    const px = cx + rx * Math.cos(angle)
    const py = cy + ry * Math.sin(angle)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.fill()
  }
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.lineJoin = 'round'
  ctx.stroke()
}

export function drawTrapezoid(ctx, el) {
  const inset = el.width * 0.2
  ctx.beginPath()
  ctx.moveTo(el.x + inset, el.y)
  ctx.lineTo(el.x + el.width - inset, el.y)
  ctx.lineTo(el.x + el.width, el.y + el.height)
  ctx.lineTo(el.x, el.y + el.height)
  ctx.closePath()
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.fill()
  }
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.lineJoin = 'round'
  ctx.stroke()
}

export function drawParallelogram(ctx, el) {
  const skew = el.width * 0.25
  ctx.beginPath()
  ctx.moveTo(el.x + skew, el.y)
  ctx.lineTo(el.x + el.width, el.y)
  ctx.lineTo(el.x + el.width - skew, el.y + el.height)
  ctx.lineTo(el.x, el.y + el.height)
  ctx.closePath()
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.fill()
  }
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.lineJoin = 'round'
  ctx.stroke()
}

export function drawBlockArrowRight(ctx, el) {
  const x = el.x, y = el.y, w = el.width, h = el.height
  const headW = w * 0.45
  const stemH = h * 0.4
  const stemY = y + (h - stemH) / 2
  ctx.beginPath()
  ctx.moveTo(x, stemY)
  ctx.lineTo(x + w - headW, stemY)
  ctx.lineTo(x + w - headW, y)
  ctx.lineTo(x + w, y + h / 2)
  ctx.lineTo(x + w - headW, y + h)
  ctx.lineTo(x + w - headW, stemY + stemH)
  ctx.lineTo(x, stemY + stemH)
  ctx.closePath()
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.fill()
  }
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.lineJoin = 'round'
  ctx.stroke()
}

export function drawBlockArrowLeft(ctx, el) {
  const x = el.x, y = el.y, w = el.width, h = el.height
  const headW = w * 0.45
  const stemH = h * 0.4
  const stemY = y + (h - stemH) / 2
  ctx.beginPath()
  ctx.moveTo(x + w, stemY)
  ctx.lineTo(x + headW, stemY)
  ctx.lineTo(x + headW, y)
  ctx.lineTo(x, y + h / 2)
  ctx.lineTo(x + headW, y + h)
  ctx.lineTo(x + headW, stemY + stemH)
  ctx.lineTo(x + w, stemY + stemH)
  ctx.closePath()
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.fill()
  }
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.lineJoin = 'round'
  ctx.stroke()
}

export function drawBlockArrowUp(ctx, el) {
  const x = el.x, y = el.y, w = el.width, h = el.height
  const headH = h * 0.45
  const stemW = w * 0.4
  const stemX = x + (w - stemW) / 2
  ctx.beginPath()
  ctx.moveTo(stemX, y + h)
  ctx.lineTo(stemX, y + headH)
  ctx.lineTo(x, y + headH)
  ctx.lineTo(x + w / 2, y)
  ctx.lineTo(x + w, y + headH)
  ctx.lineTo(stemX + stemW, y + headH)
  ctx.lineTo(stemX + stemW, y + h)
  ctx.closePath()
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.fill()
  }
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.lineJoin = 'round'
  ctx.stroke()
}

export function drawBlockArrowDown(ctx, el) {
  const x = el.x, y = el.y, w = el.width, h = el.height
  const headH = h * 0.45
  const stemW = w * 0.4
  const stemX = x + (w - stemW) / 2
  ctx.beginPath()
  ctx.moveTo(stemX, y)
  ctx.lineTo(stemX, y + h - headH)
  ctx.lineTo(x, y + h - headH)
  ctx.lineTo(x + w / 2, y + h)
  ctx.lineTo(x + w, y + h - headH)
  ctx.lineTo(stemX + stemW, y + h - headH)
  ctx.lineTo(stemX + stemW, y)
  ctx.closePath()
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.fill()
  }
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.lineJoin = 'round'
  ctx.stroke()
}

export function drawFourWayArrow(ctx, el) {
  const x = el.x, y = el.y, w = el.width, h = el.height
  const cx = x + w / 2, cy = y + h / 2
  const stemX = w * 0.12, stemY = h * 0.12
  const headW = w * 0.28, headH = h * 0.28

  ctx.beginPath()
  // Up tip
  ctx.moveTo(cx, y)
  ctx.lineTo(cx + headW, y + headH)
  ctx.lineTo(cx + stemX, y + headH)
  // Right tip
  ctx.lineTo(cx + stemX, cy - stemY)
  ctx.lineTo(x + w - headW, cy - stemY)
  ctx.lineTo(x + w - headW, cy - headH)
  ctx.lineTo(x + w, cy)
  ctx.lineTo(x + w - headW, cy + headH)
  ctx.lineTo(x + w - headW, cy + stemY)
  // Down tip
  ctx.lineTo(cx + stemX, cy + stemY)
  ctx.lineTo(cx + stemX, y + h - headH)
  ctx.lineTo(cx + headW, y + h - headH)
  ctx.lineTo(cx, y + h)
  ctx.lineTo(cx - headW, y + h - headH)
  ctx.lineTo(cx - stemX, y + h - headH)
  // Left tip
  ctx.lineTo(cx - stemX, cy + stemY)
  ctx.lineTo(x + headW, cy + stemY)
  ctx.lineTo(x + headW, cy + headH)
  ctx.lineTo(x, cy)
  ctx.lineTo(x + headW, cy - headH)
  ctx.lineTo(x + headW, cy - stemY)
  ctx.lineTo(cx - stemX, cy - stemY)
  ctx.lineTo(cx - stemX, y + headH)
  ctx.lineTo(cx - headW, y + headH)
  ctx.closePath()

  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.fill()
  }
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.lineJoin = 'round'
  ctx.stroke()
}

export function drawChevron(ctx, el) {
  const x = el.x, y = el.y, w = el.width, h = el.height
  const indent = w * 0.35
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + w - indent, y)
  ctx.lineTo(x + w, y + h / 2)
  ctx.lineTo(x + w - indent, y + h)
  ctx.lineTo(x, y + h)
  ctx.lineTo(x + indent, y + h / 2)
  ctx.closePath()
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.fill()
  }
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.lineJoin = 'round'
  ctx.stroke()
}

export function drawNPointStar(ctx, el, points, innerRatio = 0.45) {
  const cx = el.x + el.width / 2
  const cy = el.y + el.height / 2
  const rx = Math.abs(el.width) / 2
  const ry = Math.abs(el.height) / 2
  const step = Math.PI / points
  ctx.beginPath()
  for (let i = 0; i < 2 * points; i++) {
    const rX = i % 2 === 0 ? rx : rx * innerRatio
    const rY = i % 2 === 0 ? ry : ry * innerRatio
    const angle = i * step - Math.PI / 2
    const px = cx + rX * Math.cos(angle)
    const py = cy + rY * Math.sin(angle)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.fill()
  }
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.lineJoin = 'round'
  ctx.stroke()
}

export function drawLightning(ctx, el) {
  const x = el.x, y = el.y, w = el.width, h = el.height
  ctx.beginPath()
  ctx.moveTo(x + w * 0.48, y)
  ctx.lineTo(x + w * 0.82, y)
  ctx.lineTo(x + w * 0.42, y + h * 0.48)
  ctx.lineTo(x + w * 0.78, y + h * 0.48)
  ctx.lineTo(x + w * 0.15, y + h)
  ctx.lineTo(x + w * 0.48, y + h * 0.58)
  ctx.lineTo(x + w * 0.22, y + h * 0.58)
  ctx.closePath()
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.fill()
  }
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.lineJoin = 'round'
  ctx.stroke()
}

export function drawCalloutRect(ctx, el) {
  const x = el.x, y = el.y, w = el.width, h = el.height
  const bodyH = h * 0.78
  const r = Math.min(12, w / 6, bodyH / 6)
  const tailX1 = x + w * 0.2
  const tailX2 = x + w * 0.4
  const tailTipX = x + w * 0.1
  const tailTipY = y + h

  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + bodyH - r)
  ctx.quadraticCurveTo(x + w, y + bodyH, x + w - r, y + bodyH)
  ctx.lineTo(tailX2, y + bodyH)
  ctx.lineTo(tailTipX, tailTipY)
  ctx.lineTo(tailX1, y + bodyH)
  ctx.lineTo(x + r, y + bodyH)
  ctx.quadraticCurveTo(x, y + bodyH, x, y + bodyH - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()

  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.fill()
  }
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.lineJoin = 'round'
  ctx.stroke()
}

export function drawCalloutOval(ctx, el) {
  const x = el.x, y = el.y, w = el.width, h = el.height
  const bodyH = h * 0.8
  const cx = x + w / 2, cy = y + bodyH / 2
  const rx = Math.abs(w) / 2, ry = Math.abs(bodyH) / 2

  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.fill()
  }
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.stroke()

  // Tail triangle
  ctx.beginPath()
  ctx.moveTo(cx - rx * 0.4, cy + ry * 0.85)
  ctx.lineTo(x + w * 0.1, y + h)
  ctx.lineTo(cx - rx * 0.1, cy + ry * 0.95)
  ctx.closePath()
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.fill()
  }
  ctx.stroke()
}

export function drawCalloutCloud(ctx, el) {
  const x = el.x, y = el.y, w = el.width, h = el.height
  const bodyH = h * 0.78
  drawCloud(ctx, { ...el, height: bodyH })

  const dot1R = Math.min(w, h) * 0.05
  const dot2R = Math.min(w, h) * 0.03
  ctx.beginPath()
  ctx.arc(x + w * 0.25, y + bodyH + dot1R * 1.5, dot1R, 0, Math.PI * 2)
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.fill()
  }
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(x + w * 0.15, y + h - dot2R, dot2R, 0, Math.PI * 2)
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.fill()
  }
  ctx.stroke()
}

export function drawCurve(ctx, el) {
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.strokeWidth
  ctx.lineCap = 'round'
  const midX = (el.x1 + el.x2) / 2
  const midY = (el.y1 + el.y2) / 2
  const dx = el.x2 - el.x1
  const dy = el.y2 - el.y1
  const cpx = midX - dy * 0.25
  const cpy = midY + dx * 0.25

  ctx.beginPath()
  ctx.moveTo(el.x1, el.y1)
  ctx.quadraticCurveTo(cpx, cpy, el.x2, el.y2)
  ctx.stroke()
}

/**
 * Dispatch drawing to the correct renderer based on element type.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./elements').CanvasElement} el
 */
export function drawElement(ctx, el) {
  ctx.save()
  switch (el.type) {
    case 'pen':
    case 'brush':
      drawPen(ctx, el)
      break
    case 'rectangle':
      drawRectangle(ctx, el)
      break
    case 'rounded-rectangle':
      drawRoundedRectangle(ctx, el)
      break
    case 'circle':
      drawCircle(ctx, el)
      break
    case 'diamond':
      drawDiamond(ctx, el)
      break
    case 'triangle':
      drawTriangle(ctx, el)
      break
    case 'right-triangle':
      drawRightTriangle(ctx, el)
      break
    case 'pentagon':
      drawRegularPolygon(ctx, el, 5, -Math.PI / 2)
      break
    case 'hexagon':
      drawHexagon(ctx, el)
      break
    case 'heptagon':
      drawRegularPolygon(ctx, el, 7, -Math.PI / 2)
      break
    case 'octagon':
      drawRegularPolygon(ctx, el, 8, Math.PI / 8)
      break
    case 'trapezoid':
      drawTrapezoid(ctx, el)
      break
    case 'parallelogram':
      drawParallelogram(ctx, el)
      break
    case 'arrow-right':
      drawBlockArrowRight(ctx, el)
      break
    case 'arrow-left':
      drawBlockArrowLeft(ctx, el)
      break
    case 'arrow-up':
      drawBlockArrowUp(ctx, el)
      break
    case 'arrow-down':
      drawBlockArrowDown(ctx, el)
      break
    case 'arrow-four':
      drawFourWayArrow(ctx, el)
      break
    case 'chevron':
      drawChevron(ctx, el)
      break
    case 'star':
      drawStar(ctx, el)
      break
    case 'star-4':
      drawNPointStar(ctx, el, 4, 0.38)
      break
    case 'star-6':
      drawNPointStar(ctx, el, 6, 0.52)
      break
    case 'heart':
      drawHeart(ctx, el)
      break
    case 'lightning':
      drawLightning(ctx, el)
      break
    case 'callout-rect':
      drawCalloutRect(ctx, el)
      break
    case 'callout-oval':
      drawCalloutOval(ctx, el)
      break
    case 'callout-cloud':
      drawCalloutCloud(ctx, el)
      break
    case 'cloud':
      drawCloud(ctx, el)
      break
    case 'line':
      drawLine(ctx, el)
      break
    case 'curve':
      drawCurve(ctx, el)
      break
    case 'arrow':
      drawArrow(ctx, el)
      break
    case 'double-arrow':
      drawDoubleArrow(ctx, el)
      break
    case 'text':
      drawText(ctx, el)
      break
    case 'sticky':
      drawSticky(ctx, el)
      break
    case 'image':
      drawImageElement(ctx, el)
      break
  }
  ctx.restore()
}

/**
 * Simple word-wrap for canvas text rendering.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} maxWidth
 * @returns {string[]}
 */
function wrapText(ctx, text, maxWidth) {
  const paragraphs = text.split('\n')
  const lines = []

  for (const para of paragraphs) {
    const words = para.split(' ')
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }
    lines.push(currentLine)
  }

  return lines
}
