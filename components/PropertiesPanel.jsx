'use client'

import { Trash2 } from 'lucide-react'
import {
  COLORS,
  STROKE_WIDTHS,
  STICKY_COLORS,
  CLOSED_SHAPES,
  LINE_SHAPES,
} from '@/features/board/elements'

const FONT_SIZES = [
  { label: 'S', value: 14 },
  { label: 'M', value: 18 },
  { label: 'L', value: 24 },
  { label: 'XL', value: 32 },
]

/**
 * Contextual properties panel floating on the top-left of the canvas.
 * Shows only the controls relevant to the active tool or selected element.
 *
 * @param {{
 *   activeTool: string,
 *   selectedElement: import('@/features/board/elements').CanvasElement | null,
 *   currentColor: string,
 *   currentStrokeWidth: number,
 *   currentFillColor: string,
 *   currentStickyColor: string,
 *   currentFontSize: number,
 *   onChangeColor: (color: string) => void,
 *   onChangeStrokeWidth: (width: number) => void,
 *   onChangeFillColor: (fill: string) => void,
 *   onChangeStickyColor: (color: string) => void,
 *   onChangeFontSize: (size: number) => void,
 *   onDeleteSelected: () => void,
 * }} props
 */
export default function PropertiesPanel({
  activeTool,
  selectedElement,
  currentColor,
  currentStrokeWidth,
  currentFillColor,
  currentStickyColor,
  currentFontSize,
  onChangeColor,
  onChangeStrokeWidth,
  onChangeFillColor,
  onChangeStickyColor,
  onChangeFontSize,
  onDeleteSelected,
}) {
  const isSticky = activeTool === 'sticky' || selectedElement?.type === 'sticky'
  const isText = activeTool === 'text' || selectedElement?.type === 'text'
  const isImage = selectedElement?.type === 'image'

  const hasStroke =
    CLOSED_SHAPES.includes(activeTool) ||
    CLOSED_SHAPES.includes(selectedElement?.type) ||
    LINE_SHAPES.includes(activeTool) ||
    LINE_SHAPES.includes(selectedElement?.type) ||
    activeTool === 'pen' ||
    selectedElement?.type === 'pen'

  const hasFill =
    CLOSED_SHAPES.includes(activeTool) ||
    CLOSED_SHAPES.includes(selectedElement?.type) ||
    activeTool === 'bucket'

  // Don't show properties if tool is pan or eraser with no selection
  if (['pan', 'eraser'].includes(activeTool) && !selectedElement) {
    return null
  }

  return (
    <div className="fixed top-20 left-6 z-30">
      <div className="w-56 p-3 rounded-xl bg-white/95 backdrop-blur-md border border-[#e9ecef] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] space-y-3 select-none text-xs">
        {/* Stroke / Text Color */}
        {!isSticky && !isImage && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-[#868e96] uppercase tracking-wider">
                {isText ? 'Text Color' : 'Stroke Color'}
              </span>
              <label
                title={`Custom Color Picker (${currentColor})`}
                className="relative w-5 h-5 rounded-full cursor-pointer flex items-center justify-center border border-[#dee2e6] hover:scale-110 active:scale-95 transition-transform overflow-hidden shadow-xs"
                style={{
                  background:
                    'conic-gradient(from 90deg, #ff0000, #ff8000, #ffff00, #00ff00, #00ffff, #0000ff, #8000ff, #ff0080, #ff0000)',
                }}
              >
                <div
                  className="w-2 h-2 rounded-full border border-white/90"
                  style={{ backgroundColor: currentColor }}
                />
                <input
                  type="color"
                  value={
                    currentColor.startsWith('#') && currentColor.length === 7
                      ? currentColor
                      : '#000000'
                  }
                  onChange={(e) => onChangeColor(e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
              </label>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {COLORS.map((c) => {
                const isSelected = currentColor === c
                return (
                  <button
                    key={c}
                    onClick={() => onChangeColor(c)}
                    className="w-full h-6 rounded-md transition-all flex items-center justify-center border"
                    style={{
                      backgroundColor: c,
                      borderColor: isSelected ? '#1971c2' : 'transparent',
                      boxShadow: isSelected ? '0 0 0 2px white inset' : 'none',
                    }}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* Sticky Note Background Preset */}
        {isSticky && (
          <div>
            <div className="text-[11px] font-semibold text-[#868e96] mb-1.5 uppercase tracking-wider">
              Note Color
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {STICKY_COLORS.map((sc) => {
                const isSelected = currentStickyColor === sc
                return (
                  <button
                    key={sc}
                    onClick={() => onChangeStickyColor(sc)}
                    className="w-full h-7 rounded-md border transition-all flex items-center justify-center"
                    style={{
                      backgroundColor: sc,
                      borderColor: isSelected ? '#1971c2' : '#e9ecef',
                      boxShadow: isSelected ? '0 0 0 1px #1971c2' : 'none',
                    }}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* Stroke Width Presets */}
        {hasStroke && (
          <div>
            <div className="text-[11px] font-semibold text-[#868e96] mb-1.5 uppercase tracking-wider">
              Stroke Width
            </div>
            <div className="grid grid-cols-3 gap-1 bg-[#f1f3f5] p-0.5 rounded-lg">
              {STROKE_WIDTHS.map((sw) => {
                const isSelected = currentStrokeWidth === sw.value
                return (
                  <button
                    key={sw.value}
                    onClick={() => onChangeStrokeWidth(sw.value)}
                    className={`py-1 rounded-md text-[11px] font-medium transition-all ${
                      isSelected
                        ? 'bg-white text-[#212529] shadow-xs'
                        : 'text-[#868e96] hover:text-[#212529]'
                    }`}
                  >
                    {sw.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Fill Controls for Shapes & Bucket Tool */}
        {hasFill && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-[#868e96] uppercase tracking-wider">
                Fill Color
              </span>
              <label
                title={`Custom Fill Color Picker (${currentFillColor})`}
                className="relative w-5 h-5 rounded-full cursor-pointer flex items-center justify-center border border-[#dee2e6] hover:scale-110 active:scale-95 transition-transform overflow-hidden shadow-xs"
                style={{
                  background:
                    'conic-gradient(from 90deg, #ff0000, #ff8000, #ffff00, #00ff00, #00ffff, #0000ff, #8000ff, #ff0080, #ff0000)',
                }}
              >
                <div
                  className="w-2 h-2 rounded-full border border-white/90"
                  style={{
                    backgroundColor:
                      currentFillColor === 'transparent' ? '#ffffff' : currentFillColor,
                  }}
                />
                <input
                  type="color"
                  value={
                    currentFillColor.startsWith('#') && currentFillColor.length === 7
                      ? currentFillColor
                      : '#1971c2'
                  }
                  onChange={(e) => onChangeFillColor(e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
              </label>
            </div>

            {/* Fill Mode Switcher */}
            <div className="grid grid-cols-3 gap-1 bg-[#f1f3f5] p-0.5 rounded-lg mb-2">
              <button
                onClick={() => onChangeFillColor('transparent')}
                className={`py-1 rounded-md text-[11px] font-medium transition-all ${
                  currentFillColor === 'transparent'
                    ? 'bg-white text-[#212529] shadow-xs'
                    : 'text-[#868e96] hover:text-[#212529]'
                }`}
              >
                No Fill
              </button>
              <button
                onClick={() =>
                  onChangeFillColor(
                    currentFillColor === 'transparent' ? currentColor : currentFillColor
                  )
                }
                className={`py-1 rounded-md text-[11px] font-medium transition-all ${
                  currentFillColor !== 'transparent' &&
                  !currentFillColor.endsWith('18') &&
                  !currentFillColor.endsWith('22')
                    ? 'bg-white text-[#212529] shadow-xs'
                    : 'text-[#868e96] hover:text-[#212529]'
                }`}
              >
                Solid
              </button>
              <button
                onClick={() => onChangeFillColor(`${currentColor}22`)}
                className={`py-1 rounded-md text-[11px] font-medium transition-all ${
                  currentFillColor.endsWith('18') || currentFillColor.endsWith('22')
                    ? 'bg-white text-[#212529] shadow-xs'
                    : 'text-[#868e96] hover:text-[#212529]'
                }`}
              >
                Tint
              </button>
            </div>

            {/* Fill Color Swatches (when Fill is active) */}
            {currentFillColor !== 'transparent' && (
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {COLORS.map((c) => {
                  const isSelected = currentFillColor === c
                  return (
                    <button
                      key={c}
                      onClick={() => onChangeFillColor(c)}
                      className="w-full h-6 rounded-md transition-all flex items-center justify-center border"
                      style={{
                        backgroundColor: c,
                        borderColor: isSelected ? '#1971c2' : 'transparent',
                        boxShadow: isSelected ? '0 0 0 2px white inset' : 'none',
                      }}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Font Size for Text */}
        {isText && (
          <div>
            <div className="text-[11px] font-semibold text-[#868e96] mb-1.5 uppercase tracking-wider">
              Font Size
            </div>
            <div className="grid grid-cols-4 gap-1 bg-[#f1f3f5] p-0.5 rounded-lg">
              {FONT_SIZES.map((fs) => {
                const isSelected = currentFontSize === fs.value
                return (
                  <button
                    key={fs.value}
                    onClick={() => onChangeFontSize(fs.value)}
                    className={`py-1 rounded-md text-[11px] font-medium transition-all ${
                      isSelected
                        ? 'bg-white text-[#212529] shadow-xs'
                        : 'text-[#868e96] hover:text-[#212529]'
                    }`}
                  >
                    {fs.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Image Actions */}
        {isImage && selectedElement && (
          <div>
            <div className="text-[11px] font-semibold text-[#868e96] mb-1.5 uppercase tracking-wider">
              Image Info
            </div>
            <div className="text-[11px] text-[#495057] bg-[#f8f9fa] p-2.5 rounded-lg border border-[#e9ecef] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#868e96]">Size</span>
                <span className="font-mono text-[#212529]">
                  {Math.round(selectedElement.width)} × {Math.round(selectedElement.height)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const a = document.createElement('a')
                  a.href = selectedElement.src
                  a.download = `syncboard-image-${selectedElement.id}.png`
                  a.click()
                }}
                className="w-full mt-1 py-1 px-2 text-center rounded bg-white hover:bg-[#f1f3f5] border border-[#dee2e6] text-[#1971c2] font-medium transition-colors cursor-pointer"
              >
                📥 Download Image
              </button>
            </div>
          </div>
        )}

        {/* Delete Element Button (when an element is selected) */}
        {selectedElement && (
          <div className="pt-2 border-t border-[#f1f3f5]">
            <button
              onClick={onDeleteSelected}
              className="w-full py-1.5 px-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Element (Del)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
