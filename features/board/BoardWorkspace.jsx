'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Toaster, toast } from 'react-hot-toast'
import { UserX } from 'lucide-react'
import { createHistory } from './history'
import { DEFAULT_VIEWPORT } from './elements'
import { generateId, generateRoomCode, processImageFile } from '@/lib/utils'
import { useCollaboration } from '@/features/collaboration/useCollaboration'
import { useBoardStorage } from '@/features/persistence/useBoardStorage'
import TopNav from '@/components/TopNav'
import Toolbar from '@/components/Toolbar'
import PropertiesPanel from '@/components/PropertiesPanel'
import RemoteCursors from '@/components/RemoteCursors'
import ExportModal from '@/components/ExportModal'
import SqlHelpModal from '@/components/SqlHelpModal'
import InviteModal from '@/components/InviteModal'
import JoinCodeModal from '@/components/JoinCodeModal'
import AiDiagramModal from '@/components/AiDiagramModal'
import ChatDrawer from '@/components/ChatDrawer'
import ReactionOverlay from '@/components/ReactionOverlay'
import ReactionPicker, { EMOJI_LIST } from '@/components/ReactionPicker'
import { screenToWorld } from './viewport'
import Canvas from './Canvas'

/**
 * Main Whiteboard Workspace Container.
 * Orchestrates Canvas, Collaboration, Persistence, and Toolbars.
 *
 * @param {{ roomId: string }} props
 */
