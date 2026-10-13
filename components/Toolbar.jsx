'use client'

import {
  MousePointer,
  Hand,
  Pencil,
  Paintbrush,
  Square,
  Circle,
  Minus,
  MoveRight,
  Type,
  StickyNote,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Smile,
} from 'lucide-react'
import { COLORS, STROKE_WIDTHS } from '@/features/board/elements'

const TOOLS = [
  { id: 'pen', label: 'Pencil', shortcut: 'P', icon: Pencil },
  { id: 'brush', label: 'Brush', shortcut: 'B', icon: Paintbrush },
  { id: 'eraser', label: 'Eraser', shortcut: 'X', icon: Eraser },
  { id: 'select', label: 'Select / Move', shortcut: 'V', icon: MousePointer },
  { id: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: Square },
  { id: 'circle', label: 'Circle', shortcut: 'O', icon: Circle },
  { id: 'arrow', label: 'Arrow', shortcut: 'A', icon: MoveRight },
  { id: 'line', label: 'Line', shortcut: 'L', icon: Minus },
  { id: 'text', label: 'Text', shortcut: 'T', icon: Type },
  { id: 'sticky', label: 'Sticky Note', shortcut: 'S', icon: StickyNote },
  { id: 'pan', label: 'Hand / Pan', shortcut: 'H', icon: Hand },
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
          {TOOLS.map((tool) => {
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
