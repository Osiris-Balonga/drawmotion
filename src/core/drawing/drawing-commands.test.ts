import { describe, expect, it } from "vitest"

import { applyDrawingCommand } from "./drawing-commands"
import { emptyDrawingDocument, type Stroke } from "./drawing-model"

const stroke: Stroke = {
  id: "stroke-1",
  tool: "pen",
  color: "#111111",
  width: 0.02,
  points: [
    { x: 0.2, y: 0.2 },
    { x: 0.3, y: 0.3 },
  ],
}

describe("applyDrawingCommand", () => {
  it("adds a stroke without mutating the previous document", () => {
    const next = applyDrawingCommand(emptyDrawingDocument, {
      type: "ADD_STROKE",
      stroke,
    })

    expect(next.strokes).toEqual([stroke])
    expect(emptyDrawingDocument.strokes).toEqual([])
  })

  it("removes strokes touched by the eraser radius", () => {
    const document = { strokes: [stroke] }
    const next = applyDrawingCommand(document, {
      type: "ERASE_AT",
      point: { x: 0.31, y: 0.3 },
      radius: 0.01,
    })

    expect(next.strokes).toEqual([])
    expect(document.strokes).toEqual([stroke])
  })

  it("preserves identity when an eraser or clear command has no effect", () => {
    const document = { strokes: [stroke] }
    expect(
      applyDrawingCommand(document, {
        type: "ERASE_AT",
        point: { x: 0.9, y: 0.9 },
        radius: 0.01,
      }),
    ).toBe(document)
    expect(applyDrawingCommand(emptyDrawingDocument, { type: "CLEAR" })).toBe(
      emptyDrawingDocument,
    )
  })

  it("clears every stroke immutably", () => {
    const document = { strokes: [stroke] }
    expect(applyDrawingCommand(document, { type: "CLEAR" })).toEqual({
      strokes: [],
    })
    expect(document.strokes).toHaveLength(1)
  })
})
