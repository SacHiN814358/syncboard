'use client'

import { useState } from 'react'
import { Sparkles, X, Smile } from 'lucide-react'

export const EMOJI_LIST = ['❤️', '🔥', '🎉', '👍', '😂', '🚀', '👏', '💡']

/**
 * Figma-style Floating Reaction Wheel/Bar.
 *
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onSelectEmoji: (emoji: string) => void,
 * }} props
 */
export default function ReactionPicker({ isOpen, onClose, onSelectEmoji }) {
  if (!isOpen) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-3 duration-150 select-none">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-md rounded-2xl border border-[#dee2e6] shadow-[0_10px_35px_-4px_rgba(0,0,0,0.15)]">
        {/* Label Icon */}
        <div className="flex items-center gap-1 text-[11px] font-bold text-[#868e96] uppercase tracking-wider pr-1 border-r border-[#e9ecef]">
          <Smile className="w-4 h-4 text-[#1971c2]" />
          <span className="hidden sm:inline">React</span>
        </div>

        {/* Emojis list */}
        <div className="flex items-center gap-1">
          {EMOJI_LIST.map((emoji, index) => (
            <button
              key={emoji}
              onClick={() => onSelectEmoji(emoji)}
              className="w-10 h-10 flex items-center justify-center text-2xl hover:scale-130 active:scale-95 transition-transform duration-100 rounded-xl hover:bg-[#f1f3f5] cursor-pointer"
              title={`React with ${emoji} (Press ${index + 1})`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-[#adb5bd] hover:text-[#495057] hover:bg-[#f1f3f5] transition-colors ml-1 cursor-pointer"
          title="Close (Esc or E)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="text-center mt-1">
        <span className="text-[10px] text-[#adb5bd] bg-white/80 px-2 py-0.5 rounded-full shadow-xs">
          Press <kbd className="font-mono font-bold text-[#495057]">1-8</kbd> or click • <kbd className="font-mono font-bold text-[#495057]">E</kbd> to toggle
        </span>
      </div>
    </div>
  )
}
