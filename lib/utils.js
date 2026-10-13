import { nanoid } from 'nanoid'

export function generateId() {
  return nanoid(12)
}

/**
 * Generates an easy-to-read 6-character room code (e.g., 'K9P2X4').
 * Omits ambiguous characters like 0/O and 1/I.
 */
export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function lerp(a, b, t) {
  return a + (b - a) * t
}

export function distanceBetween(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

export function pointInRect(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh
}
