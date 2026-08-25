import { describe, expect, it } from "vitest"

import { mapMirroredCameraPointToCanvas } from "@/core/geometry/coordinate-mapping"

import { PointerMotionFilter } from "./pointer-motion-filter"

describe("mapMirroredCameraPointToCanvas", () => {
  it("mirrors horizontal camera coordinates into canvas coordinates", () => {
    expect(
      mapMirroredCameraPointToCanvas(
        { x: 0.25, y: 0.4 },
        { left: 10, top: 20, width: 800, height: 600 },
      ),
    ).toEqual({ x: 610, y: 260 })
  })

  it("clamps landmarks outside the normalized camera frame", () => {
    expect(
      mapMirroredCameraPointToCanvas(
        { x: -0.2, y: 1.4 },
        { left: 0, top: 0, width: 100, height: 50 },
      ),
    ).toEqual({ x: 100, y: 50 })
  })
})

describe("PointerMotionFilter", () => {
  it("smooths pointer movement over elapsed time", () => {
    const filter = new PointerMotionFilter({ timeConstantMs: 100 })

    expect(filter.update({ x: 0, y: 0 }, 0).point).toEqual({ x: 0, y: 0 })
    const moved = filter.update({ x: 100, y: 50 }, 100).point

    expect(moved?.x).toBeCloseTo(63.21, 2)
    expect(moved?.y).toBeCloseTo(31.61, 2)
  })

  it("locks the last reliable position without extrapolating on loss", () => {
    const filter = new PointerMotionFilter()
    filter.update({ x: 20, y: 30 }, 0)
    const lastReliable = filter.update({ x: 40, y: 50 }, 45)

    expect(filter.update(null, 90)).toEqual({
      point: lastReliable.point,
      reliable: false,
    })
    expect(filter.update(null, 10_000)).toEqual({
      point: lastReliable.point,
      reliable: false,
    })
  })

  it("restarts from the next reliable point after tracking loss", () => {
    const filter = new PointerMotionFilter()
    filter.update({ x: 10, y: 10 }, 0)
    filter.update(null, 16)

    expect(filter.update({ x: 90, y: 80 }, 32)).toEqual({
      point: { x: 90, y: 80 },
      reliable: true,
    })
  })

  it("can clear the last reliable position", () => {
    const filter = new PointerMotionFilter()
    filter.update({ x: 10, y: 10 }, 0)
    filter.reset()

    expect(filter.update(null, 16)).toEqual({ point: null, reliable: false })
  })
})
