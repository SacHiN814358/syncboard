'use client'

import { useState, useEffect, useRef } from 'react'
import {
  MousePointer,
  Hand,
  Pencil,
  Paintbrush,
  Square,
  Circle,
  Minus,
  MoveRight,
  MoveHorizontal,
  Diamond,
  Triangle,
  Star,
  Heart,
  Hexagon,
  Cloud,
  Type,
  StickyNote,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Smile,
  Pipette,
  ChevronDown,
} from 'lucide-react'
import { COLORS, STROKE_WIDTHS } from '@/features/board/elements'

const PRIMARY_TOOLS = [
  { id: 'select', label: 'Select / Move', shortcut: 'V', icon: MousePointer },
  { id: 'pan', label: 'Hand / Pan', shortcut: 'H', icon: Hand },
  { id: 'pen', label: 'Pencil', shortcut: 'P', icon: Pencil },
  { id: 'brush', label: 'Brush', shortcut: 'B', icon: Paintbrush },
  { id: 'eraser', label: 'Eraser', shortcut: 'X', icon: Eraser },
]

const SHAPES_LIST = [
  { id: 'rectangle', label: 'Rectangle', icon: Square, category: 'Basic Shapes' },
  { id: 'circle', label: 'Circle', icon: Circle, category: 'Basic Shapes' },
  { id: 'diamond', label: 'Diamond', icon: Diamond, category: 'Basic Shapes' },
  { id: 'triangle', label: 'Triangle', icon: Triangle, category: 'Basic Shapes' },
  { id: 'hexagon', label: 'Hexagon', icon: Hexagon, category: 'Basic Shapes' },
  { id: 'star', label: 'Star', icon: Star, category: 'Special Shapes' },
  { id: 'heart', label: 'Heart', icon: Heart, category: 'Special Shapes' },
  { id: 'cloud', label: 'Cloud', icon: Cloud, category: 'Special Shapes' },
  { id: 'line', label: 'Line', icon: Minus, category: 'Connectors' },
  { id: 'arrow', label: 'Arrow', icon: MoveRight, category: 'Connectors' },
  { id: 'double-arrow', label: 'Double Arrow', icon: MoveHorizontal, category: 'Connectors' },
]

const ANNOTATION_TOOLS = [
  { id: 'text', label: 'Text', shortcut: 'T', icon: Type },
  { id: 'sticky', label: 'Sticky Note', shortcut: 'S', icon: StickyNote },
]

/**
 * Modern MS Paint-style Toolbar with tools, size selector, and color palette.
 *
 * @param {{
 *   activeTool: string,
 *   onSelectTool: (tool: string) => void,
 *   currentColor: string,
 *   onChangeColor: (color: string) => void,
 *   currentStrokeWidth: number,
 *   onChangeStrokeWidth: (width: number) => void,
 *   canUndo: boolean,
 *   canRedo: boolean,
 *   onUndo: () => void,
 *   onRedo: () => void,
 *   onClearCanvas: () => void,
 * }} props
 */
