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
  onAddVote,
}) {
  // Only show inspector panel when an element is explicitly selected!
  // When no element is selected, the canvas is clear and user uses the top toolbar controls.
  if (!selectedElement) {
    return null
  }

  const isSticky = selectedElement.type === 'sticky'
  const isText = selectedElement.type === 'text'
  const isImage = selectedElement.type === 'image'
  const isStamp = selectedElement.type === 'stamp'

  const hasStroke =
    (CLOSED_SHAPES.includes(selectedElement.type) ||
     LINE_SHAPES.includes(selectedElement.type) ||
     selectedElement.type === 'pen' ||
     selectedElement.type === 'brush') &&
    !isStamp

  const hasFill =
    CLOSED_SHAPES.includes(selectedElement.type) &&
    !isStamp

  const safeStroke = typeof currentColor === 'string' ? currentColor : '#1971c2'
  const safeFill = typeof currentFillColor === 'string' ? currentFillColor : 'transparent'
  const strokeInputHex = safeStroke.startsWith('#') && safeStroke.length === 7 ? safeStroke : '#1971c2'
  const fillInputHex = safeFill.startsWith('#')
    ? (safeFill.length === 7 ? safeFill : safeFill.slice(0, 7))
    : '#1971c2'
  const isFillTransparent = safeFill === 'transparent'
  const isFillTint = safeFill.endsWith('18') || safeFill.endsWith('22')
  const isFillSolid = !isFillTransparent && !isFillTint

  return (
    <div className="fixed top-32 left-6 z-20">
      <div className="w-56 p-3 rounded-xl bg-white/95 backdrop-blur-md border border-[#e9ecef] shadow-[0_6px_24px_-4px_rgba(0,0,0,0.10)] space-y-3 select-none text-xs">
        {/* Stamp Sticker Header */}
        {isStamp && (
          <div className="flex items-center gap-2 p-2 bg-[#f8f9fa] rounded-lg border border-[#e9ecef]">
            <span className="text-2xl">{selectedElement.emoji || '👍'}</span>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-[#212529]">Stamp Sticker</div>
              <div className="text-[10px] text-[#868e96]">FigJam Voting Badge</div>
            </div>
          </div>
        )}

        {/* Stroke / Text Color */}
        {(hasStroke || isText) && !isSticky && !isImage && !isStamp && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-[#868e96] uppercase tracking-wider">
                {isText ? 'Text Color' : 'Stroke Color'}
              </span>
              <label
                title={`Custom Color Picker (${safeStroke})`}
                className="relative w-5 h-5 rounded-full cursor-pointer flex items-center justify-center border border-[#dee2e6] hover:scale-110 active:scale-95 transition-transform overflow-hidden shadow-xs"
                style={{
                  background:
                    'conic-gradient(from 90deg, #ff0000, #ff8000, #ffff00, #00ff00, #00ffff, #0000ff, #8000ff, #ff0080, #ff0000)',
                }}
              >
                <div
                  className="w-2 h-2 rounded-full border border-white/90"
                  style={{ backgroundColor: safeStroke }}
                />
                <input
                  type="color"
                  value={strokeInputHex}
                  onChange={(e) => onChangeColor(e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
              </label>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {COLORS.map((c) => {
                const isSelected = safeStroke === c
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
                title={`Custom Fill Color Picker (${safeFill})`}
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
                      isFillTransparent ? '#ffffff' : safeFill,
                  }}
                />
                <input
                  type="color"
                  value={fillInputHex}
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
                  isFillTransparent
                    ? 'bg-white text-[#212529] shadow-xs'
                    : 'text-[#868e96] hover:text-[#212529]'
                }`}
              >
                No Fill
              </button>
              <button
                onClick={() =>
                  onChangeFillColor(
                    isFillTransparent ? safeStroke : (safeFill.length === 9 ? safeFill.slice(0, 7) : safeFill)
                  )
                }
                className={`py-1 rounded-md text-[11px] font-medium transition-all ${
                  isFillSolid
                    ? 'bg-white text-[#212529] shadow-xs'
                    : 'text-[#868e96] hover:text-[#212529]'
                }`}
              >
                Solid
              </button>
              <button
                onClick={() => onChangeFillColor(`${safeStroke}22`)}
                className={`py-1 rounded-md text-[11px] font-medium transition-all ${
                  isFillTint
                    ? 'bg-white text-[#212529] shadow-xs'
                    : 'text-[#868e96] hover:text-[#212529]'
                }`}
              >
                Tint
              </button>
            </div>

            {/* Fill Color Swatches (when Fill is active) */}
            {!isFillTransparent && (
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {COLORS.map((c) => {
                  const isSelected = safeFill === c
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

        {/* Font Size for Text & Shape Labels */}
        {(isText || (selectedElement && selectedElement.text)) && (
          <div>
            <div className="text-[11px] font-semibold text-[#868e96] mb-1.5 uppercase tracking-wider">
              {isText ? 'Font Size' : 'Label Size'}
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

        {/* FigJam Stamps & Dot Voting Section */}
        {selectedElement &&
          (selectedElement.type === 'sticky' ||
            BOX_SHAPES.includes(selectedElement.type) ||
            selectedElement.type === 'circle' ||
            selectedElement.type === 'stamp') && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-[#868e96] uppercase tracking-wider">
                  Dot Voting & Stamps
                </span>
                <span className="text-[10px] text-[#1971c2] font-semibold">Click to vote</span>
              </div>
              <div className="grid grid-cols-5 gap-1 bg-[#f8f9fa] p-1.5 rounded-xl border border-[#e9ecef]">
                {['👍', '❤️', '🔥', '🚀', '💡', '💯', '⭐', '❓', '❌'].map((emoji) => {
                  const count = selectedElement.votes?.[emoji] || 0
                  return (
                    <button
                      key={emoji}
                      onClick={() => onAddVote?.(emoji)}
                      className={`h-7 rounded-lg text-sm flex items-center justify-center gap-0.5 transition-transform hover:scale-120 cursor-pointer ${
                        count > 0 ? 'bg-[#e7f5ff] border border-[#74c0fc] font-bold text-xs shadow-2xs' : 'hover:bg-white'
                      }`}
                      title={`Vote ${emoji}`}
                    >
                      <span>{emoji}</span>
                      {count > 0 && <span className="text-[10px] text-[#1971c2]">{count}</span>}
                    </button>
                  )
                })}
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
