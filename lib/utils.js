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

/**
 * Generates an 8-character deterministic Editor Key from roomId and a secret salt.
 * Ensures the Editor Link (?key=...) cannot be guessed or forged by viewers
 * who only have the standard room code or viewer link.
 */
export function getDeterministicEditKey(roomId) {
  if (!roomId) return 'EDITKEY1'
  const clean = roomId.trim().toUpperCase()
  const salt = 'sb_v2_editor_secret_salt_9281'
  let h1 = 0x811c9dc5
  let h2 = 0xcbf29ce4
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i)
    h1 = Math.imul(h1 ^ code, 16777619)
    h2 = Math.imul(h2 ^ code, 1099511628)
  }
  for (let i = 0; i < salt.length; i++) {
    const code = salt.charCodeAt(i)
    h1 = Math.imul(h1 ^ code, 16777619)
    h2 = Math.imul(h2 ^ code, 1099511628)
  }
  const s1 = (h1 >>> 0).toString(36).toUpperCase()
  const s2 = (h2 >>> 0).toString(36).toUpperCase()
  const combined = (s1 + s2 + 'ABCDEFGH').replace(/[^A-Z0-9]/g, '')
  return combined.slice(0, 8)
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

/**
 * Reads an image File, downscales if larger than maxDim, and returns compressed webp dataURL.
 *
 * @param {File} file
 * @param {number} [maxDim=1200]
 * @returns {Promise<{src: string, width: number, height: number, aspectRatio: number}>}
 */
export function processImageFile(file, maxDim = 1200) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Invalid image file'))
    }

    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const rawDataUrl = e.target.result
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const origW = img.naturalWidth || 600
        const origH = img.naturalHeight || 400
        let targetW = origW
        let targetH = origH

        if (origW > maxDim || origH > maxDim) {
          if (origW > origH) {
            targetW = maxDim
            targetH = Math.round((origH * maxDim) / origW)
          } else {
            targetH = maxDim
            targetW = Math.round((origW * maxDim) / origH)
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = targetW
        canvas.height = targetH
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, targetW, targetH)
        const compressedDataUrl = canvas.toDataURL('image/webp', 0.85)

        resolve({
          src: compressedDataUrl,
          width: targetW,
          height: targetH,
          aspectRatio: origW / origH,
        })
      }
      img.src = rawDataUrl
    }
    reader.readAsDataURL(file)
  })
}
