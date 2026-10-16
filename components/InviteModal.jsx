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
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Edit3,
} from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Clean invite modal for sharing Editor & Viewer Links, Room Code, and managing Passcode & Collaborators.
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
 *   roomPassword?: string,
 *   onSetRoomPassword?: (pwd: string) => void,
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
  roomPassword = '',
  onSetRoomPassword,
}) {
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedEditorLink, setCopiedEditorLink] = useState(false)
  const [copiedViewerLink, setCopiedViewerLink] = useState(false)
  const [pwdInput, setPwdInput] = useState(roomPassword || '')
  const [showPwd, setShowPwd] = useState(false)

  if (!isOpen) return null

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const editorLink = `${origin}/board/${roomId}`
  const viewerLink = `${origin}/board/${roomId}?mode=view`

  const handleCopyCode = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(roomId)
      setCopiedCode(true)
      toast.success(`Room Code ${roomId} copied! 📋`)
      setTimeout(() => setCopiedCode(false), 2500)
    }
  }

  const handleCopyEditorLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(editorLink)
      setCopiedEditorLink(true)
      toast.success('Editor link copied! ✏️ Anyone with link can draw')
      setTimeout(() => setCopiedEditorLink(false), 2500)
    }
  }

  const handleCopyViewerLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(viewerLink)
      setCopiedViewerLink(true)
      toast.success('Viewer link copied! 👁️ View-only access')
      setTimeout(() => setCopiedViewerLink(false), 2500)
    }
  }

  const handleSavePassword = (e) => {
    e.preventDefault()
    const trimmed = pwdInput.trim()
    onSetRoomPassword?.(trimmed)
    if (trimmed) {
      toast.success('Room passcode updated! 🔒 Guests need code to edit')
    } else {
      toast.success('Room passcode removed! 🔓 Open access restored')
    }
  }

  const handleRemovePassword = () => {
    setPwdInput('')
    onSetRoomPassword?.('')
    toast.success('Room passcode removed! 🔓')
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
        className="bg-white rounded-2xl shadow-2xl border border-[#e9ecef] max-w-lg w-full overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#f1f3f5] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#e7f5ff] text-[#1971c2] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-bold text-sm text-[#212529]">
                  Share & Members
                </h2>
                {isHost && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#1971c2] bg-[#e7f5ff] px-1.5 py-0.5 rounded-full border border-[#d0ebff]">
                    <Crown className="w-2.5 h-2.5 text-amber-500" />
                    Host
                  </span>
                )}
                {roomPassword && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                    <Lock className="w-2.5 h-2.5 text-amber-600" />
                    Protected
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#868e96] truncate max-w-[260px]">
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

        {/* Scrollable Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Dual Shareable Links Section */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-semibold text-[#495057] uppercase tracking-wider block flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-[#1971c2]" />
              Shareable Links
            </label>

            {/* Editor Link */}
            <div className="p-2.5 rounded-xl bg-[#f8f9fa] border border-[#e9ecef] hover:border-[#ced4da] transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-[#212529] flex items-center gap-1.5">
                  <Edit3 className="w-3 h-3 text-[#1971c2]" />
                  <span>Editor Link</span>
                  <span className="text-[10px] font-normal text-[#868e96]">(Can draw & edit)</span>
                </span>
                <button
                  onClick={handleCopyEditorLink}
                  className="px-2.5 py-1 rounded-lg bg-[#1971c2] hover:bg-[#1864ab] text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                >
                  {copiedEditorLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedEditorLink ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={editorLink}
                className="w-full text-[11px] text-[#495057] bg-white border border-[#dee2e6] rounded-md px-2 py-1 font-mono truncate select-all outline-none"
              />
            </div>

            {/* Viewer Link (Read-Only) */}
            <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/80 hover:border-amber-300 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-amber-950 flex items-center gap-1.5">
                  <Eye className="w-3 h-3 text-amber-600" />
                  <span>Viewer Link</span>
                  <span className="text-[10px] font-normal text-amber-700">(Read-only for clients/viewers)</span>
                </span>
                <button
                  onClick={handleCopyViewerLink}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                >
                  {copiedViewerLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedViewerLink ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={viewerLink}
                className="w-full text-[11px] text-amber-900 bg-white border border-amber-200 rounded-md px-2 py-1 font-mono truncate select-all outline-none"
              />
            </div>
          </div>

          {/* Room Code Section */}
          <div>
            <label className="text-[11px] font-semibold text-[#495057] uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#1971c2]" />
              Unique Room Code
            </label>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-[#f8f9fa] border border-[#dee2e6]">
              <span className="font-mono text-lg font-bold tracking-widest text-[#1971c2] px-2 flex-1 select-all">
                {roomId}
              </span>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-lg border border-[#ced4da] hover:bg-white text-[#212529] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-[#2f9e44]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>
          </div>

          {/* Room Passcode Section (Host controls or Viewer indicator) */}
          <div className="pt-2 border-t border-[#f1f3f5]">
            {isHost ? (
              <form onSubmit={handleSavePassword} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-[#495057] uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#1971c2]" />
                    <span>Room Password Protection</span>
                  </label>
                  {roomPassword ? (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#868e96]">No password</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={pwdInput}
                      onChange={(e) => setPwdInput(e.target.value)}
                      placeholder={roomPassword ? 'Change room passcode...' : 'Set room passcode (optional)...'}
                      className="w-full text-xs px-3 py-2 pr-8 rounded-xl border border-[#dee2e6] bg-[#f8f9fa] focus:bg-white focus:border-[#1971c2] outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((prev) => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#868e96] hover:text-[#212529] p-0.5"
                    >
                      {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-xl bg-[#212529] hover:bg-black text-white text-xs font-semibold cursor-pointer transition-colors shrink-0"
                  >
                    Save
                  </button>
                  {roomPassword && (
                    <button
                      type="button"
                      onClick={handleRemovePassword}
                      className="px-2.5 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer shrink-0"
                      title="Remove password protection"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-[#868e96] leading-relaxed">
                  Password set hone par naye users canvas ko sirf dekh (view) payenge. Draw karne ke liye unhe ye password enter karna hoga.
                </p>
              </form>
            ) : roomPassword ? (
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-950">Password Protected Room</p>
                  <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                    Is board par passcode laga hua hai. Edit karne ke liye room passcode ki zaroorat hoti hai.
                  </p>
                </div>
              </div>
            ) : null}
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
