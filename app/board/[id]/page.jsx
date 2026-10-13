'use client'

import { use } from 'react'
import BoardWorkspace from '@/features/board/BoardWorkspace'

export default function BoardPage({ params }) {
  const resolvedParams = use(params)
  const rawId = resolvedParams?.id || 'DEMO-ROOM'
  const roomId = decodeURIComponent(rawId).trim().toUpperCase()

  return <BoardWorkspace roomId={roomId} />
}
