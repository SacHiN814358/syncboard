'use client'

import { useState } from 'react'
import { X, Lock, KeyRound, Unlock, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Modal to unlock full edit permissions for a password-protected or read-only board.
 *
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onUnlock: (passwordInput: string) => boolean,
 *   hasPassword: boolean,
 * }} props
 */
export default function PasswordModal({ isOpen, onClose, onUnlock, hasPassword = false }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(false)

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(false)

    const success = onUnlock(password.trim())
    if (success) {
      toast.success('Edit access unlocked! 🎨 Happy collaborating!')
      setPassword('')
      onClose()
    } else {
      setError(true)
      toast.error('Galat passcode! Kripya sahi password enter karein.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-[#e9ecef] max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#f1f3f5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#e7f5ff] text-[#1971c2] flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#212529]">
                {hasPassword ? 'Unlock Edit Access' : 'Switch to Edit Mode'}
              </h3>
              <p className="text-[11px] text-[#868e96]">
                {hasPassword ? 'Enter room passcode to edit' : 'Switch from view-only to editor'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {hasPassword ? (
            <div>
              <label className="text-[11px] font-semibold text-[#495057] uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#1971c2]" />
                Room Passcode
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError(false)
                  }}
                  placeholder="Enter passcode..."
                  className={`w-full px-3 py-2 pr-9 text-xs rounded-xl border bg-[#f8f9fa] outline-none transition-all ${
                    error
                      ? 'border-red-400 focus:border-red-500 bg-red-50/30'
                      : 'border-[#dee2e6] focus:border-[#1971c2] focus:bg-white'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#868e96] hover:text-[#212529] p-0.5"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {error && (
                <p className="text-[11px] text-red-500 mt-1.5 font-medium">
                  Incorrect password. Kripya room host se passcode maangein.
                </p>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-[#e7f5ff]/60 border border-[#d0ebff] text-xs text-[#1971c2] flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="leading-relaxed">
                Aapne ye board <strong>Read-Only Link</strong> se open kiya hai. Is board par password nahi laga hai, aap jab chahein Edit Mode me switch kar sakte hain.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-3 rounded-xl border border-[#dee2e6] hover:bg-[#f1f3f5] text-[#495057] text-xs font-semibold transition-colors cursor-pointer"
            >
              Stay as Viewer
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-3 rounded-xl bg-[#1971c2] hover:bg-[#1864ab] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>{hasPassword ? 'Unlock Access' : 'Switch to Edit'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
