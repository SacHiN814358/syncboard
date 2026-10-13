'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus,
  KeyRound,
  ArrowRight,
  Clock,
  Sparkles,
  Users,
  Paintbrush,
  Share2,
  Trash2,
} from 'lucide-react'
import { Toaster, toast } from 'react-hot-toast'
import { generateRoomCode } from '@/lib/utils'

export default function HomePage() {
  const router = useRouter()
  const [joinCode, setJoinCode] = useState('')
  const [recentBoards, setRecentBoards] = useState([])
  const [isCreating, setIsCreating] = useState(false)

  // Load recent boards from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('syncboard_recent_boards')
      if (saved) {
        setRecentBoards(JSON.parse(saved))
      }
    } catch (_) {}
  }, [])

  // 1. Create a brand new unique board
  const handleCreateBoard = () => {
    setIsCreating(true)
    const newCode = generateRoomCode()
    toast.success(`Generated Room Code: ${newCode} 🎨`)
    router.push(`/board/${newCode}`)
  }

  // 2. Join an existing board with code
  const handleJoinBoard = (e) => {
    e?.preventDefault()
    const clean = joinCode.trim().toUpperCase()
    if (!clean) {
      toast.error('Please enter a room code')
      return
    }
    if (clean.length < 3) {
      toast.error('Room code must be at least 3 characters')
      return
    }

    toast.loading(`Joining board ${clean}...`, { id: 'join-toast' })
    router.push(`/board/${clean}`)
  }

  // 3. Remove a board from recent list
  const handleRemoveRecent = (e, boardId) => {
    e.stopPropagation()
    const updated = recentBoards.filter((b) => b.id !== boardId)
    setRecentBoards(updated)
    try {
      localStorage.setItem('syncboard_recent_boards', JSON.stringify(updated))
      toast.success('Removed from recent boards')
    } catch (_) {}
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#212529] flex flex-col justify-between selection:bg-[#1971c2] selection:text-white">
      <Toaster position="bottom-right" />

      {/* Top Header */}
      <header className="h-16 px-6 border-b border-[#e9ecef] bg-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1971c2] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            SB
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-[#212529]">
              Sync<span className="text-[#1971c2]">Board</span>
            </span>
            <span className="ml-2 text-[11px] font-semibold text-[#868e96] bg-[#f1f3f5] px-2 py-0.5 rounded-full">
              Real-time Canvas
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-[#495057]">
          <span className="hidden sm:inline text-[#868e96]">Multiplayer Powered by Supabase</span>
          <a
            href="https://github.com/SacHiN814358/syncboard"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#1971c2] font-semibold transition-colors"
          >
            GitHub
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-10 sm:py-16 flex flex-col justify-center">
        {/* Hero Section */}
        <div className="text-center max-w-xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e7f5ff] text-[#1971c2] text-xs font-semibold mb-4 border border-[#d0ebff]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Paint, Sketch & Collaborate Live</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#212529] mb-3">
            Real-Time Collaborative Whiteboard
          </h1>
          <p className="text-sm text-[#868e96] leading-relaxed">
            Create an instant room, share your 6-digit code or link, and paint together with live strokes, shapes, and remote cursors.
          </p>
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
          {/* Action 1: Create New Board */}
          <div className="bg-white rounded-2xl p-6 border border-[#e9ecef] shadow-sm hover:border-[#1971c2]/50 hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#e7f5ff] text-[#1971c2] flex items-center justify-center mb-4">
                <Paintbrush className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-[#212529] mb-1.5">
                Create New Board
              </h2>
              <p className="text-xs text-[#868e96] leading-relaxed mb-6">
                Start a fresh, private workspace with a unique room code. Anyone you invite can draw with you simultaneously.
              </p>
            </div>

            <button
              onClick={handleCreateBoard}
              disabled={isCreating}
              className="w-full py-3 px-4 rounded-xl bg-[#1971c2] hover:bg-[#1864ab] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isCreating ? 'Creating Workspace...' : 'Create New Whiteboard'}</span>
            </button>
          </div>

          {/* Action 2: Join with Code */}
          <div className="bg-white rounded-2xl p-6 border border-[#e9ecef] shadow-sm hover:border-[#1971c2]/50 hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#ebfbee] text-[#2f9e44] flex items-center justify-center mb-4">
                <KeyRound className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-[#212529] mb-1.5">
                Join with Room Code
              </h2>
              <p className="text-xs text-[#868e96] leading-relaxed mb-4">
                Collaborator ne aapko code bheja hai? 6-digit code enter karke unke canvas me live join ho jayein.
              </p>
            </div>

            <form onSubmit={handleJoinBoard} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="ENTER CODE (e.g. 7X2K9P)"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full py-2.5 px-3.5 rounded-xl border border-[#ced4da] font-mono text-center text-sm font-bold tracking-widest text-[#212529] uppercase placeholder:font-sans placeholder:tracking-normal placeholder:font-normal placeholder:text-xs placeholder:text-[#adb5bd] focus:outline-none focus:border-[#1971c2] focus:ring-2 focus:ring-[#1971c2]/15"
                  maxLength={12}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-[#212529] hover:bg-black text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <span>Join Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Recent Boards Section (if any) */}
        {recentBoards.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-[#e9ecef] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#495057] uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-[#868e96]" />
                <span>Your Recent Boards</span>
              </div>
              <span className="text-xs text-[#868e96]">
                {recentBoards.length} board{recentBoards.length > 1 ? 's' : ''} saved locally
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {recentBoards.map((b) => (
                <div
                  key={b.id}
                  onClick={() => router.push(`/board/${b.id}`)}
                  className="p-3.5 rounded-xl bg-[#f8f9fa] hover:bg-[#e7f5ff] border border-[#e9ecef] hover:border-[#74c0fc] transition-all cursor-pointer group flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-xs text-[#212529] truncate group-hover:text-[#1971c2] transition-colors">
                      {b.title || 'Untitled Board'}
                    </span>
                    <button
                      onClick={(e) => handleRemoveRecent(e, b.id)}
                      className="p-1 rounded text-[#adb5bd] hover:text-[#e03131] hover:bg-white transition-colors"
                      title="Remove from recents"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#868e96]">
                    <span className="font-mono font-bold text-[#1971c2] bg-white px-1.5 py-0.5 rounded border border-[#dee2e6]">
                      {b.id}
                    </span>
                    <span>
                      {new Date(b.lastVisited).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-[#868e96] border-t border-[#e9ecef] bg-white">
        SyncBoard — Real-Time Canvas with Paint Tools & Supabase Multiplayer
      </footer>
    </div>
  )
}
