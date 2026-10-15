/**
 * SyncBoard — PDF.js Dynamic Loader and Page Renderer
 *
 * Loads Mozilla's PDF.js dynamically in the browser without bundling overhead,
 * and renders PDF pages into high-resolution canvas image elements for live whiteboard annotation.
 */

let pdfjsPromise = null

/**
 * Dynamically load PDF.js and its web worker.
 * @returns {Promise<any>}
 */
export async function getPdfJs() {
  if (typeof window === 'undefined') return null
  if (window.pdfjsLib) return window.pdfjsLib

  if (pdfjsPromise) return pdfjsPromise

  pdfjsPromise = new Promise((resolve, reject) => {
    // If script tag already exists in DOM
    const existing = document.getElementById('syncboard-pdfjs-script')
    if (existing) {
      if (window.pdfjsLib) {
        resolve(window.pdfjsLib)
        return
      }
      existing.addEventListener('load', () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        resolve(window.pdfjsLib)
      })
      existing.addEventListener('error', (err) => reject(new Error('Failed to load PDF.js script')))
      return
    }

    const script = document.createElement('script')
    script.id = 'syncboard-pdfjs-script'
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.async = true
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        resolve(window.pdfjsLib)
      } else {
        reject(new Error('PDF.js failed to initialize'))
      }
    }
    script.onerror = () => {
      pdfjsPromise = null
      reject(new Error('Failed to download PDF.js library'))
    }
    document.head.appendChild(script)
  })

  return pdfjsPromise
}

/**
 * Load a PDF file and return the document object and page count.
 * @param {File | Blob | ArrayBuffer} file
 * @returns {Promise<{ pdf: any, numPages: number }>}
 */
export async function loadPdfDocument(file) {
  const pdfjs = await getPdfJs()
  if (!pdfjs) throw new Error('PDF.js not available')

  let data
  if (file instanceof ArrayBuffer) {
    data = file
  } else if (file instanceof Blob || (typeof File !== 'undefined' && file instanceof File)) {
    data = await file.arrayBuffer()
  } else {
    throw new Error('Unsupported file format for PDF')
  }

  const loadingTask = pdfjs.getDocument({ data })
  const pdf = await loadingTask.promise
  return { pdf, numPages: pdf.numPages }
}

/**
 * Render a single PDF page to a PNG data URL.
 * @param {any} pdf
 * @param {number} pageNumber (1-indexed)
 * @param {number} scale (default 2.0 for Retina sharpness)
 * @returns {Promise<{ pageNumber: number, width: number, height: number, dataUrl: string }>}
 */
export async function renderPdfPage(pdf, pageNumber, scale = 2.0) {
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')

  // White paper background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, viewport.width, viewport.height)

  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise

  const dataUrl = canvas.toDataURL('image/png', 0.92)

  return {
    pageNumber,
    // Dimensions in display CSS / world pixels
    width: Math.round(viewport.width / scale),
    height: Math.round(viewport.height / scale),
    dataUrl,
  }
}

/**
 * Render multiple or all PDF pages in sequence with progress reporting.
 * @param {any} pdf
 * @param {number[]} pageNumbers
 * @param {number} scale
 * @param {(progress: { current: number, total: number, percent: number }) => void} onProgress
 * @returns {Promise<Array<{ pageNumber: number, width: number, height: number, dataUrl: string }>>}
 */
export async function renderPdfPages(pdf, pageNumbers, scale = 2.0, onProgress = null) {
  const results = []
  const total = pageNumbers.length

  for (let i = 0; i < total; i++) {
    const pageNum = pageNumbers[i]
    onProgress?.({
      current: i + 1,
      total,
      percent: Math.round(((i + 1) / total) * 100),
    })

    const pageData = await renderPdfPage(pdf, pageNum, scale)
    results.push(pageData)
  }

  return results
}
