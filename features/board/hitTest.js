/**
 * SyncBoard — Hit Testing
 *
 * Determines which element (if any) is under a given world-space point.
 * Used for selection, erasing, and cursor feedback.
 */

import { distanceBetween, pointInRect } from '@/lib/utils'
import { BOX_SHAPES, LINE_SHAPES } from './elements'

/**
 * Get the axis-aligned bounding box for any element.
 * @param {import('./elements').CanvasElement} el
 * @returns {{x: number, y: number, width: number, height: number} | null}
 */
export function getElementBounds(el) {
  if (BOX_SHAPES.includes(el.type) || el.type === 'sticky' || el.type === 'image') {
    return { x: el.x, y: el.y, width: el.width, height: el.height }
  }

  if (LINE_SHAPES.includes(el.type)) {
    const minX = Math.min(el.x1, el.x2)
    const minY = Math.min(el.y1, el.y2)
    return {
      x: minX,
      y: minY,
      width: Math.max(Math.abs(el.x2 - el.x1), 1),
      height: Math.max(Math.abs(el.y2 - el.y1), 1),
    }
  }

  switch (el.type) {
    case 'pen':
    case 'brush': {
      if (!el.points || el.points.length === 0) return null
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const pt of el.points) {
        if (pt.x < minX) minX = pt.x
        if (pt.y < minY) minY = pt.y
        if (pt.x > maxX) maxX = pt.x
        if (pt.y > maxY) maxY = pt.y
      }
      return {
        x: minX,
        y: minY,
        width: Math.max(maxX - minX, 1),
        height: Math.max(maxY - minY, 1),
      }
    }

    case 'circle':
      return {
        x: el.x - Math.abs(el.radiusX),
        y: el.y - Math.abs(el.radiusY),
        width: Math.abs(el.radiusX) * 2,
        height: Math.abs(el.radiusY) * 2,
      }

    case 'text': {
      const approxWidth = el.text ? el.text.length * el.fontSize * 0.55 : 50
      const lines = el.text ? el.text.split('\n').length : 1
      return {
        x: el.x,
        y: el.y,
        width: approxWidth,
        height: lines * el.fontSize * 1.4,
      }
    }

    default:
      return null
  }
}

/**
 * Test if a world-space point hits an element.
 *
 * @param {number} wx - world x
 * @param {number} wy - world y
 * @param {import('./elements').CanvasElement} el
 * @param {number} [tolerance=8] - hit tolerance in world units
 * @returns {boolean}
 */
export function hitTestElement(wx, wy, el, tolerance = 8) {
  if (
    el.type === 'rectangle' ||
    el.type === 'rounded-rectangle' ||
    el.type === 'sticky' ||
    el.type === 'image'
  ) {
    return hitTestRect(wx, wy, el, tolerance)
  }

  // Exact polygon hit-testing for complex vector shapes
  const poly = getShapePolygon(el)
  if (poly && poly.length >= 3) {
    if (pointInPolygon(wx, wy, poly)) return true
    for (let i = 0; i < poly.length; i++) {
      const next = poly[(i + 1) % poly.length]
      if (distanceToSegment(wx, wy, poly[i].x, poly[i].y, next.x, next.y) <= tolerance) {
        return true
      }
    }
    return false
  }

  if (BOX_SHAPES.includes(el.type)) {
    return hitTestRect(wx, wy, el, tolerance)
  }

  if (LINE_SHAPES.includes(el.type)) {
    return hitTestLine(wx, wy, el.x1, el.y1, el.x2, el.y2, tolerance)
  }

  switch (el.type) {
    case 'pen':
    case 'brush':
      return hitTestPen(wx, wy, el, tolerance)

    case 'circle':
      return hitTestEllipse(wx, wy, el, tolerance)

    case 'text': {
      const bounds = getElementBounds(el)
      if (!bounds) return false
      return pointInRect(
        wx,
        wy,
        bounds.x - tolerance,
        bounds.y - tolerance,
        bounds.width + tolerance * 2,
        bounds.height + tolerance * 2
      )
    }

    default:
      return false
  }
}