export default function Toolbar({
  activeTool,
  onSelectTool,
  currentColor,
  onChangeColor,
  currentStrokeWidth,
  onChangeStrokeWidth,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearCanvas,
  reactionsOpen = false,
  onToggleReactions,
}) {
  const isCustomColor = !COLORS.includes(currentColor)
  const [hasEyeDropper, setHasEyeDropper] = useState(false)
  const [shapesOpen, setShapesOpen] = useState(false)
  const [selectedShapeId, setSelectedShapeId] = useState('rectangle')
  const shapesDropdownRef = useRef(null)

  // Track if activeTool is one of the shapes
  const isShapeActive = SHAPES_LIST.some((s) => s.id === activeTool)
  const currentShape =
    SHAPES_LIST.find((s) => s.id === activeTool) ||
    SHAPES_LIST.find((s) => s.id === selectedShapeId) ||
    SHAPES_LIST[0]
  const ActiveShapeIcon = currentShape.icon

  // Update selectedShapeId if activeTool changes to a shape externally (e.g. keyboard shortcut)
  useEffect(() => {
    if (isShapeActive) {
      setSelectedShapeId(activeTool)
    }
  }, [activeTool, isShapeActive])

  // Close dropdown on click outside or Escape
  useEffect(() => {
    if (!shapesOpen) return

    const handleClickOutside = (e) => {
      if (shapesDropdownRef.current && !shapesDropdownRef.current.contains(e.target)) {
        setShapesOpen(false)
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShapesOpen(false)
      }
    }

    document.addEventListener('pointerdown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [shapesOpen])

  useEffect(() => {
    if (typeof window !== 'undefined' && 'EyeDropper' in window) {
      setHasEyeDropper(true)
    }
  }, [])

  const handleEyeDropper = async () => {
    if (typeof window !== 'undefined' && 'EyeDropper' in window) {
      try {
        const eyeDropper = new window.EyeDropper()
        const result = await eyeDropper.open()
        if (result?.sRGBHex) {
          onChangeColor(result.sRGBHex)
        }
      } catch (_) {}
    }
  }

  return (
    <div className="fixed top-15 left-1/2 -translate-x-1/2 z-30 max-w-[98vw]">
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#e9ecef] shadow-[0_6px_24px_-4px_rgba(0,0,0,0.08)] select-none">
        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
            className="toolbar-btn disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
            className="toolbar-btn disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Tools Section */}
        <div className="flex items-center gap-0.5">
          {PRIMARY_TOOLS.map((tool) => {
            const Icon = tool.icon
            const isActive = activeTool === tool.id

            return (
              <button
                key={tool.id}
                onClick={() => onSelectTool(tool.id)}
                data-active={isActive}
                title={`${tool.label} (${tool.shortcut})`}
                aria-label={tool.label}
                className="toolbar-btn group relative"
              >
                <Icon className="w-4 h-4" />

                {/* Tooltip */}
                <span className="hidden group-hover:flex tooltip-enter absolute -bottom-9 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-[#212529] text-white text-[11px] font-medium whitespace-nowrap shadow-md pointer-events-none z-50 items-center gap-1">
                  <span>{tool.label}</span>
                  <span className="text-[#adb5bd] text-[10px]">({tool.shortcut})</span>
                </span>
              </button>
            )
          })}

          {/* Shapes Dropdown Button & Menu */}
          <div className="relative" ref={shapesDropdownRef}>
            <button
              onClick={() => {
                if (!isShapeActive) {
                  onSelectTool(selectedShapeId)
                }
                setShapesOpen((prev) => !prev)
              }}
              data-active={isShapeActive}
              title={`Shapes (${currentShape.label}) - Click to pick shapes`}
              aria-label="Shapes Menu"
              className={`toolbar-btn group relative flex items-center gap-1 px-1.5 ${
                isShapeActive ? 'bg-[#e7f5ff] text-[#1971c2]' : ''
              }`}
            >
              <ActiveShapeIcon className="w-4 h-4" />
              <ChevronDown
                className={`w-3 h-3 text-[#868e96] transition-transform duration-150 ${
                  shapesOpen ? 'rotate-180' : ''
                }`}
              />

              {/* Tooltip */}
              {!shapesOpen && (
                <span className="hidden group-hover:flex tooltip-enter absolute -bottom-9 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-[#212529] text-white text-[11px] font-medium whitespace-nowrap shadow-md pointer-events-none z-50 items-center gap-1">
                  <span>Shapes: {currentShape.label}</span>
                </span>
              )}
            </button>

            {/* Shapes Dropdown Popover */}
            {shapesOpen && (
              <div className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 bg-white/98 backdrop-blur-md rounded-2xl border border-[#e9ecef] shadow-[0_16px_38px_-4px_rgba(0,0,0,0.18)] p-3 w-68 z-50 select-none animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#f1f3f5]">
                  <span className="text-xs font-semibold text-[#343a40]">Shapes & Diagrams</span>
                  <span className="text-[10px] text-[#868e96] bg-[#f8f9fa] px-1.5 py-0.5 rounded-md border border-[#e9ecef] font-medium">
                    11 Shapes
                  </span>
                </div>

                {/* Geometric Shapes */}
                <div className="mb-2.5">
                  <div className="text-[10px] font-bold text-[#868e96] uppercase tracking-wider mb-1.5 px-0.5">
                    Geometric Shapes
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {SHAPES_LIST.filter((s) => s.category === 'Basic Shapes').map((shape) => {
                      const Icon = shape.icon
                      const isSelected = activeTool === shape.id
                      return (
                        <button
                          key={shape.id}
                          onClick={() => {
                            onSelectTool(shape.id)
                            setSelectedShapeId(shape.id)
                            setShapesOpen(false)
                          }}
                          title={shape.label}
                          className={`p-2 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#e7f5ff] text-[#1971c2] border border-[#a5d8ff] shadow-xs'
                              : 'text-[#495057] hover:bg-[#f1f3f5] hover:text-[#212529] border border-transparent'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Special Shapes & Badges */}
                <div className="mb-2.5">
                  <div className="text-[10px] font-bold text-[#868e96] uppercase tracking-wider mb-1.5 px-0.5">
                    Badges & Icons
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {SHAPES_LIST.filter((s) => s.category === 'Special Shapes').map((shape) => {
                      const Icon = shape.icon
                      const isSelected = activeTool === shape.id
                      return (
                        <button
                          key={shape.id}
                          onClick={() => {
                            onSelectTool(shape.id)
                            setSelectedShapeId(shape.id)
                            setShapesOpen(false)
                          }}
                          title={shape.label}
                          className={`py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#e7f5ff] text-[#1971c2] border border-[#a5d8ff] shadow-xs'
                              : 'text-[#495057] hover:bg-[#f1f3f5] hover:text-[#212529] border border-transparent'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-[11px] font-medium">{shape.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Connectors & Arrows */}
                <div>
                  <div className="text-[10px] font-bold text-[#868e96] uppercase tracking-wider mb-1.5 px-0.5">
                    Connectors & Arrows
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {SHAPES_LIST.filter((s) => s.category === 'Connectors').map((shape) => {
                      const Icon = shape.icon
                      const isSelected = activeTool === shape.id
                      return (
                        <button
                          key={shape.id}
                          onClick={() => {
                            onSelectTool(shape.id)
                            setSelectedShapeId(shape.id)
                            setShapesOpen(false)
                          }}
                          title={shape.label}
                          className={`py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#e7f5ff] text-[#1971c2] border border-[#a5d8ff] shadow-xs'
                              : 'text-[#495057] hover:bg-[#f1f3f5] hover:text-[#212529] border border-transparent'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-[11px] font-medium truncate">{shape.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Text & Sticky Tools */}
          {ANNOTATION_TOOLS.map((tool) => {
            const Icon = tool.icon
            const isActive = activeTool === tool.id

            return (
              <button
                key={tool.id}
                onClick={() => onSelectTool(tool.id)}
                data-active={isActive}
                title={`${tool.label} (${tool.shortcut})`}
                aria-label={tool.label}
                className="toolbar-btn group relative"
              >
                <Icon className="w-4 h-4" />

                {/* Tooltip */}
                <span className="hidden group-hover:flex tooltip-enter absolute -bottom-9 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-[#212529] text-white text-[11px] font-medium whitespace-nowrap shadow-md pointer-events-none z-50 items-center gap-1">
                  <span>{tool.label}</span>
                  <span className="text-[#adb5bd] text-[10px]">({tool.shortcut})</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="toolbar-divider" />

        {/* Brush / Stroke Width Presets */}
        <div className="flex items-center gap-1 px-1">
          {STROKE_WIDTHS.map((sw) => {
            const isSelected = Math.abs(currentStrokeWidth - sw.value) < 1
            return (
              <button
                key={sw.value}
                onClick={() => onChangeStrokeWidth(sw.value)}
                title={sw.label}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-[#e7f5ff] border border-[#1971c2]'
                    : 'hover:bg-[#f1f3f5] border border-transparent'
                }`}
              >
                <div
                  className="rounded-full bg-[#212529]"
                  style={{
                    width: `${Math.min(18, Math.max(3, sw.value))}px`,
                    height: `${Math.min(18, Math.max(3, sw.value))}px`,
                  }}
                />
              </button>
            )
          })}
        </div>

        <div className="toolbar-divider" />

        {/* Paint Color Palette (1-click color selection!) */}
        <div className="flex items-center gap-1 px-1">
          {COLORS.map((c) => {
            const isSelected = currentColor === c
            return (
              <button
                key={c}
                onClick={() => onChangeColor(c)}
                title={`Color: ${c}`}
                className="w-5.5 h-5.5 rounded-md transition-transform flex items-center justify-center cursor-pointer border hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: isSelected ? '#1971c2' : '#dee2e6',
                  transform: isSelected ? 'scale(1.15)' : 'none',
                  boxShadow: isSelected ? '0 0 0 2px white inset, 0 0 0 1.5px #1971c2' : 'none',
                }}
              />
            )
          })}

          <div className="w-px h-4 bg-[#e9ecef] mx-0.5" />

          {/* Color Wheel / Custom Color Picker */}
          <div className="relative flex items-center">
            <label
              title={`Color Wheel: Pick custom color (Current: ${currentColor})`}
              className={`relative w-5.5 h-5.5 rounded-full cursor-pointer flex items-center justify-center border shadow-xs hover:scale-115 active:scale-95 transition-all overflow-hidden ${
                isCustomColor
                  ? 'ring-2 ring-[#1971c2] ring-offset-1 border-[#1971c2]'
                  : 'border-[#ced4da]'
              }`}
              style={{
                background:
                  'conic-gradient(from 90deg, #ff0000, #ff8000, #ffff00, #00ff00, #00ffff, #0000ff, #8000ff, #ff0080, #ff0000)',
              }}
            >
              {/* Inner preview circle showing active color */}
              <div
                className="w-2.5 h-2.5 rounded-full border border-white/90 shadow-xs"
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
                title="Color Wheel: Pick any color"
              />
            </label>
          </div>

          {/* EyeDropper Screen Color Picker (if supported) */}
          {hasEyeDropper && (
            <button
              onClick={handleEyeDropper}
              title="Eyedropper: Pick color from canvas"
              className="p-1 rounded-md text-[#868e96] hover:text-[#1971c2] hover:bg-[#f1f3f5] transition-colors cursor-pointer"
            >
              <Pipette className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="toolbar-divider" />

        {/* Live Emoji Reactions Button */}
        <button
          onClick={onToggleReactions}
          title="Live Emoji Reactions (E)"
          className={`toolbar-btn transition-colors ${
            reactionsOpen
              ? 'bg-[#e7f5ff] text-[#1971c2]'
              : 'text-[#495057] hover:bg-[#f1f3f5]'
          }`}
        >
          <Smile className="w-4 h-4 text-amber-500" />
        </button>

        {/* Clear Canvas Button */}
        <button
          onClick={onClearCanvas}
          title="Clear Canvas (Reset Board)"
          className="toolbar-btn text-red-500 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
