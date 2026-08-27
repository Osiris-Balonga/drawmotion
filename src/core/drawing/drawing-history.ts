import type { DrawingDocument } from "./drawing-model"

export type DrawingHistory = {
  past: readonly DrawingDocument[]
  present: DrawingDocument
  future: readonly DrawingDocument[]
  limit: number
}

export function createDrawingHistory(
  present: DrawingDocument,
  limit = 50,
): DrawingHistory {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Drawing history limit must be a positive integer")
  }
  return { past: [], present, future: [], limit }
}

export function recordDrawing(
  history: DrawingHistory,
  next: DrawingDocument,
): DrawingHistory {
  if (next === history.present) return history
  return {
    ...history,
    past: [...history.past, history.present].slice(-history.limit),
    present: next,
    future: [],
  }
}

export function undoDrawing(history: DrawingHistory): DrawingHistory {
  const previous = history.past.at(-1)
  if (!previous) return history
  return {
    ...history,
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  }
}

export function redoDrawing(history: DrawingHistory): DrawingHistory {
  const next = history.future[0]
  if (!next) return history
  return {
    ...history,
    past: [...history.past, history.present].slice(-history.limit),
    present: next,
    future: history.future.slice(1),
  }
}
