/**
 * SyncBoard — Undo / Redo History Manager
 *
 * Maintains an immutable snapshot stack of the elements array.
 * Operations push the current state before modification.
 * Undo pops from the undo stack and pushes to redo.
 *
 * The history stores serialized copies (structuredClone) to avoid
 * mutation bugs.
 */

const MAX_HISTORY = 80

/**
 * Create a new history manager.
 * @param {import('./elements').CanvasElement[]} initialElements
 * @returns {{
 *   push: (elements: import('./elements').CanvasElement[]) => void,
 *   undo: (currentElements: import('./elements').CanvasElement[]) => import('./elements').CanvasElement[] | null,
 *   redo: (currentElements: import('./elements').CanvasElement[]) => import('./elements').CanvasElement[] | null,
 *   canUndo: () => boolean,
 *   canRedo: () => boolean,
 *   clear: () => void,
 * }}
 */
export function createHistory(initialElements = []) {
  /** @type {import('./elements').CanvasElement[][]} */
  const undoStack = [structuredClone(initialElements)]

  /** @type {import('./elements').CanvasElement[][]} */
  const redoStack = []

  return {
    /**
     * Record current state before a change.
     * Clears redo stack (branching timeline).
     * @param {import('./elements').CanvasElement[]} elements
     */
    push(elements) {
      undoStack.push(structuredClone(elements))
      if (undoStack.length > MAX_HISTORY) {
        undoStack.shift()
      }
      redoStack.length = 0
    },

    /**
     * Undo: pop from undo stack, push current to redo stack.
     * @param {import('./elements').CanvasElement[]} currentElements
     * @returns {import('./elements').CanvasElement[] | null} - previous state, or null if nothing to undo
     */
    undo(currentElements) {
      if (undoStack.length <= 1) return null

      redoStack.push(structuredClone(currentElements))
      undoStack.pop()

      return structuredClone(undoStack[undoStack.length - 1])
    },

    /**
     * Redo: pop from redo stack.
     * @param {import('./elements').CanvasElement[]} currentElements
     * @returns {import('./elements').CanvasElement[] | null}
     */
    redo(currentElements) {
      if (redoStack.length === 0) return null

      undoStack.push(structuredClone(currentElements))
      return structuredClone(redoStack.pop())
    },

    canUndo() {
      return undoStack.length > 1
    },

    canRedo() {
      return redoStack.length > 0
    },

    clear() {
      undoStack.length = 0
      redoStack.length = 0
    },
  }
}
