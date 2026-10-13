'use client'

import { worldToScreen } from '@/features/board/viewport'

/**
 * Renders remote collaborator pointers in screen space.
 *
 * @param {{
 *   remoteCursors: Record<string, import('@/features/board/elements').RemoteCursor>,
 *   viewport: { panX: number, panY: number, zoom: number },
 * }} props
 */
export default function RemoteCursors({ remoteCursors, viewport }) {
  const cursorsList = Object.values(remoteCursors || {})
  if (cursorsList.length === 0) return null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
      {cursorsList.map((cursor) => {
        // Map cursor's world coordinates to current viewport's screen position
        const screenPos = worldToScreen(cursor.x, cursor.y, viewport)

        return (
          <div
            key={cursor.userId}
            className="absolute transition-transform duration-75 ease-out will-change-transform"
            style={{
              transform: `translate3d(${screenPos.x}px, ${screenPos.y}px, 0)`,
            }}
          >
            {/* SVG Pointer Arrow */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="drop-shadow-sm"
              style={{ color: cursor.color || '#1971c2' }}
            >
              <path
                d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                fill="currentColor"
                stroke="white"
                strokeWidth="1.2"
              />
            </svg>

            {/* Collaborator Name Pill */}
            <div
              className="mt-0.5 ml-3 px-2 py-0.5 rounded-md text-[11px] font-semibold text-white whitespace-nowrap shadow-sm select-none"
              style={{ backgroundColor: cursor.color || '#1971c2' }}
            >
              {cursor.name || 'Collaborator'}
            </div>
          </div>
        )
      })}
    </div>
  )
}
