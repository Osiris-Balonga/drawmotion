import { describe, expect, it } from "vitest"

import type { NormalizedPoint, Stroke } from "./drawing-model"
import { assistStroke } from "./stroke-assistance"

const bounds = { left: 0, top: 0, width: 1000, height: 600 }

function stroke(points: readonly NormalizedPoint[]): Stroke {
  return {
    id: "stroke-1",
    tool: "pen",
    color: "#111111",
    width: 0.008,
    points,
  }
}

function noisyLine() {
  return Array.from({ length: 30 }, (_, index) => ({
    x: 0.15 + index * 0.02,
    y: 0.3 + Math.sin(index * 1.7) * 0.002,
  }))
}

function noisyEllipse(radiusX: number, radiusY: number) {
  return Array.from({ length: 81 }, (_, index) => {
    const angle = (index / 80) * Math.PI * 2
    const noise = Math.sin(index * 2.1) * 0.003
    return {
      x: 0.5 + Math.cos(angle) * (radiusX + noise),
      y: 0.5 + Math.sin(angle) * (radiusY + noise),
    }
  })
}

function noisyRectangle() {
  const corners = [
    { x: 0.2, y: 0.2 },
    { x: 0.75, y: 0.2 },
    { x: 0.75, y: 0.7 },
    { x: 0.2, y: 0.7 },
    { x: 0.2, y: 0.2 },
  ]
  return corners
    .flatMap((corner, index) => {
      const next = corners[index + 1]
      if (!next) return []
      return Array.from({ length: 16 }, (_, sample) => {
        const progress = sample / 16
        return {
          x:
            corner.x +
            (next.x - corner.x) * progress +
            Math.sin((index * 16 + sample) * 1.8) * 0.001,
          y:
            corner.y +
            (next.y - corner.y) * progress +
            Math.cos((index * 16 + sample) * 1.4) * 0.001,
        }
      })
    })
    .concat(corners[0]!)
}

function openCircle() {
  return Array.from({ length: 64 }, (_, index) => {
    const angle = 0.15 + (index / 63) * Math.PI * 1.68
    return {
      x: 0.5 + Math.cos(angle) * 0.16 + Math.sin(index * 1.9) * 0.004,
      y: 0.5 + Math.sin(angle) * 0.27 + Math.cos(index * 1.6) * 0.004,
    }
  })
}

function imperfectRectangle() {
  const corners = [
    { x: 0.22, y: 0.22 },
    { x: 0.72, y: 0.24 },
    { x: 0.76, y: 0.68 },
    { x: 0.19, y: 0.66 },
    { x: 0.24, y: 0.25 },
  ]
  return corners.flatMap((corner, index) => {
    const next = corners[index + 1]
    if (!next) return []
    return Array.from({ length: 14 }, (_, sample) => {
      const progress = sample / 14
      return {
        x:
          corner.x +
          (next.x - corner.x) * progress +
          Math.sin((index * 14 + sample) * 1.3) * 0.004,
        y:
          corner.y +
          (next.y - corner.y) * progress +
          Math.cos((index * 14 + sample) * 1.7) * 0.004,
      }
    })
  })
}

function hookedLine() {
  return [
    { x: 0.12, y: 0.6 },
    { x: 0.15, y: 0.56 },
    ...Array.from({ length: 36 }, (_, index) => ({
      x: 0.16 + index * 0.019,
      y: 0.55 + Math.sin(index * 0.55) * 0.009,
    })),
    { x: 0.87, y: 0.58 },
    { x: 0.84, y: 0.62 },
  ]
}

describe("assistStroke", () => {
  it("keeps free drawing free while regularizing its samples", () => {
    const original = stroke([
      { x: 0.1, y: 0.1 },
      { x: 0.101, y: 0.1 },
      { x: 0.2, y: 0.1 },
    ])
    const result = assistStroke(original, bounds, "free")

    expect(result.correction).toBeNull()
    expect(result.stroke.points[0]).toEqual(original.points[0])
    expect(result.stroke.points.at(-1)).toEqual(original.points.at(-1))
    expect(result.stroke.points.length).toBeGreaterThan(original.points.length)
  })

  it("beautifies a confident line and preserves the original points", () => {
    const original = stroke(noisyLine())
    const result = assistStroke(original, bounds, "shapes")

    expect(result.correction?.primitive).toBe("line")
    expect(result.correction?.confidence).toBeGreaterThanOrEqual(0.86)
    expect(result.stroke.points).toHaveLength(2)
    expect(result.stroke.assistance?.originalPoints).toEqual(original.points)
  })

  it("recognizes circles and ellipses in pixel space", () => {
    const circle = assistStroke(
      stroke(noisyEllipse(0.16, 0.27)),
      bounds,
      "shapes",
    )
    const ellipse = assistStroke(
      stroke(noisyEllipse(0.24, 0.18)),
      bounds,
      "shapes",
    )

    expect(circle.correction?.primitive).toBe("circle")
    expect(circle.stroke.points).toHaveLength(65)
    expect(ellipse.correction?.primitive).toBe("ellipse")
  })

  it("recognizes a closed rectangle without confusing it with an ellipse", () => {
    const result = assistStroke(stroke(noisyRectangle()), bounds, "shapes")

    expect(result.correction?.primitive).toBe("rectangle")
    expect(result.stroke.points).toHaveLength(5)
  })

  it("magnetically closes a clearly circular stroke with a realistic gap", () => {
    const original = stroke(openCircle())
    const result = assistStroke(original, bounds, "shapes")

    expect(result.correction?.primitive).toBe("circle")
    expect(result.stroke.points[0]).toEqual(result.stroke.points.at(-1))
    expect(result.stroke.assistance?.originalPoints).toEqual(original.points)
  })

  it("beautifies a hand-drawn quadrilateral with uneven corners", () => {
    const result = assistStroke(stroke(imperfectRectangle()), bounds, "shapes")

    expect(result.correction?.primitive).toBe("rectangle")
    expect(result.stroke.points).toHaveLength(5)
  })

  it("recognizes a mostly straight gesture despite small endpoint hooks", () => {
    const result = assistStroke(stroke(hookedLine()), bounds, "shapes")

    expect(result.correction?.primitive).toBe("line")
    expect(result.stroke.points).toHaveLength(2)
  })

  it("does not force an ambiguous organic stroke into a primitive", () => {
    const result = assistStroke(
      stroke([
        { x: 0.1, y: 0.1 },
        { x: 0.2, y: 0.3 },
        { x: 0.25, y: 0.14 },
        { x: 0.38, y: 0.42 },
        { x: 0.5, y: 0.2 },
      ]),
      bounds,
      "shapes",
    )

    expect(result.correction).toBeNull()
    expect(result.stroke.assistance).toBeUndefined()
  })

  it("never reshapes eraser strokes", () => {
    const eraser = { ...stroke(noisyLine()), tool: "eraser" as const }
    expect(assistStroke(eraser, bounds, "shapes")).toEqual({
      stroke: eraser,
      correction: null,
    })
  })
})
