'use client'

import { useState } from 'react'
import { Mic, MicOff, PhoneOff, Volume2, ChevronUp, ChevronDown } from 'lucide-react'

export default function VoiceCallBar({
  isJoined,
  isMuted,
  isSpeaking,
  voiceUsers,
  currentUser,
  onJoinVoice,
  onLeaveVoice,
  onToggleMute,
}) {
  const [minimized, setMinimized] = useState(false)
  const userList = Object.values(voiceUsers || {})
  const activeCount = userList.length

  // If no one is in voice and local user hasn't joined, don't show the floating bar
  if (!isJoined && activeCount === 0) return null

  // If someone else is in voice, but local user hasn't joined yet: show an inviting join pill
  if (!isJoined && activeCount > 0) {
    const firstUser = userList[0]
    return (
      <div className="fixed bottom-20 left-6 z-40 animate-in slide-in-from-bottom-3 fade-in duration-200">
        <button
          onClick={onJoinVoice}
          className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl hover:shadow-2xl flex items-center gap-2.5 transition-all cursor-pointer group border border-emerald-400/30"
          title="Collaborators are talking! Click to join live audio call"
        >
          <div className="relative flex items-center justify-center">
            <Mic className="w-4 h-4 text-emerald-100 group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white animate-ping" />
          </div>
          <div className="text-left text-xs font-semibold">
            <span>{firstUser?.name || 'Someone'} {activeCount > 1 ? `+${activeCount - 1} in Voice` : 'is in Voice'}</span>
            <span className="text-[10px] block font-normal text-emerald-200">Click to Join Call 🎙️</span>
          </div>
        </button>
      </div>
    )
  }

  // Local user is actively in voice call: show full interactive HUD
  return (
    <div className="fixed bottom-20 left-6 z-40 animate-in slide-in-from-bottom-4 fade-in duration-200 select-none">
      <div className="bg-[#18181b]/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-zinc-700/80 p-3 min-w-[240px] max-w-[320px]">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-bold text-zinc-100">Live Voice Call</span>
            <span className="px-1.5 py-0.2 rounded-full bg-zinc-800 text-[10px] font-mono text-zinc-400">
              {activeCount}
            </span>
          </div>

          <button
            onClick={() => setMinimized((prev) => !prev)}
            className="text-zinc-400 hover:text-white p-0.5 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
            title={minimized ? 'Expand' : 'Minimize'}
          >
            {minimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Participants List */}
        {!minimized && (
          <div className="space-y-1.5 mb-3 max-h-36 overflow-y-auto pr-1">
            {userList.map((user) => {
              const isMe = user.id === currentUser?.id
              const speaking = isMe ? isSpeaking : user.isSpeaking
              const muted = isMe ? isMuted : user.isMuted

              return (
                <div
                  key={user.id}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-xl transition-all ${
                    speaking
                      ? 'bg-emerald-950/40 border border-emerald-500/40'
                      : 'bg-zinc-900/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Avatar with speaking wave ring */}
                    <div className="relative">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs ${
                          speaking ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-zinc-900 animate-pulse' : ''
                        }`}
                        style={{ backgroundColor: user.color || '#1971c2' }}
                      >
                        {user.name?.[0] || 'U'}
                      </div>
                      {speaking && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-zinc-900" />
                      )}
                    </div>
                    <span className="text-xs font-medium text-zinc-200 truncate">
                      {isMe ? 'You' : user.name}
                    </span>
                  </div>

                  {/* Mic status icon */}
                  <div className="flex items-center shrink-0">
                    {muted ? (
                      <span className="p-1 rounded-md bg-red-500/10 text-red-400" title="Muted">
                        <MicOff className="w-3.5 h-3.5" />
                      </span>
                    ) : speaking ? (
                      <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-400 animate-pulse" title="Speaking">
                        <Volume2 className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="p-1 text-zinc-500" title="Connected">
                        <Mic className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Action Controls Bar */}
        <div className="flex items-center gap-2 pt-1">
          {/* Mute / Unmute Button */}
          <button
            onClick={onToggleMute}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
              isMuted
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? (
              <>
                <MicOff className="w-4 h-4 text-red-400" />
                <span>Unmute</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 text-emerald-400" />
                <span>Mute</span>
              </>
            )}
          </button>

          {/* End / Leave Call Button */}
          <button
            onClick={onLeaveVoice}
            className="py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
            title="Disconnect from voice call"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </div>
    </div>
  )
}
