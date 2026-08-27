import { describe, expect, it } from "vitest"

import {
  createDrawingHistory,
  recordDrawing,
  redoDrawing,
  undoDrawing,
} from "./drawing-history"
import {
  emptyDrawingDocument,
  isNormalizedPoint,
  type DrawingDocument,
  type Stroke,
} from "./drawing-model"

const stroke: Stroke = {
  id: "stroke-1",
  tool: "pen",
  color: "#111111",
  width: 0.01,
  points: [{ x: 0.25, y: 0.5 }],
}

function documentWith(...strokes: Stroke[]): DrawingDocument {
  return { strokes }
}

describe("drawing model and history", () => {
  it("recognizes points inside and outside the normalized canvas", () => {
    expect(isNormalizedPoint(stroke.points[0]!)).toBe(true)
    expect(isNormalizedPoint({ x: 1.1, y: 0.5 })).toBe(false)
  })

  it("undoes and redoes document states deterministically", () => {
    const drawn = documentWith(stroke)
    const history = recordDrawing(
      createDrawingHistory(emptyDrawingDocument),
      drawn,
    )

    expect(undoDrawing(history).present).toBe(emptyDrawingDocument)
    expect(redoDrawing(undoDrawing(history)).present).toBe(drawn)
  })

  it("invalidates redo after a new action", () => {
    const first = documentWith(stroke)
    const undone = undoDrawing(
      recordDrawing(createDrawingHistory(emptyDrawingDocument), first),
    )
    const replacement = documentWith({ ...stroke, id: "replacement" })

    expect(recordDrawing(undone, replacement).future).toEqual([])
  })

  it("bounds retained history", () => {
    let history = createDrawingHistory(emptyDrawingDocument, 2)
    for (const id of ["one", "two", "three"]) {
      history = recordDrawing(history, documentWith({ ...stroke, id }))
    }
    expect(history.past).toHaveLength(2)
  })

  it("ignores unavailable history operations and identical states", () => {
    const history = createDrawingHistory(emptyDrawingDocument)
    expect(undoDrawing(history)).toBe(history)
    expect(redoDrawing(history)).toBe(history)
    expect(recordDrawing(history, history.present)).toBe(history)
  })

  it("rejects invalid history limits", () => {
    expect(() => createDrawingHistory(emptyDrawingDocument, 0)).toThrow(
      "positive integer",
    )
  })
})
