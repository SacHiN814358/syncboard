'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Share2,
  Download,
  Database,
  RotateCcw,
  Plus,
  KeyRound,
  Copy,
  Check,
} from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Top navigation bar inspired by Linear & Figma.
 *
 * @param {{
 *   roomId: string,
 *   boardTitle: string,
 *   onTitleChange: (newTitle: string) => void,
 *   saveStatus: 'saved' | 'saving' | 'offline',
 *   zoom: number,
 *   onResetZoom: () => void,
 *   collaborators: any[],
 *   currentUser: any,
 *   onOpenExport: () => void,
 *   onOpenSqlModal: () => void,
 *   onOpenInvite: () => void,
 *   onOpenJoinCode: () => void,
 *   onNewBoard: () => void,
 * }} props
 */
export default function TopNav({
  roomId,
  boardTitle,
  onTitleChange,
  saveStatus,
  zoom,
  onResetZoom,
  collaborators,
  currentUser,
  onOpenExport,
  onOpenSqlModal,
  onOpenInvite,
  onOpenJoinCode,
  onNewBoard,
}) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(boardTitle)
  const [copiedCode, setCopiedCode] = useState(false)

  const handleTitleSubmit = () => {
    setEditingTitle(false)
    if (titleInput.trim()) {
      onTitleChange(titleInput.trim())
    } else {
      setTitleInput(boardTitle)
    }
  }

  const handleQuickCopyCode = (e) => {
    e.stopPropagation()
    if (typeof window !== 'undefined' && roomId) {
      navigator.clipboard.writeText(roomId)
      setCopiedCode(true)
      toast.success(`Room Code ${roomId} copied! Send to collaborator 📋`)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-13 px-3 sm:px-4 z-40 bg-white/95 backdrop-blur-md border-b border-[#e9ecef] flex items-center justify-between gap-2 sm:gap-3 select-none">
      {/* Left: Brand + Code Badge + Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Brand Home Link */}
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0 group hover:opacity-90 transition-opacity"
          title="Back to Home / All Boards"
        >
          <div className="w-7 h-7 rounded-lg bg-[#1971c2] text-white flex items-center justify-center font-bold text-xs shadow-xs group-hover:scale-105 transition-transform">
            SB
          </div>
          <span className="font-bold text-sm tracking-tight text-[#212529] hidden md:inline">
            Sync<span className="text-[#1971c2]">Board</span>
          </span>
        </Link>

        <div className="w-px h-4 bg-[#e9ecef] shrink-0" />

        {/* Room Code Pill (Click to copy & view invite) */}
        {roomId && (
          <button
            onClick={onOpenInvite}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#f1f3f5] hover:bg-[#e7f5ff] text-[#495057] hover:text-[#1971c2] transition-colors border border-[#dee2e6] text-[11px] font-mono shrink-0 cursor-pointer"
            title="Click to share room invitation"
          >
            <KeyRound className="w-3 h-3 text-[#1971c2]" />
            <span className="font-bold">{roomId}</span>
            <span
              onClick={handleQuickCopyCode}
              className="p-0.5 rounded hover:bg-white text-[#868e96] hover:text-[#1971c2] ml-0.5"
              title="Copy code"
            >
              {copiedCode ? <Check className="w-3 h-3 text-[#2f9e44]" /> : <Copy className="w-3 h-3" />}
            </span>
          </button>
        )}

        {/* Editable Board Title */}
        <div className="min-w-0 max-w-[140px] sm:max-w-[200px]">
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
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-[#868e96] shrink-0">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              saveStatus === 'saving'
                ? 'bg-amber-500 animate-pulse'
                : 'bg-[#2f9e44]'
            }`}
          />
          <span>{saveStatus === 'saving' ? 'Saving...' : 'Saved'}</span>
        </div>
      </div>

      {/* Right Controls: New + Join + Invite + Collaborators + Zoom + Export */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* New Board Button */}
        <button
          onClick={onNewBoard}
          title="Create brand new private board with new code"
          className="px-2 py-1.5 rounded-lg border border-[#e9ecef] hover:bg-[#f8f9fa] text-[#495057] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-[#1971c2]" />
          <span className="hidden sm:inline">New Board</span>
        </button>

        {/* Join Code Button */}
        <button
          onClick={onOpenJoinCode}
          title="Enter another room code"
          className="px-2 py-1.5 rounded-lg border border-[#e9ecef] hover:bg-[#f8f9fa] text-[#495057] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
        >
          <KeyRound className="w-3.5 h-3.5 text-[#868e96]" />
          <span className="hidden sm:inline">Join Code</span>
        </button>

        {/* Invite / Share Button */}
        <button
          onClick={onOpenInvite}
          className="px-2.5 py-1.5 rounded-lg bg-[#1971c2] hover:bg-[#1864ab] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          title="Invite collaborators with Room Code"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Invite</span>
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

        {/* Zoom Reset Pill */}
        <button
          onClick={onResetZoom}
          title="Click to reset zoom to 100%"
          className="hidden md:flex px-1.5 py-1 rounded-lg hover:bg-[#f1f3f5] text-[11px] font-semibold text-[#868e96] hover:text-[#212529] transition-colors items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{Math.round(zoom * 100)}%</span>
        </button>

        {/* Export Button */}
        <button
          onClick={onOpenExport}
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-[#e9ecef] hover:bg-[#f1f3f5] text-[#212529] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Export as PNG or JSON"
        >
          <Download className="w-3.5 h-3.5 text-[#868e96]" />
          <span className="hidden md:inline">Export</span>
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
