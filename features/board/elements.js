/**
 * SyncBoard Canvas Element Type Definitions
 *
 * Every item on the canvas is represented as a plain object conforming
 * to one of these shapes. Elements are stored as an array and serialized
 * to Supabase as JSONB.
 */

/**
 * @typedef {'select' | 'pan' | 'pen' | 'brush' | 'bucket' | 'rectangle' | 'rounded-rectangle' | 'circle' | 'line' | 'curve' | 'arrow' | 'double-arrow' | 'triangle' | 'right-triangle' | 'diamond' | 'pentagon' | 'hexagon' | 'heptagon' | 'octagon' | 'trapezoid' | 'parallelogram' | 'arrow-right' | 'arrow-left' | 'arrow-up' | 'arrow-down' | 'arrow-four' | 'chevron' | 'star-4' | 'star' | 'star-6' | 'heart' | 'lightning' | 'callout-rect' | 'callout-oval' | 'callout-cloud' | 'cloud' | 'text' | 'sticky' | 'eraser'} ToolType
 */

export const BOX_SHAPES = [
  'rectangle',
  'rounded-rectangle',
  'triangle',
  'right-triangle',
  'diamond',
  'pentagon',
  'hexagon',
  'heptagon',
  'octagon',
  'trapezoid',
  'parallelogram',
  'arrow-right',
  'arrow-left',
  'arrow-up',
  'arrow-down',
  'arrow-four',
  'chevron',
  'star-4',
  'star',
  'star-6',
  'heart',
  'lightning',
  'callout-rect',
  'callout-oval',
  'callout-cloud',
  'cloud',
]

export const LINE_SHAPES = ['line', 'curve', 'arrow', 'double-arrow']

export const CLOSED_SHAPES = [...BOX_SHAPES, 'circle']

/**
 * @typedef {Object} PenElement
 * @property {string} id
 * @property {'pen' | 'brush'} type
 * @property {{x: number, y: number}[]} points
 * @property {string} color
 * @property {number} strokeWidth
 * @property {string} [fillColor]
 */

/**
 * @typedef {Object} RectangleElement
 * @property {string} id
 * @property {'rectangle' | 'rounded-rectangle'} type
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {string} color
 * @property {number} strokeWidth
 * @property {string} [fillColor]
 */

/**
 * @typedef {Object} ShapeElement
 * @property {string} id
 * @property {string} type
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {string} color
 * @property {number} strokeWidth
 * @property {string} [fillColor]
 */

/**
 * @typedef {Object} CircleElement
 * @property {string} id
 * @property {'circle'} type
 * @property {number} x - center x
 * @property {number} y - center y
 * @property {number} radiusX
 * @property {number} radiusY
 * @property {string} color
 * @property {number} strokeWidth
 * @property {string} [fillColor]
 */

/**
 * @typedef {Object} LineElement
 * @property {string} id
 * @property {'line' | 'curve'} type
 * @property {number} x1
 * @property {number} y1
 * @property {number} x2
 * @property {number} y2
 * @property {string} color
 * @property {number} strokeWidth
 */

/**
 * @typedef {Object} ArrowElement
 * @property {string} id
 * @property {'arrow' | 'double-arrow'} type
 * @property {number} x1
 * @property {number} y1
 * @property {number} x2
 * @property {number} y2
 * @property {string} color
 * @property {number} strokeWidth
 */

/**
 * @typedef {Object} TextElement
 * @property {string} id
 * @property {'text'} type
 * @property {number} x
 * @property {number} y
 * @property {string} text
 * @property {string} color
 * @property {number} fontSize
 */

/**
 * @typedef {Object} StickyElement
 * @property {string} id
 * @property {'sticky'} type
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {string} text
 * @property {string} bgColor
 */

/**
 * @typedef {Object} ImageElement
 * @property {string} id
 * @property {'image'} type
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {string} src
 * @property {number} [aspectRatio]
 * @property {boolean} [isFloodFill]
 * @property {string} [fillColor]
 */

/**
 * @typedef {PenElement | RectangleElement | ShapeElement | CircleElement | LineElement | ArrowElement | TextElement | StickyElement | ImageElement} CanvasElement
 */

/**
 * @typedef {Object} Viewport
 * @property {number} panX
 * @property {number} panY
 * @property {number} zoom
 */

/**
 * @typedef {Object} RemoteCursor
 * @property {string} userId
 * @property {string} name
 * @property {string} color
 * @property {number} x - world coordinates
 * @property {number} y - world coordinates
 * @property {number} lastSeen - timestamp
 */

/** Classic Paint color palette */
export const COLORS = [
  '#000000', // Black
  '#595959', // Dark Gray
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#2563eb', // Blue
  '#7c3aed', // Purple
  '#ec4899', // Pink
  '#78350f', // Brown
  '#94a3b8', // Slate / Light Gray
]

/** Sticky note background colors */
export const STICKY_COLORS = [
  '#fff3bf', // yellow
  '#d3f9d8', // green
  '#d0ebff', // blue
  '#ffe3e3', // pink
  '#e8d0ff', // purple
  '#ffe8cc', // peach
]

/** Stroke width presets (MS Paint style) */
export const STROKE_WIDTHS = [
  { label: 'Fine (2px)', value: 2 },
  { label: 'Medium (4px)', value: 4 },
  { label: 'Thick (8px)', value: 8 },
  { label: 'Marker (16px)', value: 16 },
]

/** Default viewport state */
export const DEFAULT_VIEWPORT = { panX: 0, panY: 0, zoom: 1 }

/** Zoom limits */
export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 5

/** Collaborator identity colors assigned by join order */
export const COLLABORATOR_COLORS = [
  '#1971c2',
  '#e03131',
  '#2f9e44',
  '#7048e8',
  '#f08c00',
  '#c2255c',
  '#0ca678',
  '#845ef7',
]
