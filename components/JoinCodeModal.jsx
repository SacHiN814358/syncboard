'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, KeyRound, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Modal to quickly enter a room code and join an existing board.
 *
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 * }} props
 */
export default function JoinCodeModal({ isOpen, onClose }) {
  const [code, setCode] = useState('')
  const router = useRouter()

  if (!isOpen) return null

  const handleJoin = (e) => {
    e?.preventDefault()
    const cleanCode = code.trim().toUpperCase()
    if (!cleanCode) {
      toast.error('Please enter a room code')
      return
    }
    if (cleanCode.length < 3) {
      toast.error('Invalid room code')
      return
    }

    toast.loading(`Joining room ${cleanCode}...`, { id: 'joining-room' })
    onClose()
    router.push(`/board/${cleanCode}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-[#e9ecef] max-w-sm w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[#f1f3f5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#e7f5ff] text-[#1971c2] flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-[#212529]">Join Whiteboard</h2>
              <p className="text-[11px] text-[#868e96]">Enter collaborator's room code</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#868e96] hover:text-[#212529] hover:bg-[#f1f3f5] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleJoin} className="p-5 space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-[#495057] uppercase tracking-wider block mb-1.5">
              Room Code
            </label>
            <input
              type="text"
              autoFocus
              placeholder="e.g. 7X2K9P"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2.5 rounded-xl border border-[#ced4da] font-mono text-center text-lg font-bold tracking-widest text-[#212529] uppercase focus:outline-none focus:border-[#1971c2] focus:ring-2 focus:ring-[#1971c2]/20"
              maxLength={12}
            />
            <p className="text-[11px] text-[#868e96] mt-1.5 text-center">
              Aapke friend ne jo 6-digit code share kiya hai, wo yahan dalein.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-[#e9ecef] hover:bg-[#f8f9fa] text-xs font-semibold text-[#495057] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-xl bg-[#1971c2] hover:bg-[#1864ab] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <span>Join Canvas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
