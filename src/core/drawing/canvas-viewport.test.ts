import { describe, expect, it } from "vitest"

import {
  clampCanvasZoom,
  initialCanvasViewport,
  panCanvasViewport,
  zoomCanvasViewport,
} from "./canvas-viewport"

describe("canvas viewport", () => {
  it("clamps zoom to the supported range", () => {
    expect(clampCanvasZoom(0.01)).toBe(0.25)
    expect(clampCanvasZoom(1.25)).toBe(1.25)
    expect(clampCanvasZoom(8)).toBe(3)
  })

  it("keeps the anchored world point still while zooming", () => {
    const next = zoomCanvasViewport(initialCanvasViewport, 0.5, {
      x: 500,
      y: 300,
    })

    expect(next).toEqual({ zoom: 0.5, offsetX: 250, offsetY: 150 })
  })

  it("pans without changing zoom", () => {
    expect(
      panCanvasViewport(
        { zoom: 1.5, offsetX: 20, offsetY: -10 },
        { x: 15, y: 5 },
      ),
    ).toEqual({ zoom: 1.5, offsetX: 35, offsetY: -5 })
  })
})
