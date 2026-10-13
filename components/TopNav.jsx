'use client'

import { useState } from 'react'
import {
  Share2,
  Download,
  Database,
  Cloud,
  Check,
  RotateCcw,
  Users,
} from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Top navigation bar inspired by Linear & Figma.
 *
 * @param {{
 *   boardTitle: string,
 *   onTitleChange: (newTitle: string) => void,
 *   saveStatus: 'saved' | 'saving' | 'offline',
 *   zoom: number,
 *   onResetZoom: () => void,
 *   collaborators: any[],
 *   currentUser: any,
 *   onOpenExport: () => void,
 *   onOpenSqlModal: () => void,
 * }} props
 */
export default function TopNav({
  boardTitle,
  onTitleChange,
  saveStatus,
  zoom,
  onResetZoom,
  collaborators,
  currentUser,
  onOpenExport,
  onOpenSqlModal,
}) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(boardTitle)

  const handleTitleSubmit = () => {
    setEditingTitle(false)
    if (titleInput.trim()) {
      onTitleChange(titleInput.trim())
    } else {
      setTitleInput(boardTitle)
    }
  }

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Room link copied! Share with collaborators to draw live 👥')
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-13 px-4 z-40 bg-white/95 backdrop-blur-md border-b border-[#e9ecef] flex items-center justify-between gap-3 select-none">
      {/* Left: Brand + Title + Save indicator */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Brand Icon */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-[#1971c2] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            SB
          </div>
          <span className="font-bold text-sm tracking-tight text-[#212529] hidden sm:inline">
            Sync<span className="text-[#1971c2]">Board</span>
          </span>
        </div>

        <div className="w-px h-4 bg-[#e9ecef] shrink-0" />

        {/* Editable Board Title */}
        <div className="min-w-0 max-w-[200px] sm:max-w-xs">
          {editingTitle ? (
            <input
              type="text"
              autoFocus
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit()
                if (e.key === 'Escape') {
                  setTitleInput(boardTitle)
                  setEditingTitle(false)
                }
              }}
              className="px-1.5 py-0.5 rounded text-xs font-semibold text-[#212529] bg-[#f1f3f5] outline-none border border-[#1971c2]"
            />
          ) : (
            <button
              onClick={() => {
                setTitleInput(boardTitle)
                setEditingTitle(true)
              }}
              className="px-1.5 py-0.5 rounded text-xs font-semibold text-[#212529] hover:bg-[#f1f3f5] truncate text-left max-w-full block"
              title="Click to rename"
            >
              {boardTitle || 'Untitled Board'}
            </button>
          )}
        </div>

        {/* Save Status Indicator */}
        <div className="hidden md:flex items-center gap-1.5 text-[11px] text-[#868e96] shrink-0">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              saveStatus === 'saving'
                ? 'bg-amber-500 animate-pulse'
                : 'bg-[#2f9e44]'
            }`}
          />
          <span>{saveStatus === 'saving' ? 'Saving...' : 'Saved to Supabase'}</span>
        </div>
      </div>

      {/* Right Controls: Zoom + Collaborators + Share + Export + SQL */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Zoom Reset Pill */}
        <button
          onClick={onResetZoom}
          title="Click to reset zoom to 100%"
          className="px-2 py-1 rounded-lg hover:bg-[#f1f3f5] text-[11px] font-semibold text-[#868e96] hover:text-[#212529] transition-colors flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{Math.round(zoom * 100)}%</span>
        </button>

        <div className="w-px h-4 bg-[#e9ecef]" />

        {/* Active Collaborator Avatars */}
        <div className="flex items-center -space-x-1.5 overflow-hidden">
          {/* Current user avatar */}
          <div
            className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
            style={{ backgroundColor: currentUser?.color || '#1971c2' }}
            title={`You (${currentUser?.name})`}
          >
            {currentUser?.name?.[0] || 'Y'}
          </div>

          {/* Connected peers */}
          {collaborators.map((peer) => (
            <div
              key={peer.id}
              className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-xs animate-in fade-in"
              style={{ backgroundColor: peer.color || '#2f9e44' }}
              title={peer.name}
            >
              {peer.name?.[0] || 'C'}
            </div>
          ))}
        </div>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="px-2.5 py-1.5 rounded-lg bg-[#1971c2] hover:bg-[#1864ab] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>

        {/* Export Button */}
        <button
          onClick={onOpenExport}
          className="px-2.5 py-1.5 rounded-lg border border-[#e9ecef] hover:bg-[#f1f3f5] text-[#212529] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-[#868e96]" />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* Supabase Schema Modal Button */}
        <button
          onClick={onOpenSqlModal}
          title="Supabase Schema & Architecture"
          className="p-1.5 rounded-lg hover:bg-[#f1f3f5] text-[#868e96] hover:text-[#212529] transition-colors cursor-pointer"
        >
          <Database className="w-4 h-4 text-[#1971c2]" />
        </button>
      </div>
    </header>
  )
}
