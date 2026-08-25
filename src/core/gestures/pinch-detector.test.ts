import { describe, expect, it } from "vitest"

import {
  handFromGestureFixture,
  withPinchRatio,
} from "@/test/fixtures/gesture-landmarks"

import { measurePinchRatio, PinchDetector } from "./pinch-detector"

describe("PinchDetector", () => {
  it("confirms pinch entry and release on two reliable frames", () => {
    const detector = new PinchDetector()
    const pinched = handFromGestureFixture(withPinchRatio(0.15))
    const released = handFromGestureFixture(withPinchRatio(0.3))

    expect(detector.update(pinched, true).active).toBe(false)
    expect(detector.update(pinched, true).active).toBe(true)
    expect(detector.update(released, true).active).toBe(true)
    expect(detector.update(released, true).active).toBe(false)
  })

  it("does not change pinch state from unreliable frames", () => {
    const detector = new PinchDetector()
    const pinched = handFromGestureFixture(withPinchRatio(0.15))

    expect(detector.update(pinched, true).active).toBe(false)
    expect(detector.update(pinched, false)).toEqual({
      active: false,
      ratio: null,
    })
    expect(detector.update(pinched, true).active).toBe(false)
  })

  it("prefers three-dimensional world landmarks for the pinch distance", () => {
    const hand = handFromGestureFixture(withPinchRatio(0.15))
    hand.worldLandmarks = withPinchRatio(0.3)

    expect(measurePinchRatio(hand)).toBeCloseTo(0.3)
  })
})
