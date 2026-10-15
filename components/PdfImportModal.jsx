'use client'

import { useState, useRef } from 'react'
import {
  FileText,
  Upload,
  X,
  Check,
  Columns,
  Rows,
  Sparkles,
  Loader2,
  FileCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { generateId } from '@/lib/utils'
import { loadPdfDocument, renderPdfPages } from '@/lib/pdfLoader'

/**
 * Interactive PDF Import & Annotation Modal
 *
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onImportElements: (newElements: import('@/features/board/elements').CanvasElement[]) => void,
 *   viewport: { panX: number, panY: number, zoom: number },
 * }} props
 */
export default function PdfImportModal({
  isOpen,
  onClose,
  onImportElements,
  viewport,
}) {
  const [file, setFile] = useState(null)
  const [pdfDoc, setPdfDoc] = useState(null)
  const [numPages, setNumPages] = useState(0)
  const [selectedPages, setSelectedPages] = useState([])
  const [layout, setLayout] = useState('vertical') // 'vertical' | 'horizontal' | 'grid'
  const [scale, setScale] = useState(2.0) // 2x Retina scale
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  if (!isOpen) return null

  // Handle PDF file selection
  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile) return
    if (!selectedFile.name.toLowerCase().endsWith('.pdf') && selectedFile.type !== 'application/pdf') {
      toast.error('Please upload a valid .pdf file')
      return
    }

    try {
      setIsProcessing(true)
      setProgress({ current: 1, total: 1, percent: 20 })
      const { pdf, numPages: count } = await loadPdfDocument(selectedFile)

      setFile(selectedFile)
      setPdfDoc(pdf)
      setNumPages(count)
      // Default to selecting all pages
      setSelectedPages(Array.from({ length: count }, (_, i) => i + 1))
      setIsProcessing(false)
    } catch (err) {
      console.error('Failed to load PDF:', err)
      toast.error('Could not parse PDF. Please try another file.')
      setIsProcessing(false)
    }
  }

  // Toggle page selection
  const togglePage = (pageNum) => {
    setSelectedPages((prev) =>
      prev.includes(pageNum) ? prev.filter((p) => p !== pageNum) : [...prev, pageNum].sort((a, b) => a - b)
    )
  }

  const selectAllPages = () => {
    setSelectedPages(Array.from({ length: numPages }, (_, i) => i + 1))
  }

  const deselectAllPages = () => {
    setSelectedPages([])
  }

  // Execute PDF render and import onto board
  const handleImport = async () => {
    if (!pdfDoc || selectedPages.length === 0) return

    try {
      setIsProcessing(true)

      const renderedPages = await renderPdfPages(
        pdfDoc,
        selectedPages,
        scale,
        (prog) => setProgress(prog)
      )

      // Calculate start coordinate centered in user's current viewport
      const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200
      const screenH = typeof window !== 'undefined' ? window.innerHeight : 800
      const startX = Math.round((-viewport.panX + screenW / 2) / viewport.zoom)
      const startY = Math.round((-viewport.panY + screenH / 2) / viewport.zoom)

      const elementsToInsert = []
      const gap = 36 // Space between pages

      renderedPages.forEach((page, idx) => {
        let posX = startX - page.width / 2
        let posY = startY - page.height / 2

        if (layout === 'vertical') {
          // Stacked vertically like reading a long document
          let accumulatedHeight = 0
          for (let j = 0; j < idx; j++) {
            accumulatedHeight += renderedPages[j].height + gap
          }
          posY = startY + accumulatedHeight
        } else if (layout === 'horizontal') {
          // Arranged horizontally like slides in a presentation
          let accumulatedWidth = 0
          for (let j = 0; j < idx; j++) {
            accumulatedWidth += renderedPages[j].width + gap
          }
          posX = startX + accumulatedWidth
        } else if (layout === 'grid') {
          // 2-column grid
          const col = idx % 2
          const row = Math.floor(idx / 2)
          posX = startX + col * (page.width + gap) - page.width / 2
          posY = startY + row * (page.height + gap)
        }

        elementsToInsert.push({
          id: generateId(),
          type: 'image',
          x: Math.round(posX),
          y: Math.round(posY),
          width: page.width,
          height: page.height,
          src: page.dataUrl,
          aspectRatio: page.width / page.height,
          isPdfPage: true,
          pageNumber: page.pageNumber,
          totalPages: numPages,
          fileName: file?.name || 'Document.pdf',
        })
      })

      onImportElements(elementsToInsert)
      toast.success(
        `Imported ${elementsToInsert.length} PDF ${elementsToInsert.length === 1 ? 'page' : 'pages'}! 📄`,
        { id: 'pdf-import', duration: 3000 }
      )
      handleClose()
    } catch (err) {
      console.error('Failed to render PDF pages:', err)
      toast.error('Failed to import PDF pages onto board')
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setPdfDoc(null)
    setNumPages(0)
    setSelectedPages([])
    setIsProcessing(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#dee2e6] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#f1f3f5] flex items-center justify-between bg-gradient-to-r from-red-50/50 via-white to-blue-50/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center border border-red-200 shadow-2xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#212529] flex items-center gap-1.5">
                <span>Import & Annotate PDF</span>
                <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 font-semibold">
                  Multi-Page
                </span>
              </h2>
              <p className="text-[11px] text-[#868e96]">
                Upload slides or documents to draw, highlight, and write notes together
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-lg text-[#868e96] hover:text-[#212529] hover:bg-[#f1f3f5] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {!file ? (
            /* Upload Dropzone */
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                const droppedFile = e.dataTransfer.files?.[0]
                if (droppedFile) handleFileSelect(droppedFile)
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[#1971c2] bg-[#e7f5ff]'
                  : 'border-[#dee2e6] hover:border-[#1971c2] hover:bg-[#f8f9fa]'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 mb-3 shadow-xs">
                <Upload className="w-6 h-6" />
              </div>
              <p className="font-bold text-sm text-[#212529] mb-1">
                Click to browse or drop your PDF here
              </p>
              <p className="text-[11px] text-[#868e96] max-w-xs">
                Supports presentation slide decks, worksheets, diagrams, homework, and reports
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const selected = e.target.files?.[0]
                  if (selected) handleFileSelect(selected)
                }}
              />
            </div>
          ) : (
            /* File Loaded & Page Selection */
            <div className="space-y-4">
              {/* File Info Bar */}
              <div className="p-3 rounded-xl bg-[#f8f9fa] border border-[#e9ecef] flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-[#212529] truncate">{file.name}</p>
                    <p className="text-[10px] text-[#868e96]">
                      {(file.size / (1024 * 1024)).toFixed(1)} MB • {numPages} {numPages === 1 ? 'Page' : 'Pages'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null)
                    setPdfDoc(null)
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold text-[#868e96] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  Change
                </button>
              </div>

              {/* Page Selection Controls */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-[#343a40]">
                    Select Pages to Import ({selectedPages.length}/{numPages})
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={selectAllPages}
                      className="text-[#1971c2] hover:underline font-semibold cursor-pointer"
                    >
                      All
                    </button>
                    <span className="text-[#adb5bd]">•</span>
                    <button
                      type="button"
                      onClick={deselectAllPages}
                      className="text-[#868e96] hover:underline font-semibold cursor-pointer"
                    >
                      None
                    </button>
                  </div>
                </div>

                {/* Page Pill Grid */}
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-40 overflow-y-auto p-1 bg-[#f8f9fa] rounded-xl border border-[#e9ecef]">
                  {Array.from({ length: numPages }, (_, i) => i + 1).map((pNum) => {
                    const isSelected = selectedPages.includes(pNum)
                    return (
                      <button
                        key={pNum}
                        type="button"
                        onClick={() => togglePage(pNum)}
                        className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-[#1971c2] text-white shadow-xs'
                            : 'bg-white text-[#495057] hover:bg-[#f1f3f5] border border-[#dee2e6]'
                        }`}
                      >
                        <span>p. {pNum}</span>
                        {isSelected && <Check className="w-2.5 h-2.5 mt-0.5" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Layout Arrangement Options */}
              <div>
                <label className="block font-bold text-xs text-[#343a40] mb-1.5">
                  Board Layout Arrangement
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setLayout('vertical')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      layout === 'vertical'
                        ? 'border-[#1971c2] bg-[#e7f5ff] text-[#1971c2] font-bold shadow-xs'
                        : 'border-[#dee2e6] hover:bg-[#f8f9fa] text-[#495057]'
                    }`}
                  >
                    <Rows className="w-4 h-4" />
                    <span className="text-[11px]">Vertical Stack</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayout('horizontal')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      layout === 'horizontal'
                        ? 'border-[#1971c2] bg-[#e7f5ff] text-[#1971c2] font-bold shadow-xs'
                        : 'border-[#dee2e6] hover:bg-[#f8f9fa] text-[#495057]'
                    }`}
                  >
                    <Columns className="w-4 h-4" />
                    <span className="text-[11px]">Slide Deck (H)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayout('grid')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      layout === 'grid'
                        ? 'border-[#1971c2] bg-[#e7f5ff] text-[#1971c2] font-bold shadow-xs'
                        : 'border-[#dee2e6] hover:bg-[#f8f9fa] text-[#495057]'
                    }`}
                  >
                    <div className="grid grid-cols-2 gap-0.5">
                      <div className="w-2 h-2 rounded-xs bg-current" />
                      <div className="w-2 h-2 rounded-xs bg-current" />
                      <div className="w-2 h-2 rounded-xs bg-current" />
                      <div className="w-2 h-2 rounded-xs bg-current" />
                    </div>
                    <span className="text-[11px]">2-Col Grid</span>
                  </button>
                </div>
              </div>

              {/* Resolution Setting */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#f8f9fa] border border-[#e9ecef]">
                <div>
                  <span className="font-bold text-xs text-[#212529] flex items-center gap-1">
                    <span>Rendering Clarity</span>
                    <Sparkles className="w-3 h-3 text-amber-500" />
                  </span>
                  <span className="text-[10px] text-[#868e96] block">
                    High definition enables crystal clear reading when zoomed in
                  </span>
                </div>
                <div className="flex items-center gap-1 p-0.5 bg-white rounded-lg border border-[#dee2e6]">
                  <button
                    type="button"
                    onClick={() => setScale(1.5)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer ${
                      scale === 1.5 ? 'bg-[#1971c2] text-white' : 'text-[#868e96]'
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => setScale(2.0)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer ${
                      scale === 2.0 ? 'bg-[#1971c2] text-white' : 'text-[#868e96]'
                    }`}
                  >
                    2x Retina
                  </button>
                </div>
              </div>

              {/* Progress Indicator */}
              {isProcessing && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 space-y-2">
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Rendering page {progress.current} of {progress.total}...</span>
                    </span>
                    <span>{progress.percent}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-blue-200 overflow-hidden">
                    <div
                      className="h-full bg-[#1971c2] transition-all duration-200"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#f1f3f5] bg-[#f8f9fa] flex items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessing}
            className="px-3.5 py-1.5 rounded-xl border border-[#dee2e6] text-[#495057] font-semibold text-xs hover:bg-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!file || selectedPages.length === 0 || isProcessing}
            className="px-4 py-1.5 rounded-xl bg-[#1971c2] hover:bg-[#1864ab] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5" />
                <span>Import {selectedPages.length} {selectedPages.length === 1 ? 'Page' : 'Pages'} to Board</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
