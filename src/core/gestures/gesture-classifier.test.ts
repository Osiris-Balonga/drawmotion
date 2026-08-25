import { describe, expect, it } from "vitest"

import {
  fistGestureLandmarks,
  handFromGestureFixture,
  openHandGestureLandmarks,
  pinchGestureLandmarks,
  uncertainGestureLandmarks,
  withPinchRatio,
} from "@/test/fixtures/gesture-landmarks"

import { classifyGesture } from "./gesture-classifier"

describe("classifyGesture", () => {
  it.each([
    ["pinch", pinchGestureLandmarks, "pinch"],
    ["open hand", openHandGestureLandmarks, "open-hand"],
    ["fist", fistGestureLandmarks, "fist"],
    ["uncertain hand", uncertainGestureLandmarks, "uncertain"],
  ] as const)("classifies a %s fixture", (_name, landmarks, expected) => {
    expect(classifyGesture(handFromGestureFixture(landmarks)).kind).toBe(
      expected,
    )
  })

  it("reports tracking loss when no complete hand is available", () => {
    expect(classifyGesture(null).kind).toBe("tracking-lost")
    expect(classifyGesture(handFromGestureFixture([])).kind).toBe(
      "tracking-lost",
    )
  })

  it("rejects a low-confidence hand", () => {
    expect(
      classifyGesture(handFromGestureFixture(pinchGestureLandmarks, 0.64)).kind,
    ).toBe("uncertain")
  })

  it("uses separate pinch entry and exit thresholds", () => {
    const inDeadBand = handFromGestureFixture(withPinchRatio(0.36))

    expect(classifyGesture(inDeadBand, "open-hand").kind).toBe("open-hand")
    expect(classifyGesture(inDeadBand, "pinch").kind).toBe("pinch")
  })

  it.each([
    [0.3, "open-hand", "pinch"],
    [0.301, "open-hand", "open-hand"],
    [0.42, "pinch", "pinch"],
    [0.421, "pinch", "open-hand"],
  ] as const)(
    "keeps ratio %s stable from %s",
    (ratio, previousKind, expected) => {
      const hand = handFromGestureFixture(withPinchRatio(ratio))
      expect(classifyGesture(hand, previousKind).kind).toBe(expected)
    },
  )
})
