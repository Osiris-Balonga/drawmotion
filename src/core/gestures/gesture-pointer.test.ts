import { describe, expect, it } from "vitest"

import {
  handFromGestureFixture,
  pinchGestureLandmarks,
} from "@/test/fixtures/gesture-landmarks"

import { selectGesturePointer } from "./gesture-pointer"

describe("selectGesturePointer", () => {
  it("uses the pinch center instead of a jitter-prone single fingertip", () => {
    const hand = handFromGestureFixture(pinchGestureLandmarks)
    const thumb = hand.landmarks[4]!
    const index = hand.landmarks[8]!

    expect(selectGesturePointer(hand, "pinch")).toEqual({
      x: (thumb.x + index.x) / 2,
      y: (thumb.y + index.y) / 2,
      z: (thumb.z + index.z) / 2,
    })
  })

  it("keeps the index tip as the ordinary pointer", () => {
    const hand = handFromGestureFixture(pinchGestureLandmarks)
    expect(selectGesturePointer(hand, "open-hand")).toBe(hand.landmarks[8])
  })

  it("returns no pointer for missing hand geometry", () => {
    expect(selectGesturePointer(null, "tracking-lost")).toBeNull()
    expect(selectGesturePointer(handFromGestureFixture([]), "pinch")).toBeNull()
  })
})
