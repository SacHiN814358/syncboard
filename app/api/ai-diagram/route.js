import { NextResponse } from 'next/server'

// Palette styles for generated diagrams
const PALETTES = {
  modern: {
    start: { fill: '#dbeafe', stroke: '#1d4ed8', text: '#1e3a8a' }, // Blue
    process: { fill: '#f8fafc', stroke: '#334155', text: '#0f172a' }, // Slate
    decision: { fill: '#fef3c7', stroke: '#d97706', text: '#78350f' }, // Amber
    end: { fill: '#dcfce7', stroke: '#15803d', text: '#14532d' }, // Emerald
    arrow: '#475569',
  },
  sticky: {
    colors: ['#fff3bf', '#d3f9d8', '#d0ebff', '#ffe3e3', '#e8d0ff', '#ffe8cc'],
  },
}

function generateId(prefix = 'ai') {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Intelligent built-in workflow template & semantic generator.
 */
function getTemplateDiagram(promptText, diagramType, startX = 120, startY = 120) {
  const p = promptText.toLowerCase()

  if (diagramType === 'sticky-grid' || p.includes('sticky') || p.includes('brainstorm') || p.includes('kanban')) {
    // Generate Sticky Note Brainstorm / Kanban Grid
    const columns = p.includes('kanban')
      ? [
          { title: '📋 To Do', notes: ['Research competitor features', 'Design system color palette', 'Draft PRD & requirements'] },
          { title: '⚡ In Progress', notes: ['Build live canvas engine', 'Integrate Supabase presence', 'Add sticky notes & images'] },
          { title: '🧪 Review / QA', notes: ['Test multi-cursor sync', 'Cross-browser zoom accuracy'] },
          { title: '✅ Done', notes: ['Project scaffold & Next.js 15', '29 geometric shapes', 'Vercel live deployment'] },
        ]
      : [
          { title: '💡 Core Ideas', notes: ['Realtime team collaboration', 'Smart magnetic arrows', 'Infinite smooth canvas'] },
          { title: '🎯 Target Audience', notes: ['Product Designers', 'Software Engineers', 'Online Educators & Students'] },
          { title: '🚀 Launch Channels', notes: ['Product Hunt launch', 'Twitter / X demo video', 'GitHub open source community'] },
          { title: '📈 Growth & Metric', notes: ['Daily Active Boards', 'Invite code acceptance rate', 'Average session time'] },
        ]

    const elements = []
    const colW = 220
    const colGap = 28
    const noteH = 130
    const noteGap = 20

    columns.forEach((col, colIdx) => {
      const cx = startX + colIdx * (colW + colGap)
      // Column Header Text
      elements.push({
        id: generateId('txt'),
        type: 'text',
        x: cx + 10,
        y: startY,
        text: col.title,
        color: '#1e293b',
        fontSize: 18,
      })

      col.notes.forEach((noteText, noteIdx) => {
        const ny = startY + 38 + noteIdx * (noteH + noteGap)
        const bg = PALETTES.sticky.colors[(colIdx * 2 + noteIdx) % PALETTES.sticky.colors.length]
        elements.push({
          id: generateId('stk'),
          type: 'sticky',
          x: cx,
          y: ny,
          width: colW,
          height: noteH,
          text: noteText,
          bgColor: bg,
          textColor: '#1e293b',
        })
      })
    })

    return { title: 'Brainstorm & Sprint Board', elements }
  }

  // Flowchart Workflow Generator
  let steps = []

  if (p.includes('auth') || p.includes('login') || p.includes('signup') || p.includes('register')) {
    steps = [
      { id: '1', label: 'Start: User visits page', shape: 'rounded-rectangle', role: 'start' },
      { id: '2', label: 'Enter Email & Password', shape: 'rectangle', role: 'process' },
      { id: '3', label: 'Credentials Valid?', shape: 'diamond', role: 'decision' },
      { id: '4', label: 'Show Error & Retry', shape: 'rectangle', role: 'process' },
      { id: '5', label: 'Generate Auth Token', shape: 'rectangle', role: 'process' },
      { id: '6', label: 'Redirect to Dashboard', shape: 'rounded-rectangle', role: 'end' },
    ]
  } else if (p.includes('shop') || p.includes('checkout') || p.includes('order') || p.includes('cart') || p.includes('ecommerce')) {
    steps = [
      { id: '1', label: 'Start: View Cart', shape: 'rounded-rectangle', role: 'start' },
      { id: '2', label: 'Enter Delivery Address', shape: 'rectangle', role: 'process' },
      { id: '3', label: 'Select Payment Method', shape: 'rectangle', role: 'process' },
      { id: '4', label: 'Payment Succeeded?', shape: 'diamond', role: 'decision' },
      { id: '5', label: 'Retry Payment / Alternative', shape: 'rectangle', role: 'process' },
      { id: '6', label: 'Save Order in DB', shape: 'rectangle', role: 'process' },
      { id: '7', label: 'Order Confirmation & Receipt', shape: 'rounded-rectangle', role: 'end' },
    ]
  } else if (p.includes('microservice') || p.includes('backend') || p.includes('api') || p.includes('arch')) {
    steps = [
      { id: '1', label: 'Client / Mobile App', shape: 'rounded-rectangle', role: 'start' },
      { id: '2', label: 'API Gateway & Rate Limiter', shape: 'rectangle', role: 'process' },
      { id: '3', label: 'Auth & JWT Validation', shape: 'diamond', role: 'decision' },
      { id: '4', label: 'Reject: 401 Unauthorized', shape: 'rectangle', role: 'process' },
      { id: '5', label: 'Microservice Routing (Order/User/Pay)', shape: 'rectangle', role: 'process' },
      { id: '6', label: 'Distributed Database & Cache', shape: 'rounded-rectangle', role: 'end' },
    ]
  } else {
    // Custom sentences / bullet points parsing
    const lines = promptText
      .split(/\n|\.|->|;/)
      .map((l) => l.trim().replace(/^[-*•\d.)\s]+/, ''))
      .filter((l) => l.length > 2)

    if (lines.length >= 3) {
      steps = lines.slice(0, 7).map((line, idx) => {
        const isFirst = idx === 0
        const isLast = idx === Math.min(lines.length - 1, 6)
        const isDecision = line.includes('?') || line.toLowerCase().startsWith('if')
        return {
          id: String(idx + 1),
          label: line,
          shape: isFirst ? 'rounded-rectangle' : isLast ? 'rounded-rectangle' : isDecision ? 'diamond' : 'rectangle',
          role: isFirst ? 'start' : isLast ? 'end' : isDecision ? 'decision' : 'process',
        }
      })
    } else {
      steps = [
        { id: '1', label: 'Start: Initial Trigger', shape: 'rounded-rectangle', role: 'start' },
        { id: '2', label: promptText.trim() || 'Execute Main Process', shape: 'rectangle', role: 'process' },
        { id: '3', label: 'Criteria Met?', shape: 'diamond', role: 'decision' },
        { id: '4', label: 'Secondary / Fallback Path', shape: 'rectangle', role: 'process' },
        { id: '5', label: 'Final Output & Success', shape: 'rounded-rectangle', role: 'end' },
      ]
    }
  }

  // Layout flowchart shapes in a neat vertical tree with magnetic arrows
  const elements = []
  const nodeW = 190
  const nodeH = 75
  const gapY = 65
  const altXOffset = 230

  const createdNodes = []

  steps.forEach((step, idx) => {
    let nx = startX
    let ny = startY + idx * (nodeH + gapY)

    // Decision branches branch out to the right
    if (step.role === 'decision' && idx > 0) {
      // center
    } else if (step.label.toLowerCase().includes('retry') || step.label.toLowerCase().includes('reject')) {
      nx = startX + altXOffset
      ny = startY + (idx - 1) * (nodeH + gapY)
    }

    const palette = PALETTES.modern[step.role] || PALETTES.modern.process
    const nodeEl = {
      id: generateId('node'),
      type: step.shape,
      x: nx,
      y: ny,
      width: nodeW,
      height: nodeH,
      color: palette.stroke,
      fillColor: palette.fill,
      strokeWidth: 2,
      metaLabel: step.label,
    }

    elements.push(nodeEl)
    createdNodes.push({ ...step, element: nodeEl })

    // Add centered label text element inside the shape
    elements.push({
      id: generateId('txt'),
      type: 'text',
      x: nx + 14,
      y: ny + 26,
      text: step.label,
      color: palette.text,
      fontSize: 13,
    })
  })

  // Connect adjacent nodes with magnetic arrows!
  for (let i = 0; i < createdNodes.length - 1; i++) {
    const fromNode = createdNodes[i]
    const toNode = createdNodes[i + 1]

    // Determine anchors based on relative positions
    const isBranch = toNode.element.x > fromNode.element.x
    const startAnchor = isBranch ? 'right' : 'bottom'
    const endAnchor = isBranch ? 'left' : 'top'

    const startXCoord = isBranch
      ? fromNode.element.x + fromNode.element.width
      : fromNode.element.x + fromNode.element.width / 2
    const startYCoord = isBranch
      ? fromNode.element.y + fromNode.element.height / 2
      : fromNode.element.y + fromNode.element.height

    const endXCoord = isBranch
      ? toNode.element.x
      : toNode.element.x + toNode.element.width / 2
    const endYCoord = isBranch
      ? toNode.element.y + toNode.element.height / 2
      : toNode.element.y

    elements.push({
      id: generateId('arr'),
      type: 'arrow',
      x1: startXCoord,
      y1: startYCoord,
      x2: endXCoord,
      y2: endYCoord,
      color: '#475569',
      strokeWidth: 2,
      startBinding: { elementId: fromNode.element.id, anchor: startAnchor },
      endBinding: { elementId: toNode.element.id, anchor: endAnchor },
    })
  }

  return { title: 'Flowchart Diagram', elements }
}

export async function POST(req) {
  try {
    const { prompt, diagramType = 'flowchart', startX = 120, startY = 120 } = await req.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Call intelligent diagram generator
    const result = getTemplateDiagram(prompt, diagramType, startX, startY)

    return NextResponse.json({
      success: true,
      title: result.title,
      elements: result.elements,
    })
  } catch (err) {
    console.error('Error generating AI diagram:', err)
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 })
  }
}
