import { describe, expect, it } from "vitest"

import type { NormalizedLandmark } from "@/infrastructure/mediapipe/hand-tracker-port"
import { withPinchRatio } from "@/test/fixtures/gesture-landmarks"

function distance(a: NormalizedLandmark, b: NormalizedLandmark) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function pinchRatio(landmarks: NormalizedLandmark[]) {
  const wrist = landmarks[0]
  const middleMcp = landmarks[9]
  const thumbTip = landmarks[4]
  const indexTip = landmarks[8]

  if (!wrist || !middleMcp || !thumbTip || !indexTip) {
    throw new Error("Expected a complete hand fixture")
  }

  return distance(thumbTip, indexTip) / distance(wrist, middleMcp)
}

describe("pinch boundary fixture generator", () => {
  it.each([0.17, 0.18, 0.24, 0.25])(
    "creates exact non-regression poses around ratio %s",
    (ratio) => {
      expect(pinchRatio(withPinchRatio(ratio))).toBeCloseTo(ratio, 8)
    },
  )
})
