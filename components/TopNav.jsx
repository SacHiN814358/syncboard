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
  Sparkles,
  Radio,
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
  onOpenAiDiagram,
  isPresenter = false,
  onTogglePresenter,
  activePresenter = null,
  onFollowPresenter,
  followingUser = null,
  onStopFollowing,
  isHost = false,
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
    <>
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

      {/* Right Controls: AI + New + Join + Invite + Collaborators + Zoom + Export */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* AI Diagram Button */}
        <button
          onClick={onOpenAiDiagram}
          title="Generate smart flowcharts, mind maps & diagrams with AI"
          className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs hover:shadow-sm cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-200 animate-pulse" />
          <span className="hidden sm:inline">AI Diagram</span>
        </button>

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

        {/* Follow Active Presenter Quick Pill */}
        {activePresenter && !followingUser && !isPresenter && (
          <button
            onClick={() => onFollowPresenter?.(activePresenter)}
            className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer animate-pulse"
            title={`Click to follow ${activePresenter.name}'s view`}
          >
            <Radio className="w-3.5 h-3.5 text-rose-600" />
            <span>Follow {activePresenter.name}</span>
          </button>
        )}

        {/* Presenter / Follow Me Button */}
        <button
          onClick={onTogglePresenter}
          title={
            isPresenter
              ? 'Click to stop broadcasting your view'
              : 'Broadcast your view to all collaborators (Follow Me)'
          }
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
            isPresenter
              ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
              : 'border border-[#dee2e6] hover:bg-[#f8f9fa] text-[#495057]'
          }`}
        >
          <Radio className={`w-3.5 h-3.5 ${isPresenter ? 'text-white' : 'text-rose-500'}`} />
          <span className="hidden sm:inline">{isPresenter ? 'Broadcasting' : 'Present'}</span>
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
        <div
          onClick={onOpenInvite}
          className="flex items-center -space-x-1.5 overflow-hidden cursor-pointer hover:opacity-85 transition-opacity"
          title="Click to view & manage members"
        >
          {/* Current user avatar */}
          <div
            className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-xs ${
              isPresenter ? 'ring-2 ring-rose-500 ring-offset-1' : ''
            }`}
            style={{ backgroundColor: currentUser?.color || '#1971c2' }}
            title={isHost ? `You (Host 👑)` : `You (${currentUser?.name})`}
          >
            {currentUser?.name?.[0] || 'Y'}
          </div>

          {/* Connected peers */}
          {collaborators.map((peer) => {
            const isPeerPresenting = activePresenter?.userId === peer.id
            return (
              <div
                key={peer.id}
                onClick={(e) => {
                  if (isPeerPresenting) {
                    e.stopPropagation()
                    onFollowPresenter?.(activePresenter)
                  }
                }}
                className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-xs animate-in fade-in transition-transform hover:scale-110 ${
                  isPeerPresenting ? 'ring-2 ring-rose-500 ring-offset-1 animate-pulse' : ''
                }`}
                style={{ backgroundColor: peer.color || '#2f9e44' }}
                title={
                  isPeerPresenting
                    ? `${peer.name} is Presenting! (Click to follow)`
                    : `${peer.name} (Online)`
                }
              >
                {peer.name?.[0] || 'C'}
              </div>
            )
          })}
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

    {/* Floating Banner 1: Someone is Presenting & You are NOT following yet */}
    {activePresenter && !followingUser && !isPresenter && (
      <div className="fixed top-15 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-[#18181b]/95 backdrop-blur-md text-white text-xs font-medium shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-3 border border-rose-500/40 select-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          <span>🎥 <strong className="text-rose-400 font-semibold">{activePresenter.name}</strong> is presenting</span>
        </div>
        <button
          onClick={() => onFollowPresenter?.(activePresenter)}
          className="px-3 py-1 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1 active:scale-95"
        >
          <Radio className="w-3.5 h-3.5 text-white" />
          <span>Follow View</span>
        </button>
      </div>
    )}

    {/* Floating Banner 2: Currently Following Presenter */}
    {followingUser && (
      <div className="fixed top-15 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-[#18181b]/95 backdrop-blur-md text-white text-xs font-medium shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-2 border border-emerald-500/40 select-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Following <strong className="text-emerald-300 font-semibold">{followingUser.name}</strong>&apos;s camera</span>
        </div>
        <button
          onClick={onStopFollowing}
          className="px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-[11px] font-bold text-white transition-colors cursor-pointer"
        >
          Stop Following
        </button>
      </div>
    )}
  </>
  )
}