/**
 * Generate exact polygon vertices for geometric vector shapes.
 * @param {import('./elements').CanvasElement} el
 * @returns {{x: number, y: number}[] | null}
 */
export function getShapePolygon(el) {
  const { x, y, width: w, height: h } = el
  if (w == null || h == null) return null

  switch (el.type) {
    case 'triangle':
      return [
        { x: x + w / 2, y },
        { x: x + w, y: y + h },
        { x, y: y + h },
      ]

    case 'right-triangle':
      return [
        { x, y },
        { x, y: y + h },
        { x: x + w, y: y + h },
      ]

    case 'diamond':
      return [
        { x: x + w / 2, y },
        { x: x + w, y: y + h / 2 },
        { x: x + w / 2, y: y + h },
        { x, y: y + h / 2 },
      ]

    case 'trapezoid': {
      const inset = w * 0.2
      return [
        { x: x + inset, y },
        { x: x + w - inset, y },
        { x: x + w, y: y + h },
        { x, y: y + h },
      ]
    }

    case 'parallelogram': {
      const skew = w * 0.25
      return [
        { x: x + skew, y },
        { x: x + w, y },
        { x: x + w - skew, y: y + h },
        { x, y: y + h },
      ]
    }

    case 'pentagon':
      return getRegularPolygonVertices(x, y, w, h, 5, -Math.PI / 2)

    case 'hexagon':
      return getRegularPolygonVertices(x, y, w, h, 6, 0)

    case 'heptagon':
      return getRegularPolygonVertices(x, y, w, h, 7, -Math.PI / 2)

    case 'octagon':
      return getRegularPolygonVertices(x, y, w, h, 8, Math.PI / 8)

    case 'star':
      return getStarVertices(x, y, w, h, 5, 0.45)

    case 'star-4':
      return getStarVertices(x, y, w, h, 4, 0.38)

    case 'star-6':
      return getStarVertices(x, y, w, h, 6, 0.52)

    case 'chevron': {
      const indent = w * 0.35
      return [
        { x, y },
        { x: x + w - indent, y },
        { x: x + w, y: y + h / 2 },
        { x: x + w - indent, y: y + h },
        { x, y: y + h },
        { x: x + indent, y: y + h / 2 },
      ]
    }

    case 'arrow-right': {
      const headW = w * 0.45
      const stemH = h * 0.4
      const stemY = y + (h - stemH) / 2
      return [
        { x, y: stemY },
        { x: x + w - headW, y: stemY },
        { x: x + w - headW, y },
        { x: x + w, y: y + h / 2 },
        { x: x + w - headW, y: y + h },
        { x: x + w - headW, y: stemY + stemH },
        { x, y: stemY + stemH },
      ]
    }

    case 'arrow-left': {
      const headW = w * 0.45
      const stemH = h * 0.4
      const stemY = y + (h - stemH) / 2
      return [
        { x: x + w, y: stemY },
        { x: x + headW, y: stemY },
        { x: x + headW, y },
        { x, y: y + h / 2 },
        { x: x + headW, y: y + h },
        { x: x + headW, y: stemY + stemH },
        { x: x + w, y: stemY + stemH },
      ]
    }

    case 'arrow-up': {
      const headH = h * 0.45
      const stemW = w * 0.4
      const stemX = x + (w - stemW) / 2
      return [
        { x: stemX, y: y + h },
        { x: stemX, y: y + headH },
        { x, y: y + headH },
        { x: x + w / 2, y },
        { x: x + w, y: y + headH },
        { x: stemX + stemW, y: y + headH },
        { x: stemX + stemW, y: y + h },
      ]
    }

    case 'arrow-down': {
      const headH = h * 0.45
      const stemW = w * 0.4
      const stemX = x + (w - stemW) / 2
      return [
        { x: stemX, y },
        { x: stemX, y: y + h - headH },
        { x, y: y + h - headH },
        { x: x + w / 2, y: y + h },
        { x: x + w, y: y + h - headH },
        { x: stemX + stemW, y: y + h - headH },
        { x: stemX + stemW, y },
      ]
    }

    default:
      return null
  }
}

