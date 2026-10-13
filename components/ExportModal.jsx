'use client'

import { useState } from 'react'
import { X, Download, FileImage, Code2, FileCode, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { getElementBounds } from '@/features/board/hitTest'
import { drawElement } from '@/features/board/renderer'

/**
 * Export modal for PNG, SVG, and JSON backup.
 *
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   elements: import('@/features/board/elements').CanvasElement[],
 *   boardTitle: string,
 * }} props
 */
export default function ExportModal({ isOpen, onClose, elements, boardTitle }) {
  const [exporting, setExporting] = useState(false)

  if (!isOpen) return null

  // 1. Export as High-Resolution PNG
  const handleExportPNG = async () => {
    if (elements.length === 0) {
      toast.error('Board is empty — nothing to export!')
      return
    }

    setExporting(true)
    try {
      // Calculate bounding box of all elements
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const el of elements) {
        const b = getElementBounds(el)
        if (b) {
          minX = Math.min(minX, b.x)
          minY = Math.min(minY, b.y)
          maxX = Math.max(maxX, b.x + b.width)
          maxY = Math.max(maxY, b.y + b.height)
        }
      }

      const padding = 60
      const width = Math.max(400, maxX - minX + padding * 2)
      const height = Math.max(300, maxY - minY + padding * 2)

      const offscreen = document.createElement('canvas')
      const scale = 2 // 2x Retina resolution
      offscreen.width = width * scale
      offscreen.height = height * scale
      const ctx = offscreen.getContext('2d')

      // White background
      ctx.scale(scale, scale)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)

      // Translate context so elements fit nicely with padding
      ctx.translate(-minX + padding, -minY + padding)

      // Draw all elements
      for (const el of elements) {
        drawElement(ctx, el)
      }

      // Download trigger
      const dataUrl = offscreen.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `${boardTitle.toLowerCase().replace(/\s+/g, '-')}-export.png`
      link.href = dataUrl
      link.click()

      toast.success('Board exported as high-res PNG! 📸')
      onClose()
    } catch (_) {
      toast.error('Failed to export image')
    } finally {
      setExporting(false)
    }
  }

  // 2. Export as JSON backup
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(elements, null, 2))
    const link = document.createElement('a')
    link.download = `${boardTitle.toLowerCase().replace(/\s+/g, '-')}-backup.json`
    link.href = dataStr
    link.click()
    toast.success('Board exported as JSON backup! 💾')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-[#e9ecef] shadow-2xl overflow-hidden select-none">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e9ecef]">
          <div>
            <h3 className="text-sm font-bold text-[#212529]">Export Board</h3>
            <p className="text-xs text-[#868e96]">Download your whiteboard artwork or backup data</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#868e96] hover:text-[#212529] hover:bg-[#f1f3f5]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Export Options */}
        <div className="p-5 space-y-3">
          {/* PNG Export */}
          <button
            onClick={handleExportPNG}
            disabled={exporting}
            className="w-full p-3.5 rounded-xl border border-[#e9ecef] hover:border-[#1971c2] hover:bg-[#e7f5ff]/30 text-left transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#e7f5ff] text-[#1971c2] flex items-center justify-center">
                <FileImage className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#212529] group-hover:text-[#1971c2]">
                  High-Resolution PNG
                </div>
                <div className="text-[11px] text-[#868e96]">
                  2x Retina image with white background
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-[#868e96] group-hover:text-[#1971c2]" />
          </button>

          {/* JSON Backup */}
          <button
            onClick={handleExportJSON}
            className="w-full p-3.5 rounded-xl border border-[#e9ecef] hover:border-[#2f9e44] hover:bg-[#d3f9d8]/30 text-left transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#d3f9d8] text-[#2f9e44] flex items-center justify-center">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#212529] group-hover:text-[#2f9e44]">
                  JSON Vector Data
                </div>
                <div className="text-[11px] text-[#868e96]">
                  Raw structured elements for backup and import
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-[#868e96] group-hover:text-[#2f9e44]" />
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#f8f9fa] border-t border-[#e9ecef] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-[#868e96] hover:text-[#212529]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
