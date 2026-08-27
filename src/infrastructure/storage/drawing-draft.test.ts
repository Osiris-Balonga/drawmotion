import { describe, expect, it, vi } from "vitest"
import {
  DRAWING_DRAFT_KEY,
  loadDrawingDraft,
  saveDrawingDraft,
  type DrawingDraft,
} from "./drawing-draft"

const draft: DrawingDraft = {
  document: {
    strokes: [
      {
        id: "stroke-1",
        tool: "pen",
        color: "#1267AB",
        width: 0.012,
        pattern: "dashed",
        points: [{ x: -0.4, y: 1.2, pressure: 0.5 }],
        assistance: {
          primitive: "line",
          confidence: 0.9,
          originalPoints: [{ x: -0.42, y: 1.21 }],
        },
      },
      {
        id: "stroke-2",
        tool: "eraser",
        color: "#111111",
        width: 0.04,
        points: [{ x: 0.5, y: 0.5 }],
      },
    ],
  },
  viewport: { zoom: 0.5, offsetX: -80, offsetY: 120 },
}

describe("local drawing draft", () => {
  it("round-trips ink, erasing, assistance and the view; saving an empty canvas replaces it", () => {
    let raw: string | null = null
    const storage = {
      getItem: () => raw,
      setItem: (_key: string, value: string) => {
        raw = value
      },
    }
    expect(loadDrawingDraft(storage).draft.document.strokes).toEqual([])
    expect(saveDrawingDraft(draft, storage)).toBe(true)
    expect(loadDrawingDraft(storage)).toEqual({ draft, failed: false })
    expect(
      saveDrawingDraft({ ...draft, document: { strokes: [] } }, storage),
    ).toBe(true)
    expect(loadDrawingDraft(storage).draft.document.strokes).toEqual([])
  })

  it("rejects damaged, future-version and invalid renderer data without modifying storage", () => {
    for (const raw of [
      "{",
      "null",
      JSON.stringify({ version: 2, ...draft }),
      JSON.stringify({
        version: 1,
        ...draft,
        viewport: { zoom: 0, offsetX: 0, offsetY: 0 },
      }),
      JSON.stringify({
        version: 1,
        ...draft,
        document: {
          strokes: [draft.document.strokes[0], draft.document.strokes[0]],
        },
      }),
      JSON.stringify({
        version: 1,
        ...draft,
        document: {
          strokes: [
            { ...draft.document.strokes[0], points: [{ x: null, y: 0 }] },
          ],
        },
      }),
      JSON.stringify({
        version: 1,
        ...draft,
        document: {
          strokes: [{ ...draft.document.strokes[0], color: "not-a-color" }],
        },
      }),
      JSON.stringify({
        version: 1,
        ...draft,
        document: {
          strokes: [
            {
              ...draft.document.strokes[0],
              assistance: { primitive: "unknown" },
            },
          ],
        },
      }),
      " ".repeat(2_000_001),
    ]) {
      expect(loadDrawingDraft({ getItem: () => raw })).toMatchObject({
        failed: true,
        draft: { document: { strokes: [] } },
      })
    }
  })

  it("reports denied storage and quota failures without crashing or deleting the previous draft", () => {
    const denied = () => {
      throw new Error("Storage denied")
    }
    expect(loadDrawingDraft({ getItem: denied }).failed).toBe(true)
    expect(saveDrawingDraft(draft, { setItem: denied })).toBe(false)
    const setItem = vi.fn()
    expect(
      saveDrawingDraft(
        {
          ...draft,
          document: {
            strokes: [
              {
                ...draft.document.strokes[0]!,
                points: Array.from({ length: 120_000 }, () => ({
                  x: 0.12345,
                  y: 0.54321,
                })),
              },
            ],
          },
        },
        { setItem },
      ),
    ).toBe(false)
    expect(setItem).not.toHaveBeenCalled()
    expect(saveDrawingDraft(draft, { setItem })).toBe(true)
    expect(setItem).toHaveBeenCalledWith(DRAWING_DRAFT_KEY, expect.any(String))
  })
})
