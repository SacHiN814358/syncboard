# 🎨 SyncBoard — Real-Time Collaborative Whiteboard

A high-performance, real-time multiplayer whiteboard built with **Next.js 15 (App Router)**, **HTML5 2D Canvas Engine**, and **Supabase Realtime (WebSockets & Presence)**.

Designed with interface discipline inspired by **Linear**, **Figma**, and **Excalidraw** — calm, precise, functional, and zero visual gimmicks.

---

## ⚡ Core Engineering Highlights

### 1. HTML5 Canvas 2D Matrix Engine
- **Coordinate Transformation:** Strict Screen-to-World mapping:
  $$\text{worldX} = \frac{\text{screenX} - \text{panX}}{\text{zoom}}, \quad \text{worldY} = \frac{\text{screenY} - \text{panY}}{\text{zoom}}$$
- **Zoom at Cursor:** Mouse wheel zoom centered on cursor coordinates clamped between `0.1x` and `5.0x`.
- **Pan Navigation:** Spacebar + Left drag, middle-click drag, or Hand tool (`H`).
- **60 FPS RequestAnimationFrame Loop:** Decoupled mutable interaction layer during pointer moves prevents React component tree re-rendering bottlenecks.
- **Adaptive Dot Grid:** Infinite background dot grid dynamically scales in world space.

### 2. Real-Time Multiplayer Networking (Supabase Realtime)
- **Figma-Style Live Cursors:** Broadcasts peer pointer coordinates in world space (throttled to 30ms).
- **Presence Tracking:** Real-time collaborator avatars with unique identity colors and active status.
- **Transient Drawing Previews:** In-progress strokes are streamed live across clients before committing.
- **Debounced PostgreSQL Persistence:** Finalized elements auto-save to `syncboard_rooms` table with offline `localStorage` fallback.

### 3. Vector Element Data Model & Tools
- **Freehand Pen (`P`):** Quadratic Bézier curve smoothing for natural strokes.
- **Geometric Shapes:** Rectangle (`R`), Circle/Ellipse (`O`), Line (`L`), Arrow (`A` with automatic directional arrowhead).
- **Sticky Notes (`S`):** Miro-style colored sticky notes with double-click inline text editing.
- **Text Tool (`T`):** Direct canvas text placement with font size scaling.
- **Select & Move (`V`):** Bounding box collision detection and dragging.
- **Continuous Eraser (`E`):** Vector hit-testing for point-to-segment deletion.
- **History Stack:** Full Undo (`Ctrl+Z`) and Redo (`Ctrl+Y`) immutable state snapshots.
- **High-DPI Export:** 2x Retina PNG download and raw JSON vector backup.

---

## 🏗️ Architecture

```
[ Browser A (Client) ]
  ├── 2D Canvas Engine (requestAnimationFrame)
  ├── Viewport Transform Matrix (Pan & Zoom)
  └── Mutable Interaction Buffer
         │
         ├──► Throttled Pointer Broadcast (30ms) ──► [ Supabase Realtime Channels ]
         │                                                     │
         │                                                     ▼
         │                                           [ Connected Peers (B, C) ]
         │                                           (Live Cursors & Stroke Previews)
         │
         └──► Debounced Auto-Save (900ms) ──────────► [ PostgreSQL DB (syncboard_rooms) ]
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `V` | Select / Move tool |
| `H` or `Space + Drag` | Hand / Pan canvas |
| `P` | Pencil / Freehand drawing |
| `R` | Rectangle |
| `O` | Circle / Ellipse |
| `A` | Arrow |
| `L` | Line |
| `T` | Text tool |
| `S` | Sticky note |
| `E` | Eraser |
| `Ctrl + Z` / `Cmd + Z` | Undo |
| `Ctrl + Y` / `Cmd + Shift + Z` | Redo |
| `Delete` / `Backspace` | Delete selected element |
| `Mouse Wheel` | Zoom in / out (centered on cursor) |

---

## 🚀 Quick Setup

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
```

Open **http://localhost:3008** in your browser!

### Database Setup (Optional)
Run the queries in [`supabase-schema.sql`](./supabase-schema.sql) in your **Supabase Dashboard → SQL Editor** to activate cloud persistence. (The app will automatically use `localStorage` if cloud tables are not yet created).
