import { describe, expect, it } from "vitest"

import {
  fistGestureLandmarks,
  handFromGestureFixture,
  menuGestureLandmarks,
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
    ["menu pose", menuGestureLandmarks, "menu"],
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

  it("does not confuse handedness confidence with tracking quality", () => {
    expect(
      classifyGesture(handFromGestureFixture(pinchGestureLandmarks, 0.1)).kind,
    ).toBe("pinch")
  })

  it("uses separate pinch entry and exit thresholds", () => {
    const inDeadBand = handFromGestureFixture(withPinchRatio(0.21))

    expect(classifyGesture(inDeadBand, "open-hand").kind).toBe("open-hand")
    expect(classifyGesture(inDeadBand, "pinch").kind).toBe("pinch")
  })

  it.each([
    [0.18, "open-hand", "pinch"],
    [0.181, "open-hand", "open-hand"],
    [0.24, "pinch", "pinch"],
    [0.241, "pinch", "open-hand"],
  ] as const)(
    "keeps ratio %s stable from %s",
    (ratio, previousKind, expected) => {
      const hand = handFromGestureFixture(withPinchRatio(ratio))
      expect(classifyGesture(hand, previousKind).kind).toBe(expected)
    },
  )
})
