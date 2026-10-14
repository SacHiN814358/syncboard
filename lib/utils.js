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
