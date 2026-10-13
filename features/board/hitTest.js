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
  if (BOX_SHAPES.includes(el.type) || el.type === 'sticky') {
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
  if (BOX_SHAPES.includes(el.type) || el.type === 'sticky') {
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

function hitTestPen(wx, wy, el, tolerance) {
  if (!el.points || el.points.length < 2) return false

  // Check distance to each segment
  for (let i = 0; i < el.points.length - 1; i++) {
    const d = distanceToSegment(
      wx, wy,
      el.points[i].x, el.points[i].y,
      el.points[i + 1].x, el.points[i + 1].y
    )
    if (d <= tolerance + el.strokeWidth / 2) return true
  }
  return false
}

function hitTestRect(wx, wy, el, tolerance) {
  // Check if inside the fill area or near the stroke
  const inside = pointInRect(wx, wy, el.x, el.y, el.width, el.height)
  if (el.fillColor && el.fillColor !== 'transparent' && inside) return true

  // Check proximity to edges
  const nearTop = Math.abs(wy - el.y) <= tolerance && wx >= el.x - tolerance && wx <= el.x + el.width + tolerance
  const nearBottom = Math.abs(wy - (el.y + el.height)) <= tolerance && wx >= el.x - tolerance && wx <= el.x + el.width + tolerance
  const nearLeft = Math.abs(wx - el.x) <= tolerance && wy >= el.y - tolerance && wy <= el.y + el.height + tolerance
  const nearRight = Math.abs(wx - (el.x + el.width)) <= tolerance && wy >= el.y - tolerance && wy <= el.y + el.height + tolerance

  return nearTop || nearBottom || nearLeft || nearRight || inside
}

function hitTestEllipse(wx, wy, el, tolerance) {
  const rx = Math.abs(el.radiusX) + tolerance
  const ry = Math.abs(el.radiusY) + tolerance
  if (rx === 0 || ry === 0) return false

  const dx = wx - el.x
  const dy = wy - el.y
  const normalized = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)

  if (el.fillColor && el.fillColor !== 'transparent') {
    return normalized <= 1
  }

  // Only stroke — check if near the boundary
  const rxInner = Math.max(0, Math.abs(el.radiusX) - tolerance)
  const ryInner = Math.max(0, Math.abs(el.radiusY) - tolerance)
  const normalizedInner = rxInner > 0 && ryInner > 0
    ? (dx * dx) / (rxInner * rxInner) + (dy * dy) / (ryInner * ryInner)
    : 0

  return normalized <= 1 && normalizedInner >= 1
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
