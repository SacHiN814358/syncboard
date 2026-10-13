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

/**
 * Draw a sticky note.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./elements').StickyElement} el
 */
export function drawSticky(ctx, el) {
  const r = 4

  // Shadow
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.08)'
  ctx.shadowBlur = 8
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 2

  // Background
  ctx.fillStyle = el.bgColor || '#fff3bf'
  ctx.beginPath()
  ctx.roundRect(el.x, el.y, el.width, el.height, r)
  ctx.fill()
  ctx.restore()

  // Border
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(el.x, el.y, el.width, el.height, r)
  ctx.stroke()

  // Text
  if (el.text) {
    ctx.fillStyle = '#1e1e1e'
    ctx.font = '14px Inter, system-ui, -apple-system, sans-serif'
    ctx.textBaseline = 'top'

    const padding = 12
    const maxWidth = el.width - padding * 2
    const lines = wrapText(ctx, el.text, maxWidth)
    const lineHeight = 18

    for (let i = 0; i < lines.length; i++) {
      const textY = el.y + padding + i * lineHeight
      if (textY + lineHeight > el.y + el.height - padding) break
      ctx.fillText(lines[i], el.x + padding, textY)
    }
  }
}

/**
 * Draw selection indicator around an element.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x: number, y: number, width: number, height: number}} bounds
 */
export function drawSelectionBox(ctx, bounds) {
  const pad = 4
  ctx.strokeStyle = '#1971c2'
  ctx.lineWidth = 1.5
  ctx.setLineDash([])
  ctx.strokeRect(
    bounds.x - pad,
    bounds.y - pad,
    bounds.width + pad * 2,
    bounds.height + pad * 2
  )

  // Corner handles
  const handleSize = 6
  ctx.fillStyle = '#ffffff'
  const corners = [
    [bounds.x - pad, bounds.y - pad],
    [bounds.x + bounds.width + pad, bounds.y - pad],
    [bounds.x - pad, bounds.y + bounds.height + pad],
    [bounds.x + bounds.width + pad, bounds.y + bounds.height + pad],
  ]

  for (const [cx, cy] of corners) {
    ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize)
    ctx.strokeRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize)
  }
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
    case 'circle':
      drawCircle(ctx, el)
      break
    case 'diamond':
      drawDiamond(ctx, el)
      break
    case 'triangle':
      drawTriangle(ctx, el)
      break
    case 'star':
      drawStar(ctx, el)
      break
    case 'heart':
      drawHeart(ctx, el)
      break
    case 'hexagon':
      drawHexagon(ctx, el)
      break
    case 'cloud':
      drawCloud(ctx, el)
      break
    case 'line':
      drawLine(ctx, el)
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
