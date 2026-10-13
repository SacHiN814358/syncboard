'use client'

import { useState, useEffect, useRef } from 'react'
import {
  MousePointer,
  Hand,
  Pencil,
  Paintbrush,
  PaintBucket,
  Square,
  Circle,
  Minus,
  MoveRight,
  MoveLeft,
  MoveUp,
  MoveDown,
  MoveHorizontal,
  ChevronRight,
  Diamond,
  Triangle,
  Pentagon,
  Hexagon,
  Octagon,
  Star,
  Heart,
  Cloud,
  Zap,
  Spline,
  MessageSquare,
  MessageCircle,
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

function RightTriangleIcon({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="4,4 4,20 20,20" />
    </svg>
  )
}

function HeptagonIcon({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12,3 19,6 21,14 16,21 8,21 3,14 5,6" />
    </svg>
  )
}

function TrapezoidIcon({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="7,5 17,5 21,19 3,19" />
    </svg>
  )
}

function ParallelogramIcon({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="8,5 21,5 16,19 3,19" />
    </svg>
  )
}

function FourArrowIcon({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l-3 3h6zM12 22l-3-3h6zM2 12l3-3v6zM22 12l-3-3v6zM12 5v14M5 12h14" />
    </svg>
  )
}

function Star4Icon({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z" />
    </svg>
  )
}

function Star6Icon({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12,2 15,8 21,8 17,12 19,18 12,15 5,18 7,12 3,8 9,8" />
    </svg>
  )
}

function RoundedRectIcon({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
    </svg>
  )
}

const PRIMARY_TOOLS = [
  { id: 'select', label: 'Select / Move', shortcut: 'V', icon: MousePointer },
  { id: 'pan', label: 'Hand / Pan', shortcut: 'H', icon: Hand },
  { id: 'pen', label: 'Pencil', shortcut: 'P', icon: Pencil },
  { id: 'brush', label: 'Brush', shortcut: 'B', icon: Paintbrush },
  { id: 'bucket', label: 'Fill with Color', shortcut: 'G', icon: PaintBucket },
  { id: 'eraser', label: 'Eraser', shortcut: 'X', icon: Eraser },
]

const SHAPES_LIST = [
  // 1. Basic & Geometric Shapes
  { id: 'rectangle', label: 'Rectangle', icon: Square, category: 'Basic & Geometric Shapes' },
  { id: 'rounded-rectangle', label: 'Rounded Rectangle', icon: RoundedRectIcon, category: 'Basic & Geometric Shapes' },
  { id: 'circle', label: 'Oval / Circle', icon: Circle, category: 'Basic & Geometric Shapes' },
  { id: 'triangle', label: 'Triangle', icon: Triangle, category: 'Basic & Geometric Shapes' },
  { id: 'right-triangle', label: 'Right Triangle', icon: RightTriangleIcon, category: 'Basic & Geometric Shapes' },
  { id: 'diamond', label: 'Diamond', icon: Diamond, category: 'Basic & Geometric Shapes' },
  { id: 'pentagon', label: 'Pentagon (5-sided)', icon: Pentagon, category: 'Basic & Geometric Shapes' },
  { id: 'hexagon', label: 'Hexagon (6-sided)', icon: Hexagon, category: 'Basic & Geometric Shapes' },
  { id: 'heptagon', label: 'Heptagon (7-sided)', icon: HeptagonIcon, category: 'Basic & Geometric Shapes' },
  { id: 'octagon', label: 'Octagon (8-sided)', icon: Octagon, category: 'Basic & Geometric Shapes' },
  { id: 'trapezoid', label: 'Trapezoid', icon: TrapezoidIcon, category: 'Basic & Geometric Shapes' },
  { id: 'parallelogram', label: 'Parallelogram', icon: ParallelogramIcon, category: 'Basic & Geometric Shapes' },

  // 2. Lines & Curves
  { id: 'line', label: 'Line', icon: Minus, category: 'Lines & Curves' },
  { id: 'curve', label: 'Curve', icon: Spline, category: 'Lines & Curves' },
  { id: 'double-arrow', label: 'Double Arrow', icon: MoveHorizontal, category: 'Lines & Curves' },

  // 3. Arrows
  { id: 'arrow-right', label: 'Right Arrow', icon: MoveRight, category: 'Arrows' },
  { id: 'arrow-left', label: 'Left Arrow', icon: MoveLeft, category: 'Arrows' },
  { id: 'arrow-up', label: 'Up Arrow', icon: MoveUp, category: 'Arrows' },
  { id: 'arrow-down', label: 'Down Arrow', icon: MoveDown, category: 'Arrows' },
  { id: 'arrow-four', label: 'Four-point Arrow', icon: FourArrowIcon, category: 'Arrows' },
  { id: 'chevron', label: 'Chevron Arrow', icon: ChevronRight, category: 'Arrows' },

  // 4. Stars & Symbols
  { id: 'star-4', label: 'Four-point Star', icon: Star4Icon, category: 'Stars & Symbols' },
  { id: 'star', label: 'Five-point Star', icon: Star, category: 'Stars & Symbols' },
  { id: 'star-6', label: 'Six-point Star', icon: Star6Icon, category: 'Stars & Symbols' },
  { id: 'heart', label: 'Heart', icon: Heart, category: 'Stars & Symbols' },
  { id: 'lightning', label: 'Lightning Bolt', icon: Zap, category: 'Stars & Symbols' },

  // 5. Callouts (Speech & Thought Bubbles)
  { id: 'callout-rect', label: 'Rect Callout', icon: MessageSquare, category: 'Callouts' },
  { id: 'callout-oval', label: 'Oval Callout', icon: MessageCircle, category: 'Callouts' },
  { id: 'callout-cloud', label: 'Cloud Callout', icon: Cloud, category: 'Callouts' },
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
  currentFillColor = 'transparent',
  onChangeFillColor,
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
  const [activeColorSlot, setActiveColorSlot] = useState('stroke') // 'stroke' | 'fill'
  const isCustomColor = !COLORS.includes(
    activeColorSlot === 'stroke' ? currentColor : currentFillColor
  )
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
          if (activeColorSlot === 'stroke') {
            onChangeColor(result.sRGBHex)
          } else {
            onChangeFillColor?.(result.sRGBHex)
          }
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
              <div className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 bg-white/98 backdrop-blur-md rounded-2xl border border-[#e9ecef] shadow-[0_16px_40px_-4px_rgba(0,0,0,0.18)] p-3.5 w-[360px] max-h-[75vh] overflow-y-auto z-50 select-none animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#f1f3f5]">
                  <span className="text-xs font-semibold text-[#343a40]">Shapes & Symbols</span>
                  <span className="text-[10px] text-[#1971c2] bg-[#e7f5ff] px-2 py-0.5 rounded-full border border-[#d0ebff] font-semibold">
                    {SHAPES_LIST.length} Shapes
                  </span>
                </div>

                {/* 1. Basic & Geometric Shapes */}
                <div className="mb-3">
                  <div className="text-[10px] font-bold text-[#868e96] uppercase tracking-wider mb-1.5 px-0.5">
                    Basic & Geometric
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {SHAPES_LIST.filter((s) => s.category === 'Basic & Geometric Shapes').map((shape) => {
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
                          aria-label={shape.label}
                          className={`h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
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

                {/* 2. Lines & Curves */}
                <div className="mb-3">
                  <div className="text-[10px] font-bold text-[#868e96] uppercase tracking-wider mb-1.5 px-0.5">
                    Lines & Curves
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {SHAPES_LIST.filter((s) => s.category === 'Lines & Curves').map((shape) => {
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
                          aria-label={shape.label}
                          className={`h-8 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
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

                {/* 3. Arrows */}
                <div className="mb-3">
                  <div className="text-[10px] font-bold text-[#868e96] uppercase tracking-wider mb-1.5 px-0.5">
                    Arrows
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {SHAPES_LIST.filter((s) => s.category === 'Arrows').map((shape) => {
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
                          aria-label={shape.label}
                          className={`h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
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

                {/* 4. Stars & Symbols */}
                <div className="mb-3">
                  <div className="text-[10px] font-bold text-[#868e96] uppercase tracking-wider mb-1.5 px-0.5">
                    Stars & Symbols
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {SHAPES_LIST.filter((s) => s.category === 'Stars & Symbols').map((shape) => {
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
                          aria-label={shape.label}
                          className={`h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
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

                {/* 5. Callouts (Speech & Thought Bubbles) */}
                <div>
                  <div className="text-[10px] font-bold text-[#868e96] uppercase tracking-wider mb-1.5 px-0.5">
                    Callouts (Speech & Thought)
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {SHAPES_LIST.filter((s) => s.category === 'Callouts').map((shape) => {
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
                          aria-label={shape.label}
                          className={`h-8 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
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

        {/* Color 1 (Stroke) & Color 2 (Fill) Selector */}
        <div className="flex items-center gap-1 bg-[#f1f3f5] p-0.5 rounded-xl border border-[#dee2e6]/70">
          {/* Stroke Button */}
          <button
            onClick={() => setActiveColorSlot('stroke')}
            title="Color 1: Outline / Stroke Color"
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeColorSlot === 'stroke'
                ? 'bg-white text-[#1971c2] shadow-xs border border-[#a5d8ff]'
                : 'text-[#495057] hover:bg-white/60 border border-transparent'
            }`}
          >
            <div
              className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs"
              style={{ backgroundColor: currentColor }}
            />
            <span className="text-[11px]">Stroke</span>
          </button>

          {/* Fill Button */}
          <button
            onClick={() => setActiveColorSlot('fill')}
            title="Color 2: Shape Fill Color"
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeColorSlot === 'fill'
                ? 'bg-white text-[#1971c2] shadow-xs border border-[#a5d8ff]'
                : 'text-[#495057] hover:bg-white/60 border border-transparent'
            }`}
          >
            <div
              className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs relative overflow-hidden"
              style={{
                backgroundColor: currentFillColor === 'transparent' ? '#ffffff' : currentFillColor,
              }}
            >
              {currentFillColor === 'transparent' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-0.5 bg-red-500 rotate-45 transform" />
                </div>
              )}
            </div>
            <span className="text-[11px]">Fill</span>
          </button>
        </div>

        {/* Quick No-Fill Button (when fill slot is active) */}
        {activeColorSlot === 'fill' && currentFillColor !== 'transparent' && (
          <button
            onClick={() => onChangeFillColor?.('transparent')}
            title="Set Fill to Transparent (No Fill)"
            className="px-2 py-1 rounded-lg text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all cursor-pointer"
          >
            No Fill ✕
          </button>
        )}

        {/* Paint Color Palette (1-click color selection!) */}
        <div className="flex items-center gap-1 px-1">
          {COLORS.map((c) => {
            const isSelected =
              activeColorSlot === 'stroke' ? currentColor === c : currentFillColor === c
            return (
              <button
                key={c}
                onClick={() => {
                  if (activeColorSlot === 'stroke') {
                    onChangeColor(c)
                  } else {
                    onChangeFillColor?.(c)
                  }
                }}
                title={`${activeColorSlot === 'stroke' ? 'Stroke' : 'Fill'} Color: ${c}`}
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
              title={`Custom ${activeColorSlot === 'stroke' ? 'Stroke' : 'Fill'} Color Picker`}
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
                className="w-2.5 h-2.5 rounded-full border border-white/90 shadow-xs relative overflow-hidden"
                style={{
                  backgroundColor:
                    activeColorSlot === 'stroke'
                      ? currentColor
                      : currentFillColor === 'transparent'
                      ? '#ffffff'
                      : currentFillColor,
                }}
              >
                {activeColorSlot === 'fill' && currentFillColor === 'transparent' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-0.5 bg-red-500 rotate-45 transform" />
                  </div>
                )}
              </div>
              <input
                type="color"
                value={
                  (activeColorSlot === 'stroke' ? currentColor : currentFillColor).startsWith(
                    '#'
                  ) &&
                  (activeColorSlot === 'stroke' ? currentColor : currentFillColor).length === 7
                    ? activeColorSlot === 'stroke'
                      ? currentColor
                      : currentFillColor
                    : '#000000'
                }
                onChange={(e) => {
                  if (activeColorSlot === 'stroke') {
                    onChangeColor(e.target.value)
                  } else {
                    onChangeFillColor?.(e.target.value)
                  }
                }}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                title={`Pick any custom ${activeColorSlot} color`}
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
