'use client'

import { useState } from 'react'
import { X, Lock, KeyRound, Unlock, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Modal to unlock full edit permissions for a protected or read-only board.
 * Requires either the Room Passcode or the Editor Key.
 *
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onUnlock: (passwordInput: string) => boolean,
 *   hasPassword?: boolean,
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

    if (!password.trim()) {
      setError(true)
      toast.error('Kripya Room Passcode ya Editor Key enter karein.')
      return
    }

    const success = onUnlock(password.trim())
    if (success) {
      toast.success('Edit access unlocked! 🎨 Happy collaborating!')
      setPassword('')
      onClose()
    } else {
      setError(true)
      toast.error('Galat passcode ya Editor Key! Kripya room host se access maangein.')
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
                Unlock Edit Access
              </h3>
              <p className="text-[11px] text-[#868e96]">
                Enter passcode or editor key to draw
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
          <div>
            <label className="text-[11px] font-semibold text-[#495057] uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#1971c2]" />
              {hasPassword ? 'Room Passcode or Editor Key' : 'Editor Key or Passcode'}
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
                placeholder={hasPassword ? 'Enter room passcode...' : 'Enter 8-digit editor key...'}
                className={`w-full px-3 py-2 pr-9 text-xs rounded-xl border bg-[#f8f9fa] outline-none font-mono transition-all ${
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
            {error ? (
              <p className="text-[11px] text-red-500 mt-1.5 font-medium">
                Invalid passcode or key. Kripya room host se access maangein.
              </p>
            ) : (
              <p className="text-[11px] text-[#868e96] mt-1.5">
                Ye canvas View-Only hai. Draw karne ke liye host dwara diya gaya room passcode ya editor key enter karein.
              </p>
            )}
          </div>

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
              <span>Unlock Access</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
