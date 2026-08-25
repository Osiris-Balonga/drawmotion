import { describe, expect, it } from "vitest"

import { resamplePointsByDistance, smoothPoints } from "./stroke-resampling"

describe("resamplePointsByDistance", () => {
  it("regularizes uneven samples and preserves both endpoints", () => {
    const result = resamplePointsByDistance(
      [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 10, y: 0 },
      ],
      3,
    )

    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 6, y: 0 },
      { x: 9, y: 0 },
      { x: 10, y: 0 },
    ])
  })

  it("rejects invalid spacing and safely handles empty geometry", () => {
    expect(resamplePointsByDistance([], 2)).toEqual([])
    expect(() => resamplePointsByDistance([], 0)).toThrow("greater than zero")
  })
})

describe("smoothPoints", () => {
  it("reduces an isolated wobble without moving the endpoints", () => {
    const result = smoothPoints(
      [
        { x: 0, y: 0 },
        { x: 1, y: 2 },
        { x: 2, y: 0 },
      ],
      1,
    )

    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 0 },
    ])
  })
})
