'use client'

import { useState } from 'react'
import { X, Sparkles, Workflow, LayoutGrid, ArrowRight, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const PRESETS = [
  {
    title: 'E-Commerce Checkout Flow',
    type: 'flowchart',
    prompt: 'E-commerce shopping cart checkout flow with address, payment verification, and order confirmation',
  },
  {
    title: 'User Authentication Flow',
    type: 'flowchart',
    prompt: 'User login and signup flow with email validation, credentials check, and dashboard redirect',
  },
  {
    title: 'Microservices Backend Architecture',
    type: 'flowchart',
    prompt: 'Microservices architecture with API Gateway, JWT auth verification, order service, and database cache',
  },
  {
    title: 'Sprint Planning Kanban Board',
    type: 'sticky-grid',
    prompt: 'Agile Kanban sprint board with To Do, In Progress, Review, and Done sticky notes',
  },
  {
    title: 'Startup Growth Strategy',
    type: 'sticky-grid',
    prompt: 'Startup launch brainstorm with product features, target audience, marketing channels, and key metrics',
  },
]

export default function AiDiagramModal({
  isOpen,
  onClose,
  onInsertElements,
  viewport,
}) {
  const [prompt, setPrompt] = useState('')
  const [diagramType, setDiagramType] = useState('flowchart') // 'flowchart' | 'sticky-grid'
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSelectPreset = (preset) => {
    setPrompt(preset.prompt)
    setDiagramType(preset.type)
  }

  const handleGenerate = async (e) => {
    e?.preventDefault()
    if (!prompt.trim()) {
      toast.error('Please enter a description or prompt for the diagram')
      return
    }

    setLoading(true)
    try {
      // Calculate placement near current viewport center
      const centerX = Math.round((-viewport.panX + (typeof window !== 'undefined' ? window.innerWidth : 1200) / 2) / viewport.zoom - 200)
      const centerY = Math.round((-viewport.panY + (typeof window !== 'undefined' ? window.innerHeight : 800) / 2) / viewport.zoom - 200)

      const res = await fetch('/api/ai-diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          diagramType,
          startX: Math.max(80, centerX),
          startY: Math.max(80, centerY),
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate diagram')
      }

      onInsertElements(data.elements)
      toast.success('✨ AI Diagram generated and added to board!')
      onClose()
      setPrompt('')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Error generating diagram')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-[#e9ecef] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e9ecef] bg-gradient-to-r from-purple-50/60 to-indigo-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#212529]">AI Diagram & Flowchart Generator</h3>
              <p className="text-[11px] text-[#868e96]">Generate connected shapes, flowcharts & notes from text</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-black/5 flex items-center justify-center text-[#868e96] hover:text-[#212529] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Format Switcher */}
          <div>
            <label className="text-[11px] font-semibold text-[#868e96] uppercase tracking-wider block mb-1.5">
              Diagram Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDiagramType('flowchart')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                  diagramType === 'flowchart'
                    ? 'border-[#1971c2] bg-[#e7f5ff] text-[#1971c2]'
                    : 'border-[#dee2e6] hover:bg-[#f8f9fa] text-[#495057]'
                }`}
              >
                <Workflow className="w-4 h-4 shrink-0" />
                <div>
                  <div className="text-xs font-semibold">Flowchart & Nodes</div>
                  <div className="text-[10px] opacity-75">Connected with magnetic arrows</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDiagramType('sticky-grid')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                  diagramType === 'sticky-grid'
                    ? 'border-[#7950f2] bg-[#f3f0ff] text-[#7950f2]'
                    : 'border-[#dee2e6] hover:bg-[#f8f9fa] text-[#495057]'
                }`}
              >
                <LayoutGrid className="w-4 h-4 shrink-0" />
                <div>
                  <div className="text-xs font-semibold">Sticky Note Grid</div>
                  <div className="text-[10px] opacity-75">Brainstorming cards & columns</div>
                </div>
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="text-[11px] font-semibold text-[#868e96] uppercase tracking-wider block mb-1.5">
              Popular Presets (Click to Load)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(item)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#f1f3f5] hover:bg-[#e9ecef] text-[#495057] transition-colors cursor-pointer"
                >
                  {item.title}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Input */}
          <div>
            <label className="text-[11px] font-semibold text-[#868e96] uppercase tracking-wider block mb-1.5">
              Describe Your Diagram or Process
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Create a user registration flowchart with email validation, password check, and welcome email..."
              rows={3}
              className="w-full p-3 rounded-xl border border-[#dee2e6] focus:border-[#7950f2] focus:ring-2 focus:ring-purple-100 text-xs text-[#212529] outline-none transition-all resize-none font-sans"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[#e9ecef] bg-[#f8f9fa]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-[#dee2e6] text-xs font-medium text-[#495057] hover:bg-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || !prompt.trim()}
            onClick={handleGenerate}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Diagram</span>
                <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