function getRegularPolygonVertices(x, y, w, h, sides, startAngle = -Math.PI / 2) {
  const cx = x + w / 2
  const cy = y + h / 2
  const rx = Math.abs(w) / 2
  const ry = Math.abs(h) / 2
  const pts = []
  for (let i = 0; i < sides; i++) {
    const angle = startAngle + (i * 2 * Math.PI) / sides
    pts.push({ x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) })
  }
  return pts
}

function getStarVertices(x, y, w, h, points, innerRatio = 0.45) {
  const cx = x + w / 2
  const cy = y + h / 2
  const rx = Math.abs(w) / 2
  const ry = Math.abs(h) / 2
  const step = Math.PI / points
  const pts = []
  for (let i = 0; i < 2 * points; i++) {
    const rX = i % 2 === 0 ? rx : rx * innerRatio
    const rY = i % 2 === 0 ? ry : ry * innerRatio
    const angle = i * step - Math.PI / 2
    pts.push({ x: cx + rX * Math.cos(angle), y: cy + rY * Math.sin(angle) })
  }
  return pts
}

/**
 * Find the topmost element at a point (iterates from end = top).
 *
 * @param {number} wx
 * @param {number} wy
 * @param {import('./elements').CanvasElement[]} elements
 * @param {number} [tolerance=8]
 * @returns {import('./elements').CanvasElement | null}
 */
export function findElementAtPoint(wx, wy, elements, tolerance = 8) {
  // Iterate from top to bottom (last drawn = topmost)
  for (let i = elements.length - 1; i >= 0; i--) {
    if (hitTestElement(wx, wy, elements[i], tolerance)) {
      return elements[i]
    }
  }
  return null
}

// --- Internal hit-test helpers ---

function pointInPolygon(px, py, points) {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x, yi = points[i].y
    const xj = points[j].x, yj = points[j].y
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function hitTestPen(wx, wy, el, tolerance) {
  if (!el.points || el.points.length < 2) return false

  // If points form a closed or enclosed loop, clicking inside it hits the pen!
  if (el.points.length >= 3) {
    if (pointInPolygon(wx, wy, el.points)) return true
  }

  // Check distance to each segment
  for (let i = 0; i < el.points.length - 1; i++) {
    const d = distanceToSegment(
      wx, wy,
      el.points[i].x, el.points[i].y,
      el.points[i + 1].x, el.points[i + 1].y
    )
    if (d <= tolerance + (el.strokeWidth || 2) / 2) return true
  }
  return false
}

function hitTestRect(wx, wy, el, tolerance) {
  const minX = Math.min(el.x, el.x + el.width)
  const minY = Math.min(el.y, el.y + el.height)
  const w = Math.abs(el.width)
  const h = Math.abs(el.height)

  return pointInRect(wx, wy, minX - tolerance, minY - tolerance, w + tolerance * 2, h + tolerance * 2)
}

function hitTestEllipse(wx, wy, el, tolerance) {
  const rx = Math.abs(el.radiusX) + tolerance
  const ry = Math.abs(el.radiusY) + tolerance
  if (rx === 0 || ry === 0) return false

  const dx = wx - el.x
  const dy = wy - el.y
  const normalized = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)

  return normalized <= 1
}

function hitTestLine(wx, wy, x1, y1, x2, y2, tolerance) {
  return distanceToSegment(wx, wy, x1, y1, x2, y2) <= tolerance
}

/**
 * Minimum distance from point (px, py) to line segment (x1,y1)-(x2,y2).
 */
function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const lenSq = dx * dx + dy * dy

  if (lenSq === 0) return distanceBetween(px, py, x1, y1)

  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))

  const projX = x1 + t * dx
  const projY = y1 + t * dy

  return distanceBetween(px, py, projX, projY)
}

