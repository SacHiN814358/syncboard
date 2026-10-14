'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Users } from 'lucide-react'

export default function ChatDrawer({
  isOpen,
  onToggle,
  messages,
  onSendMessage,
  currentUser,
  unreadCount = 0,
}) {
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef(null)

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const handleSend = (e) => {
    e?.preventDefault()
    if (!inputText.trim()) return
    onSendMessage(inputText)
    setInputText('')
  }

  return (
    <>
      {/* Floating Chat Trigger Button (Bottom Right) */}
      <button
        onClick={onToggle}
        title={isOpen ? 'Close Team Chat' : 'Open Team Chat'}
        className="fixed bottom-5 right-5 z-40 w-11 h-11 rounded-full bg-[#1971c2] hover:bg-[#1864ab] text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all cursor-pointer group"
      >
        {isOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <div className="relative flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-2.5 -right-2.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Slide-out Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-18 right-5 z-40 w-80 sm:w-90 h-[430px] rounded-2xl bg-white border border-[#dee2e6] shadow-2xl flex flex-col overflow-hidden select-none animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#e9ecef] bg-[#f8f9fa] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#e7f5ff] text-[#1971c2] flex items-center justify-center">
                <Users className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold text-[#212529]">Live Room Chat</h4>
            </div>
            <button
              onClick={onToggle}
              className="text-[#868e96] hover:text-[#212529] p-1 rounded-md hover:bg-black/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5 text-xs">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-[#adb5bd] p-4">
                <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
                <p className="font-medium text-[11px]">No messages yet</p>
                <p className="text-[10px] text-[#ced4da] mt-0.5">Start chatting with your collaborators in this room!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === currentUser?.id
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    {!isMe && (
                      <div className="flex items-center gap-1.5 mb-1 ml-0.5">
                        <div
                          className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                          style={{ backgroundColor: msg.senderColor || '#1971c2' }}
                        >
                          {msg.senderName?.[0] || 'U'}
                        </div>
                        <span className="text-[10px] font-semibold text-[#495057]">
                          {msg.senderName}
                        </span>
                        <span className="text-[9px] text-[#adb5bd]">{msg.timestamp}</span>
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-2xl break-words leading-relaxed ${
                        isMe
                          ? 'bg-[#1971c2] text-white rounded-br-xs shadow-xs'
                          : 'bg-[#f1f3f5] text-[#212529] rounded-bl-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                    {isMe && (
                      <span className="text-[9px] text-[#adb5bd] mt-0.5 mr-1">{msg.timestamp}</span>
                    )}
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={handleSend}
            className="p-2.5 border-t border-[#e9ecef] bg-white flex items-center gap-1.5"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type message..."
              className="flex-1 px-3 py-2 rounded-xl bg-[#f8f9fa] border border-[#dee2e6] text-xs text-[#212529] outline-none focus:border-[#1971c2] focus:bg-white transition-all font-sans"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-8 h-8 rounded-xl bg-[#1971c2] hover:bg-[#1864ab] text-white flex items-center justify-center disabled:opacity-40 disabled:hover:bg-[#1971c2] transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
