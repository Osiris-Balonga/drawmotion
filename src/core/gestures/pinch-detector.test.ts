import { describe, expect, it } from "vitest"

import {
  handFromGestureFixture,
  withPinchRatio,
} from "@/test/fixtures/gesture-landmarks"

import { measurePinchRatio, PinchDetector } from "./pinch-detector"

describe("PinchDetector", () => {
  it("confirms entry, tolerates hand rotation and delays release", () => {
    const detector = new PinchDetector()
    const pinched = handFromGestureFixture(withPinchRatio(0.15))
    const rotatedPinch = handFromGestureFixture(withPinchRatio(0.3))
    const released = handFromGestureFixture(withPinchRatio(0.4))

    expect(detector.update(pinched, true, 0).phase).toBe("released")
    expect(detector.update(pinched, true, 16).phase).toBe("active")
    expect(detector.update(rotatedPinch, true, 32).phase).toBe("active")
    expect(detector.update(released, true, 48).phase).toBe("pending-release")
    expect(detector.update(released, true, 180).phase).toBe("pending-release")
    expect(detector.update(released, true, 208).phase).toBe("released")
  })

  it("recovers a brief false release without ending the pinch", () => {
    const detector = new PinchDetector()
    const pinched = handFromGestureFixture(withPinchRatio(0.15))
    const released = handFromGestureFixture(withPinchRatio(0.4))

    detector.update(pinched, true, 0)
    detector.update(pinched, true, 16)

    expect(detector.update(released, true, 100).phase).toBe("pending-release")
    expect(detector.update(pinched, true, 200).phase).toBe("active")
  })

  it("does not change pinch state from unreliable frames", () => {
    const detector = new PinchDetector()
    const pinched = handFromGestureFixture(withPinchRatio(0.15))

    expect(detector.update(pinched, true, 0).phase).toBe("released")
    expect(detector.update(pinched, false, 16)).toEqual({
      phase: "released",
      ratio: null,
    })
    expect(detector.update(pinched, true, 32).phase).toBe("released")
  })

  it("prefers three-dimensional world landmarks for the pinch distance", () => {
    const hand = handFromGestureFixture(withPinchRatio(0.15))
    hand.worldLandmarks = withPinchRatio(0.3)

    expect(measurePinchRatio(hand)).toBeCloseTo(0.3)
  })
})