/**
 * Check if a world-space point is on a resize handle of the given bounds.
 * @param {number} wx
 * @param {number} wy
 * @param {{ x: number, y: number, width: number, height: number }} bounds
 * @param {number} tolerance
 * @returns {'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w' | null}
 */
export function getResizeHandleAtPoint(wx, wy, bounds, tolerance = 10) {
  if (!bounds) return null

  const pad = 4
  const bx = bounds.x - pad
  const by = bounds.y - pad
  const bw = bounds.width + pad * 2
  const bh = bounds.height + pad * 2

  const handles = [
    { name: 'nw', x: bx, y: by },
    { name: 'ne', x: bx + bw, y: by },
    { name: 'se', x: bx + bw, y: by + bh },
    { name: 'sw', x: bx, y: by + bh },
    { name: 'n', x: bx + bw / 2, y: by },
    { name: 's', x: bx + bw / 2, y: by + bh },
    { name: 'w', x: bx, y: by + bh / 2 },
    { name: 'e', x: bx + bw, y: by + bh / 2 },
  ]

  for (const h of handles) {
    if (distanceBetween(wx, wy, h.x, h.y) <= tolerance) {
      return h.name
    }
  }

  return null
}

/**
 * Get CSS cursor string for a resize handle.
 * @param {'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'} handle
 * @returns {string}
 */
export function getCursorForHandle(handle) {
  switch (handle) {
    case 'nw':
    case 'se':
      return 'nwse-resize'
    case 'ne':
    case 'sw':
      return 'nesw-resize'
    case 'n':
    case 's':
      return 'ns-resize'
    case 'e':
    case 'w':
      return 'ew-resize'
    default:
      return 'default'
  }
}

/**
 * Returns the 4 magnetic anchor connection points for an element:
 * top, right, bottom, left.
 *
 * @param {import('./elements').CanvasElement} el
 * @returns {{anchor: 'top'|'right'|'bottom'|'left', x: number, y: number}[]}
 */
export function getElementAnchors(el) {
  const b = getElementBounds(el)
  if (!b) return []

  return [
    { anchor: 'top', x: b.x + b.width / 2, y: b.y },
    { anchor: 'right', x: b.x + b.width, y: b.y + b.height / 2 },
    { anchor: 'bottom', x: b.x + b.width / 2, y: b.y + b.height },
    { anchor: 'left', x: b.x, y: b.y + b.height / 2 },
  ]
}

/**
 * Returns specific anchor point coordinates for an element.
 *
 * @param {import('./elements').CanvasElement} el
 * @param {'top'|'right'|'bottom'|'left'} anchor
 * @returns {{x: number, y: number} | null}
 */
export function getAnchorCoordinates(el, anchor) {
  const anchors = getElementAnchors(el)
  const found = anchors.find((a) => a.anchor === anchor)
  return found ? { x: found.x, y: found.y } : null
}

/**
 * Find the closest anchor point across all elements within snapRadius.
 *
 * @param {number} wx - World X
 * @param {number} wy - World Y
 * @param {import('./elements').CanvasElement[]} elements
 * @param {string} [excludeId]
 * @param {number} [snapRadius=24]
 * @returns {{elementId: string, anchor: 'top'|'right'|'bottom'|'left', x: number, y: number, distance: number} | null}
 */
export function findNearestAnchor(wx, wy, elements, excludeId = null, snapRadius = 24) {
  let closest = null
  let minDistance = snapRadius

  for (const el of elements) {
    if (
      el.id === excludeId ||
      LINE_SHAPES.includes(el.type) ||
      el.type === 'pen' ||
      el.type === 'brush'
    ) {
      continue
    }

    const anchors = getElementAnchors(el)
    for (const a of anchors) {
      const d = distanceBetween(wx, wy, a.x, a.y)
      if (d < minDistance) {
        minDistance = d
        closest = {
          elementId: el.id,
          anchor: a.anchor,
          x: a.x,
          y: a.y,
          distance: d,
        }
      }
    }
  }

  return closest
}
