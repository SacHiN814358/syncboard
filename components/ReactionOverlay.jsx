'use client'

import { worldToScreen } from '@/features/board/viewport'

/**
 * Renders live floating emoji reactions over the whiteboard canvas.
 *
 * @param {{
 *   reactions: Array<{
 *     id: string,
 *     emoji: string,
 *     userName: string,
 *     userColor: string,
 *     x: number,
 *     y: number,
 *     createdAt: number,
 *     offsetX?: number,
 *   }>,
 *   viewport: { panX: number, panY: number, zoom: number },
 * }} props
 */
export default function ReactionOverlay({ reactions, viewport }) {
  if (!reactions || reactions.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-35 overflow-hidden select-none">
      {reactions.map((rx) => {
        const screen = worldToScreen(rx.x, rx.y, viewport)
        const randomX = rx.offsetX || 0

        return (
          <div
            key={rx.id}
            className="absolute reaction-particle flex flex-col items-center pointer-events-none"
            style={{
              left: `${screen.x + randomX}px`,
              top: `${screen.y}px`,
            }}
          >
            {/* Big Emoji */}
            <span className="text-4xl drop-shadow-md select-none transform transition-transform filter hover:scale-110">
              {rx.emoji}
            </span>

            {/* Author Name Tag Pill */}
            {rx.userName && (
              <span
                className="mt-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-md border border-white/40 whitespace-nowrap"
                style={{ backgroundColor: rx.userColor || '#1971c2' }}
              >
                {rx.userName}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
