import { describe, expect, it } from "vitest"

import {
  handFromGestureFixture,
  pinchGestureLandmarks,
} from "@/test/fixtures/gesture-landmarks"

import { selectGesturePointer } from "./gesture-pointer"

describe("selectGesturePointer", () => {
  it("keeps the index tip as the pointer through a pinch", () => {
    const hand = handFromGestureFixture(pinchGestureLandmarks)
    expect(selectGesturePointer(hand)).toBe(hand.landmarks[8])
  })

  it("returns no pointer for missing hand geometry", () => {
    expect(selectGesturePointer(null)).toBeNull()
    expect(selectGesturePointer(handFromGestureFixture([]))).toBeNull()
  })
})
