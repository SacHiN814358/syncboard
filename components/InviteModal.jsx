'use client'

import { useState } from 'react'
import {
  X,
  Copy,
  Check,
  Users,
  Link2,
  KeyRound,
  UserMinus,
  Crown,
  Shield,
} from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Clean invite modal for sharing the Room Code and managing collaborators.
 *
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   roomId: string,
 *   boardTitle: string,
 *   collaborators: any[],
 *   currentUser: any,
 *   isHost: boolean,
 *   onKickUser: (userId: string, userName: string) => void,
 * }} props
 */
export default function InviteModal({
  isOpen,
  onClose,
  roomId,
  boardTitle,
  collaborators,
  currentUser,
  isHost = false,
  onKickUser,
}) {
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  if (!isOpen) return null

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const directLink = `${origin}/board/${roomId}`

  const handleCopyCode = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(roomId)
      setCopiedCode(true)
      toast.success(`Room Code ${roomId} copied! 📋`)
      setTimeout(() => setCopiedCode(false), 2500)
    }
  }

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(directLink)
      setCopiedLink(true)
      toast.success('Direct room link copied! 🔗')
      setTimeout(() => setCopiedLink(false), 2500)
    }
  }

  const handleRemove = (peerId, peerName) => {
    if (confirm(`Kya aap "${peerName}" ko is workspace se remove karna chahte hain?`)) {
      onKickUser?.(peerId, peerName)
      toast.success(`Removed ${peerName} from whiteboard 🚫`)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-[#e9ecef] max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#f1f3f5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#e7f5ff] text-[#1971c2] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-bold text-sm text-[#212529]">
                  Workspace Members
                </h2>
                {isHost && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#1971c2] bg-[#e7f5ff] px-1.5 py-0.5 rounded-full border border-[#d0ebff]">
                    <Crown className="w-2.5 h-2.5" />
                    Host
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#868e96] truncate max-w-[240px]">
                {boardTitle || 'Untitled Board'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#868e96] hover:text-[#212529] hover:bg-[#f1f3f5] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Room Code Section */}
          <div>
            <label className="text-[11px] font-semibold text-[#495057] uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#1971c2]" />
              Unique Room Code
            </label>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#f8f9fa] border border-[#dee2e6]">
              <span className="font-mono text-xl font-bold tracking-widest text-[#1971c2] px-2 flex-1 select-all">
                {roomId}
              </span>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-lg bg-[#1971c2] hover:bg-[#1864ab] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>
            <p className="text-[11px] text-[#868e96] mt-1.5">
              Dusre user ko ye code dein — wo website par jakar ye code enter karenge toh directly is canvas me add ho jayenge.
            </p>
          </div>

          {/* Direct Link Section */}
          <div>
            <label className="text-[11px] font-semibold text-[#495057] uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-[#868e96]" />
              Direct Invite Link
            </label>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#f8f9fa] border border-[#e9ecef]">
              <input
                type="text"
                readOnly
                value={directLink}
                className="text-xs text-[#495057] bg-transparent outline-none flex-1 font-mono truncate px-1 select-all"
              />
              <button
                onClick={handleCopyLink}
                className="px-2.5 py-1 rounded-md border border-[#ced4da] hover:bg-white text-xs font-semibold text-[#212529] transition-colors cursor-pointer"
              >
                {copiedLink ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Connected Collaborators & Host Moderation */}
          <div className="pt-2 border-t border-[#f1f3f5]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#495057] flex items-center gap-1.5">
                <span>Live Collaborators ({collaborators.length + 1})</span>
                {isHost && (
                  <span className="text-[10px] text-[#1971c2] font-semibold bg-[#e7f5ff] px-1.5 py-0.5 rounded">
                    Admin Controls Active
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-[#2f9e44] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2f9e44] animate-pulse" />
                Live Sync
              </span>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
              {/* You */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#f8f9fa] border border-[#e9ecef] text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs shrink-0"
                    style={{ backgroundColor: currentUser?.color || '#1971c2' }}
                  >
                    {currentUser?.name?.[0] || 'Y'}
                  </div>
                  <div>
                    <span className="font-semibold text-[#212529]">
                      {currentUser?.name || 'You'}
                    </span>
                    <span className="ml-1 text-[10px] text-[#868e96]">(You)</span>
                  </div>
                </div>
                <span className="text-[10px] text-[#1971c2] bg-white px-2 py-0.5 rounded-full border border-[#dee2e6] font-semibold flex items-center gap-1">
                  {isHost ? (
                    <>
                      <Crown className="w-2.5 h-2.5 text-amber-500" />
                      Host
                    </>
                  ) : (
                    'Member'
                  )}
                </span>
              </div>

              {/* Peers */}
              {collaborators.map((peer) => (
                <div
                  key={peer.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-[#f8f9fa] border border-[#e9ecef] hover:border-[#ced4da] transition-all text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs shrink-0"
                      style={{ backgroundColor: peer.color || '#2f9e44' }}
                    >
                      {peer.name?.[0] || 'C'}
                    </div>
                    <div className="truncate">
                      <span className="font-medium text-[#212529] block truncate">
                        {peer.name}
                      </span>
                      <span className="text-[10px] text-[#2f9e44] block">
                        Drawing live
                      </span>
                    </div>
                  </div>

                  {/* Host Power: Remove/Kick Button */}
                  {isHost ? (
                    <button
                      onClick={() => handleRemove(peer.id, peer.name)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#e03131] hover:text-white hover:bg-[#e03131] bg-[#fff5f5] border border-[#ffc9c9] transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
                      title={`Remove ${peer.name} from room`}
                    >
                      <UserMinus className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-[#868e96] bg-white px-1.5 py-0.5 rounded border border-[#e9ecef]">
                      Member
                    </span>
                  )}
                </div>
              ))}

              {collaborators.length === 0 && (
                <div className="p-3 text-center rounded-xl bg-[#f8f9fa] border border-dashed border-[#dee2e6] text-xs text-[#868e96]">
                  Aapke alawa abhi koi aur connect nahi hua hai. Code share karein!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#f8f9fa] border-t border-[#f1f3f5] flex items-center justify-between">
          <p className="text-[11px] text-[#868e96]">
            {isHost ? '👑 As Host, you can remove any member anytime.' : 'Invited Member'}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#212529] hover:bg-black text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
