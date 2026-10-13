/**
 * SyncBoard — Coordinate Transform & Viewport Math
 *
 * Handles the mapping between screen coordinates (pixel positions from
 * pointer events) and world coordinates (the infinite canvas space where
 * elements live).
 *
 * Transform model:
 *   screenX = worldX * zoom + panX
 *   screenY = worldY * zoom + panY
 *
 * Inverse:
 *   worldX = (screenX - panX) / zoom
 *   worldY = (screenY - panY) / zoom
 */

import { clamp } from '@/lib/utils'
import { MIN_ZOOM, MAX_ZOOM } from './elements'

/**
 * Convert screen (pixel) coordinates to world (canvas) coordinates.
 * @param {number} screenX
 * @param {number} screenY
 * @param {{panX: number, panY: number, zoom: number}} viewport
 * @returns {{x: number, y: number}}
 */
export function screenToWorld(screenX, screenY, viewport) {
  return {
    x: (screenX - viewport.panX) / viewport.zoom,
    y: (screenY - viewport.panY) / viewport.zoom,
  }
}

/**
 * Convert world coordinates to screen coordinates.
 * @param {number} worldX
 * @param {number} worldY
 * @param {{panX: number, panY: number, zoom: number}} viewport
 * @returns {{x: number, y: number}}
 */
export function worldToScreen(worldX, worldY, viewport) {
  return {
    x: worldX * viewport.zoom + viewport.panX,
    y: worldY * viewport.zoom + viewport.panY,
  }
}

/**
 * Apply a zoom delta centered on a specific screen point.
 * This ensures the point under the cursor stays fixed during zoom.
 *
 * @param {{panX: number, panY: number, zoom: number}} viewport
 * @param {number} delta - positive = zoom in, negative = zoom out
 * @param {number} cursorScreenX
 * @param {number} cursorScreenY
 * @returns {{panX: number, panY: number, zoom: number}}
 */
export function zoomAtPoint(viewport, delta, cursorScreenX, cursorScreenY) {
  const oldZoom = viewport.zoom
  const newZoom = clamp(oldZoom * (1 + delta), MIN_ZOOM, MAX_ZOOM)

  // Keep the world point under the cursor fixed:
  // worldPoint = (screen - pan) / zoom  (must be equal before and after)
  // newPan = screen - worldPoint * newZoom
  const worldX = (cursorScreenX - viewport.panX) / oldZoom
  const worldY = (cursorScreenY - viewport.panY) / oldZoom

  return {
    panX: cursorScreenX - worldX * newZoom,
    panY: cursorScreenY - worldY * newZoom,
    zoom: newZoom,
  }
}

/**
 * Apply the current viewport transform to a Canvas 2D context.
 * Call this at the start of each render frame before drawing elements.
 * Incorporates DPR so world coordinates match CSS screen pixels exactly.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{panX: number, panY: number, zoom: number}} viewport
 * @param {number} [dpr=1] - device pixel ratio
 */
export function applyViewportTransform(ctx, viewport, dpr = 1) {
  ctx.setTransform(
    viewport.zoom * dpr,
    0,
    0,
    viewport.zoom * dpr,
    viewport.panX * dpr,
    viewport.panY * dpr
  )
}

/**
 * Reset context transform to identity (for HUD / screen-space drawing).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} dpr - device pixel ratio
 */
export function resetTransform(ctx, dpr) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}