export default function BoardWorkspace({ roomId }) {
  // 1. Storage & Persistence
  const {
    boardTitle,
    setBoardTitle,
    initialLoaded,
    saveStatus,
    loadBoard,
    saveBoard,
  } = useBoardStorage(roomId)

  // 2. Document & Element State
  const [elements, setElements] = useState([])
  const historyRef = useRef(createHistory([]))

  // 3. Viewport & Tool State (Starts at 0,0 for 100% exact pixel match with mouse cursor)
  const [viewport, setViewport] = useState({
    panX: 0,
    panY: 0,
    zoom: 1,
  })
  const [activeTool, setActiveTool] = useState('pen') // Starts ready to paint!
  const [selectedElement, setSelectedElement] = useState(null)

  // 4. Drawing Style Properties
  const [currentColor, setCurrentColor] = useState('#000000') // Classic Black Paint default
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState(3.5)
  const [currentFillColor, setCurrentFillColor] = useState('transparent')
  const [currentStickyColor, setCurrentStickyColor] = useState('#fff3bf')
  const [currentFontSize, setCurrentFontSize] = useState(18)

  const router = useRouter()

  // 5. Modals State
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [sqlModalOpen, setSqlModalOpen] = useState(false)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [joinCodeModalOpen, setJoinCodeModalOpen] = useState(false)
  const [aiDiagramModalOpen, setAiDiagramModalOpen] = useState(false)

  // 6. Multi-User Live Drawing Previews & Reactions State
  const [remotePreviews, setRemotePreviews] = useState({})
  const [reactions, setReactions] = useState([])
  const [reactionsPickerOpen, setReactionsPickerOpen] = useState(false)
  const lastCursorRef = useRef({ x: 400, y: 300 })

  // 7. Follow Presenter & Realtime Chat State
  const [isPresenter, setIsPresenter] = useState(false)
  const [activePresenter, setActivePresenter] = useState(null)
  const [followingUser, setFollowingUser] = useState(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Track pointer world position for spawning reactions right at user's cursor
  useEffect(() => {
    const onMove = (e) => {
      const world = screenToWorld(e.clientX, e.clientY, viewport)
      lastCursorRef.current = world
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [viewport])

  // Host role detection (room creator / owner)
  const [isHost, setIsHost] = useState(false)
  useEffect(() => {
    if (typeof window !== 'undefined' && roomId) {
      const stored = localStorage.getItem(`syncboard_host_${roomId}`) === 'true'
      setIsHost(stored)
    }
  }, [roomId])

  // 8. Collaboration Hook (Supabase Realtime)
  const {
    currentUser,
    collaborators,
    remoteCursors,
    broadcastCursor,
    broadcastDrawPreview,
    broadcastElementsUpdate,
    broadcastReaction,
    broadcastPresenterView,
    broadcastChatMessage,
    isKicked,
    kickCollaborator,
  } = useCollaboration(roomId, {
    isHost,
    currentElements: elements,
    boardTitle: boardTitle,
    onRemoteElementsChange: (remoteElements) => {
      setElements(remoteElements)
      historyRef.current.push(remoteElements)
      saveBoard(remoteElements)
      toast.success('Board synchronized with collaborators ⚡', { id: 'peer-update', duration: 1500 })
    },
    onRemoteTitleChange: (newTitle) => {
      setBoardTitle(newTitle)
    },
    onRemoteDrawPreview: (previewData) => {
      setRemotePreviews((prev) => {
        if (!previewData?.element) {
          const next = { ...prev }
          delete next[previewData.userId]
          return next
        }
        return { ...prev, [previewData.userId]: previewData.element }
      })
    },
    onReaction: (rx) => {
      const offset = (Math.random() - 0.5) * 44
      setReactions((prev) => [...prev, { ...rx, offsetX: offset }])
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== rx.id))
      }, 2400)
    },
    onPresenterUpdate: (payload) => {
      if (payload.isPresenting === false) {
        setActivePresenter((prev) => (prev?.userId === payload.userId ? null : prev))
        setFollowingUser((prev) => {
          if (prev?.id === payload.userId) {
            toast('Presenter stopped sharing their view', { id: 'presenter-ended' })
            return null
          }
          return prev
        })
        return
      }

      // Presenter is actively broadcasting
      setActivePresenter({
        userId: payload.userId,
        name: payload.name,
        color: payload.color,
        viewport: payload.viewport,
      })

      // If user is currently following this presenter, keep camera locked smoothly
      setFollowingUser((prev) => {
        if (prev?.id === payload.userId && payload.viewport) {
          setViewport(payload.viewport)
          return prev
        }
        return prev
      })
    },
    onChatMessage: (msg) => {
      setMessages((prev) => [...prev, msg])
      setChatOpen((isOpen) => {
        if (!isOpen && msg.senderId !== currentUser?.id) {
          setUnreadCount((c) => c + 1)
          toast(`💬 ${msg.senderName}: ${msg.text.slice(0, 30)}...`, {
            id: 'chat-toast',
            duration: 2500,
          })
        }
        return isOpen
      })
    },
  })

  // Broadcast viewport changes and presence pulse when in Presenter mode
  useEffect(() => {
    if (!isPresenter) return

    broadcastPresenterView(viewport, true)
    const interval = setInterval(() => {
      broadcastPresenterView(viewport, true)
    }, 2000)

    return () => clearInterval(interval)
  }, [isPresenter, viewport, broadcastPresenterView])

  // Toggle presenter mode
  const handleTogglePresenter = useCallback(() => {
    setIsPresenter((prev) => {
      const next = !prev
      if (next) {
        setFollowingUser(null)
        setActivePresenter(null)
        toast.success('You are now presenting! Collaborators can follow your view 🎥')
        broadcastPresenterView(viewport, true)
      } else {
        toast('Stopped presenting view')
        broadcastPresenterView(viewport, false)
      }
      return next
    })
  }, [viewport, broadcastPresenterView])

  // Follow presenter
  const handleFollowPresenter = useCallback((presenter) => {
    if (!presenter) return
    setIsPresenter(false)
    setFollowingUser({ id: presenter.userId, name: presenter.name })
    if (presenter.viewport) {
      setViewport(presenter.viewport)
    }
    toast.success(`Following ${presenter.name}'s view 🎥`, { id: 'follow-toast' })
  }, [])

  // Stop following
  const handleStopFollowing = useCallback(() => {
    setFollowingUser(null)
    toast('Stopped following view', { id: 'follow-toast' })
  }, [])

  // Toggle Chat drawer and clear unread count
  const handleToggleChat = useCallback(() => {
    setChatOpen((prev) => {
      const next = !prev
      if (next) setUnreadCount(0)
      return next
    })
  }, [])

  // Send Chat message
  const handleSendMessage = useCallback(
    (text) => {
      broadcastChatMessage(text)
    },
    [broadcastChatMessage]
  )

  // Trigger emoji reaction broadcast
  const handleSendReaction = useCallback(
    (emoji) => {
      const pos = lastCursorRef.current || { x: 400, y: 300 }
      broadcastReaction(emoji, pos.x, pos.y)
    },
    [broadcastReaction]
  )

  // Load initial board
  useEffect(() => {
    loadBoard().then((loaded) => {
      if (loaded && loaded.length > 0) {
        setElements(loaded)
        historyRef.current = createHistory(loaded)
      }
    })
  }, [loadBoard])

  // Track peer joins to display cheerful notification
  const prevPeersRef = useRef([])
  useEffect(() => {
    const prev = prevPeersRef.current
    if (collaborators.length > prev.length) {
      const newPeer = collaborators.find((c) => !prev.some((p) => p.id === c.id))
      if (newPeer) {
        toast.success(`${newPeer.name || 'Collaborator'} joined the workspace! 👋`, {
          icon: '🎨',
          duration: 3500,
        })
      }
    }
    prevPeersRef.current = collaborators
  }, [collaborators])

  // Save current room to recent boards list in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && roomId) {
      try {
        const recent = JSON.parse(localStorage.getItem('syncboard_recent_boards') || '[]')
        const filtered = recent.filter((b) => b.id !== roomId)
        const updated = [
          {
            id: roomId,
            title: boardTitle || 'Untitled Board',
            lastVisited: Date.now(),
          },
          ...filtered,
        ].slice(0, 10)
        localStorage.setItem('syncboard_recent_boards', JSON.stringify(updated))
      } catch (_) {}
    }
  }, [roomId, boardTitle])

  // Create brand new board with a fresh 6-digit room code
  const handleNewBoard = useCallback(() => {
    const newCode = generateRoomCode()
    try {
      localStorage.setItem(`syncboard_host_${newCode}`, 'true')
    } catch (_) {}
    toast.success(`Creating new board ${newCode}...`)
    router.push(`/board/${newCode}`)
  }, [router])

  // Commit element changes (Pushes to History + Saves to DB + Broadcasts to Peers)
  const handleElementsChange = useCallback(
    (newElements) => {
      setElements(newElements)
      historyRef.current.push(newElements)
      saveBoard(newElements)
      broadcastElementsUpdate(newElements)
    },
    [saveBoard, broadcastElementsUpdate]
  )

  // Undo
  const handleUndo = useCallback(() => {
    const prev = historyRef.current.undo(elements)
    if (prev) {
      setElements(prev)
      saveBoard(prev)
      broadcastElementsUpdate(prev)
      setSelectedElement(null)
    }
  }, [elements, saveBoard, broadcastElementsUpdate])

  // Redo
  const handleRedo = useCallback(() => {
    const next = historyRef.current.redo(elements)
    if (next) {
      setElements(next)
      saveBoard(next)
      broadcastElementsUpdate(next)
      setSelectedElement(null)
    }
  }, [elements, saveBoard, broadcastElementsUpdate])

  // Delete selected element
  const handleDeleteSelected = useCallback(() => {
    if (!selectedElement) return
    const updated = elements.filter((el) => el.id !== selectedElement.id)
    handleElementsChange(updated)
    setSelectedElement(null)
  }, [selectedElement, elements, handleElementsChange])

  // Clear Canvas (wipes whole board for fresh Paint session)
  const handleClearCanvas = useCallback(() => {
    if (elements.length === 0) return
    setElements([])
    historyRef.current.push([])
    saveBoard([])
    broadcastElementsUpdate([])
    setSelectedElement(null)
    toast.success('Canvas cleared! 🎨')
  }, [elements, saveBoard, broadcastElementsUpdate])

  // Upload & Insert Image
  const handleUploadImage = useCallback(
    async (file) => {
      try {
        const { src, width, height, aspectRatio } = await processImageFile(file, 1200)

        const maxDisplayW = 420
        let displayW = width
        let displayH = height
        if (displayW > maxDisplayW) {
          displayH = Math.round((displayH * maxDisplayW) / displayW)
          displayW = maxDisplayW
        }

        const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200
        const screenH = typeof window !== 'undefined' ? window.innerHeight : 800
        const wx = (-viewport.panX + screenW / 2) / viewport.zoom - displayW / 2
        const wy = (-viewport.panY + screenH / 2) / viewport.zoom - displayH / 2

        const newImage = {
          id: generateId(),
          type: 'image',
          x: Math.round(wx),
          y: Math.round(wy),
          width: displayW,
          height: displayH,
          src,
          aspectRatio,
        }

        handleElementsChange([...elements, newImage])
        setSelectedElement(newImage)
        setActiveTool('select')
        toast.success('Image added to board! 🖼️')
      } catch (err) {
        console.error('Failed to upload image:', err)
        toast.error('Failed to load image')
      }
    },
    [elements, viewport, handleElementsChange]
  )

  // Insert AI generated diagram elements onto board
  const handleInsertAiElements = useCallback(
    (newElements) => {
      if (!newElements || newElements.length === 0) return
      const updated = [...elements, ...newElements]
      handleElementsChange(updated)
      setSelectedElement(newElements[0] || null)
    },
    [elements, handleElementsChange]
  )

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in text inputs
      if (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA'
      ) {
        return
      }

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
        return
      }

      // Redo: Ctrl+Y / Cmd+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault()
        handleRedo()
        return
      }

      // Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElement) {
          e.preventDefault()
          handleDeleteSelected()
        }
        return
      }

      // Tool Shortcuts
      switch (e.key.toLowerCase()) {
        case 'v':
          setActiveTool('select')
          break
        case 'h':
          setActiveTool('pan')
          break
        case 'p':
          setActiveTool('pen')
          break
        case 'b':
          setActiveTool('brush')
          break
        case 'r':
          setActiveTool('rectangle')
          break
        case 'o':
          setActiveTool('circle')
          break
        case 'l':
          setActiveTool('line')
          break
        case 'a':
          setActiveTool('arrow')
          break
        case 't':
          setActiveTool('text')
          break
        case 's':
          setActiveTool('sticky')
          break
        case 'x':
          setActiveTool('eraser')
          break
        case 'g':
          setActiveTool('bucket')
          break
        case 'e':
          e.preventDefault()
          setReactionsPickerOpen((prev) => !prev)
          break
        case 'escape':
          setSelectedElement(null)
          setReactionsPickerOpen(false)
          setActiveTool('pen')
          break
      }

      // Quick Emoji Reaction hotkeys (1-8)
      if (e.key >= '1' && e.key <= '8') {
        const idx = parseInt(e.key, 10) - 1
        if (EMOJI_LIST[idx]) {
          e.preventDefault()
          handleSendReaction(EMOJI_LIST[idx])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo, handleDeleteSelected, selectedElement])

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-white">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#212529',
            color: '#ffffff',
            borderRadius: '10px',
            fontSize: '13px',
            border: '1px solid #343a40',
          },
        }}
      />

      {/* 1. Top Navigation */}
      <TopNav
        roomId={roomId}
        boardTitle={boardTitle}
        onTitleChange={(newTitle) => {
          setBoardTitle(newTitle)
          saveBoard(elements, newTitle)
        }}
        saveStatus={saveStatus}
        zoom={viewport.zoom}
        onResetZoom={() => {
          setViewport({
            panX: 0,
            panY: 0,
            zoom: 1,
          })
        }}
        collaborators={collaborators}
        currentUser={currentUser}
        onOpenExport={() => setExportModalOpen(true)}
        onOpenSqlModal={() => setSqlModalOpen(true)}
        onOpenInvite={() => setInviteModalOpen(true)}
        onOpenJoinCode={() => setJoinCodeModalOpen(true)}
        onOpenAiDiagram={() => setAiDiagramModalOpen(true)}
        onNewBoard={handleNewBoard}
        isPresenter={isPresenter}
        onTogglePresenter={handleTogglePresenter}
        activePresenter={activePresenter}
        onFollowPresenter={handleFollowPresenter}
        followingUser={followingUser}
        onStopFollowing={handleStopFollowing}
        isHost={isHost}
      />

      {/* 2. Paint-Style Ribbon Toolbar */}
      <Toolbar
        activeTool={activeTool}
        onSelectTool={(tool) => {
          setActiveTool(tool)
          if (tool !== 'select') setSelectedElement(null)
        }}
        currentColor={currentColor}
        onChangeColor={(c) => {
          setCurrentColor(c)
          if (selectedElement) {
            const updated = elements.map((el) =>
              el.id === selectedElement.id ? { ...el, color: c } : el
            )
            handleElementsChange(updated)
            setSelectedElement({ ...selectedElement, color: c })
          }
        }}
        currentFillColor={currentFillColor}
        onChangeFillColor={(fill) => {
          setCurrentFillColor(fill)
          if (selectedElement) {
            const updated = elements.map((el) =>
              el.id === selectedElement.id ? { ...el, fillColor: fill } : el
            )
            handleElementsChange(updated)
            setSelectedElement({ ...selectedElement, fillColor: fill })
          }
        }}
        currentStrokeWidth={currentStrokeWidth}
        onChangeStrokeWidth={(w) => {
          setCurrentStrokeWidth(w)
          if (selectedElement) {
            const updated = elements.map((el) =>
              el.id === selectedElement.id ? { ...el, strokeWidth: w } : el
            )
            handleElementsChange(updated)
            setSelectedElement({ ...selectedElement, strokeWidth: w })
          }
        }}
        canUndo={historyRef.current.canUndo()}
        canRedo={historyRef.current.canRedo()}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClearCanvas={handleClearCanvas}
        reactionsOpen={reactionsPickerOpen}
        onToggleReactions={() => setReactionsPickerOpen((prev) => !prev)}
        onUploadImage={handleUploadImage}
      />

      {/* 3. Contextual Properties Panel */}
      <PropertiesPanel
        activeTool={activeTool}
        selectedElement={selectedElement}
        currentColor={currentColor}
        currentStrokeWidth={currentStrokeWidth}
        currentFillColor={currentFillColor}
        currentStickyColor={currentStickyColor}
        currentFontSize={currentFontSize}
        onChangeColor={(c) => {
          setCurrentColor(c)
          if (selectedElement) {
            const updated = elements.map((el) =>
              el.id === selectedElement.id ? { ...el, color: c } : el
            )
            handleElementsChange(updated)
            setSelectedElement({ ...selectedElement, color: c })
          }
        }}
        onChangeStrokeWidth={(w) => {
          setCurrentStrokeWidth(w)
          if (selectedElement) {
            const updated = elements.map((el) =>
              el.id === selectedElement.id ? { ...el, strokeWidth: w } : el
            )
            handleElementsChange(updated)
            setSelectedElement({ ...selectedElement, strokeWidth: w })
          }
        }}
        onChangeFillColor={(fill) => {
          setCurrentFillColor(fill)
          if (selectedElement) {
            const updated = elements.map((el) =>
              el.id === selectedElement.id ? { ...el, fillColor: fill } : el
            )
            handleElementsChange(updated)
            setSelectedElement({ ...selectedElement, fillColor: fill })
          }
        }}
        onChangeStickyColor={(sc) => {
          setCurrentStickyColor(sc)
          if (selectedElement && selectedElement.type === 'sticky') {
            const updated = elements.map((el) =>
              el.id === selectedElement.id ? { ...el, bgColor: sc } : el
            )
            handleElementsChange(updated)
            setSelectedElement({ ...selectedElement, bgColor: sc })
          }
        }}
        onChangeFontSize={(fs) => {
          setCurrentFontSize(fs)
          if (selectedElement && selectedElement.type === 'text') {
            const updated = elements.map((el) =>
              el.id === selectedElement.id ? { ...el, fontSize: fs } : el
            )
            handleElementsChange(updated)
            setSelectedElement({ ...selectedElement, fontSize: fs })
          }
        }}
        onDeleteSelected={handleDeleteSelected}
      />

      {/* 4. Remote Collaborator Pointers Overlay */}
      <RemoteCursors remoteCursors={remoteCursors} viewport={viewport} />

      {/* 5. Main 2D Canvas Engine */}
      <Canvas
        elements={elements}
        onElementsChange={handleElementsChange}
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        currentColor={currentColor}
        currentStrokeWidth={currentStrokeWidth}
        currentFillColor={currentFillColor}
        currentStickyColor={currentStickyColor}
        currentFontSize={currentFontSize}
        selectedElement={selectedElement}
        onSelectElement={setSelectedElement}
        viewport={viewport}
        onViewportChange={setViewport}
        onCursorMove={broadcastCursor}
        onDrawPreview={broadcastDrawPreview}
        remotePreviews={remotePreviews}
      />

      {/* 6. Live Floating Emoji Reactions Overlay */}
      <ReactionOverlay reactions={reactions} viewport={viewport} />

      {/* 7. Figma-Style Floating Reaction Picker */}
      <ReactionPicker
        isOpen={reactionsPickerOpen}
        onClose={() => setReactionsPickerOpen(false)}
        onSelectEmoji={handleSendReaction}
      />

      {/* 8. Modals */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        elements={elements}
        boardTitle={boardTitle}
      />

      <SqlHelpModal
        isOpen={sqlModalOpen}
        onClose={() => setSqlModalOpen(false)}
      />

      <InviteModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        roomId={roomId}
        boardTitle={boardTitle}
        collaborators={collaborators}
        currentUser={currentUser}
        isHost={isHost}
        onKickUser={kickCollaborator}
      />

      <JoinCodeModal
        isOpen={joinCodeModalOpen}
        onClose={() => setJoinCodeModalOpen(false)}
      />

      <AiDiagramModal
        isOpen={aiDiagramModalOpen}
        onClose={() => setAiDiagramModalOpen(false)}
        onInsertElements={handleInsertAiElements}
        viewport={viewport}
      />

      {/* 9. Live In-App Chat Drawer */}
      <ChatDrawer
        isOpen={chatOpen}
        onToggle={handleToggleChat}
        messages={messages}
        onSendMessage={handleSendMessage}
        currentUser={currentUser}
        unreadCount={unreadCount}
      />

      {/* 7. Kicked Out Overlay for Removed User */}
      {isKicked && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl border border-[#ffc9c9] animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-[#fff5f5] text-[#e03131] flex items-center justify-center mx-auto mb-4 border border-[#ffc9c9]">
              <UserX className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[#212529] mb-1.5">
              Removed from Workspace
            </h3>
            <p className="text-xs text-[#868e96] mb-6 leading-relaxed">
              Board host ne aapko is workspace se remove kar diya hai. Aap ab is canvas ko draw ya view nahi kar sakte.
            </p>
            <button
              onClick={() => {
                window.location.href = '/'
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-[#212529] hover:bg-black text-white text-xs font-semibold cursor-pointer transition-colors shadow-sm"
            >
              Return to Home
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
