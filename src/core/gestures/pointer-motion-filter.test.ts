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

  it("supports an explicit calibrated region when one is provided", () => {
    const bounds = { left: 0, top: 0, width: 1000, height: 500 }
    const region = { left: 0.1, right: 0.9, top: 0.2, bottom: 0.8 }

    expect(
      mapMirroredCameraPointToCanvas({ x: 0.1, y: 0.2 }, bounds, region),
    ).toEqual({ x: 1000, y: 0 })
    expect(
      mapMirroredCameraPointToCanvas({ x: 0.9, y: 0.8 }, bounds, region),
    ).toEqual({ x: 0, y: 500 })
  })
})

describe("PointerMotionFilter", () => {
  it("smooths ordinary pointer movement without adding fixed latency", () => {
    const filter = new PointerMotionFilter()

    expect(filter.update({ x: 0.4, y: 0.4 }, 0).point).toEqual({
      x: 0.4,
      y: 0.4,
    })
    const moved = filter.update({ x: 0.5, y: 0.45 }, 100).point

    expect(moved?.x).toBeGreaterThan(0.4)
    expect(moved?.x).toBeLessThan(0.5)
    expect(moved?.y).toBeGreaterThan(0.4)
    expect(moved?.y).toBeLessThan(0.45)
  })

  it("locks the last reliable position without extrapolating on loss", () => {
    const filter = new PointerMotionFilter()
    filter.update({ x: 20, y: 30 }, 0)
    const lastReliable = filter.update({ x: 40, y: 50 }, 45)

    expect(filter.update(null, 90)).toEqual({
      point: lastReliable.point,
      reliable: false,
      discontinuity: false,
    })
    expect(filter.update(null, 10_000)).toEqual({
      point: lastReliable.point,
      reliable: false,
      discontinuity: false,
    })
  })

  it("keeps a nearby reacquisition continuous after tracking loss", () => {
    const filter = new PointerMotionFilter()
    filter.update({ x: 0.4, y: 0.4 }, 0)
    filter.update(null, 16)

    const reacquired = filter.update({ x: 0.43, y: 0.42 }, 32)
    expect(reacquired.reliable).toBe(true)
    expect(reacquired.discontinuity).toBe(false)
  })

  it("rejects and confirms a distant reacquisition without bridging it", () => {
    const filter = new PointerMotionFilter()
    filter.update({ x: 0.5, y: 0.85 }, 0)
    filter.update(null, 16)

    expect(filter.update({ x: 0.5, y: 0.1 }, 32)).toEqual({
      point: { x: 0.5, y: 0.85 },
      reliable: false,
      discontinuity: true,
    })
    expect(filter.update({ x: 0.51, y: 0.11 }, 48)).toEqual({
      point: { x: 0.51, y: 0.11 },
      reliable: true,
      discontinuity: true,
    })
    expect(filter.update({ x: 0.52, y: 0.12 }, 64)).toMatchObject({
      reliable: true,
      discontinuity: false,
    })
  })

  it("can clear the last reliable position", () => {
    const filter = new PointerMotionFilter()
    filter.update({ x: 10, y: 10 }, 0)
    filter.reset()

    expect(filter.update(null, 16)).toEqual({
      point: null,
      reliable: false,
      discontinuity: false,
    })
  })

  it("does not treat time without tracking as evidence of continuous movement", () => {
    const filter = new PointerMotionFilter()
    filter.update({ x: 0.4, y: 0.35 }, 0)
    filter.update(null, 400)

    expect(filter.update({ x: 0.6, y: 0.55 }, 450)).toMatchObject({
      reliable: false,
      discontinuity: true,
    })
    expect(filter.update({ x: 0.6, y: 0.55 }, 500)).toEqual({
      point: { x: 0.6, y: 0.55 },
      reliable: true,
      discontinuity: true,
    })
  })
})
