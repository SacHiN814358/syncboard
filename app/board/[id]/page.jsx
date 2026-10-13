'use client'

import { use } from 'react'
import BoardWorkspace from '@/features/board/BoardWorkspace'

export default function BoardPage({ params }) {
  const resolvedParams = use(params)
  const roomId = resolvedParams?.id || 'demo-room'

  return <BoardWorkspace roomId={roomId} />
}
