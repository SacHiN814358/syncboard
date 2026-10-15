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
  if (BOX_SHAPES.includes(el.type) || el.type === 'sticky' || el.type === 'image') {
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

  if (el.fillColor && el.fillColor !== 'transparent') {
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
