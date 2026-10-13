'use client'

import { useState } from 'react'
import { X, Copy, Check, Database, ShieldCheck, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

const SQL_SCHEMA = `-- 🎨 SYNCBOARD — SUPABASE POSTGRESQL SCHEMA

-- Rooms Table (stores whiteboard title, JSONB elements array, and timestamps)
CREATE TABLE IF NOT EXISTS public.syncboard_rooms (
  id TEXT PRIMARY KEY,
  title TEXT DEFAULT 'Untitled Board',
  elements JSONB DEFAULT '[]'::jsonb,
  created_by TEXT DEFAULT 'anonymous',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.syncboard_rooms ENABLE ROW LEVEL SECURITY;

-- Open collaboration policies (anyone with link can view, create, and update)
DROP POLICY IF EXISTS "Anyone can view rooms" ON public.syncboard_rooms;
CREATE POLICY "Anyone can view rooms"
  ON public.syncboard_rooms FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can create rooms" ON public.syncboard_rooms;
CREATE POLICY "Anyone can create rooms"
  ON public.syncboard_rooms FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update rooms" ON public.syncboard_rooms;
CREATE POLICY "Anyone can update rooms"
  ON public.syncboard_rooms FOR UPDATE USING (true);

-- Auto-update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION update_syncboard_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS syncboard_updated_at ON public.syncboard_rooms;
CREATE TRIGGER syncboard_updated_at
  BEFORE UPDATE ON public.syncboard_rooms
  FOR EACH ROW EXECUTE FUNCTION update_syncboard_timestamp();
`

/**
 * Modal to view and copy the Supabase SQL schema for SyncBoard.
 */
export default function SqlHelpModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_SCHEMA)
    setCopied(true)
    toast.success('SQL schema copied! Run in Supabase SQL Editor.')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white border border-[#e9ecef] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e9ecef]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#e7f5ff] text-[#1971c2] flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#212529]">Supabase Database & Realtime</h3>
              <p className="text-xs text-[#868e96]">PostgreSQL JSONB schema + RLS policies</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#868e96] hover:text-[#212529] hover:bg-[#f1f3f5]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-[#f8f9fa] border border-[#e9ecef]">
              <div className="font-bold text-[#212529] flex items-center gap-1.5 mb-0.5">
                <Database className="w-3.5 h-3.5 text-[#1971c2]" /> PostgreSQL JSONB
              </div>
              <p className="text-[11px] text-[#868e96]">
                Elements are saved as structured JSON objects, allowing fast atomic updates.
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-[#f8f9fa] border border-[#e9ecef]">
              <div className="font-bold text-[#212529] flex items-center gap-1.5 mb-0.5">
                <Zap className="w-3.5 h-3.5 text-[#f08c00]" /> Realtime Broadcast
              </div>
              <p className="text-[11px] text-[#868e96]">
                Sub-30ms peer sync for live cursors and drawing strokes.
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#868e96]">
                supabase-schema.sql
              </span>
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 rounded-md bg-[#1971c2] hover:bg-[#1864ab] text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy SQL'}</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-[#212529] text-[#e7f5ff] text-xs font-mono overflow-x-auto max-h-56 leading-relaxed">
              {SQL_SCHEMA}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#f8f9fa] border-t border-[#e9ecef] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#212529] text-white text-xs font-semibold hover:bg-black"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
