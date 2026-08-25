import { describe, expect, it } from "vitest"

import {
  initialOnboardingState,
  observeOnboardingGesture,
  ONBOARDING_STABLE_FRAMES,
  previousOnboardingStep,
  type OnboardingState,
} from "./onboarding-machine"

function observeRepeatedly(
  state: OnboardingState,
  gesture: Parameters<typeof observeOnboardingGesture>[1],
  count = ONBOARDING_STABLE_FRAMES,
) {
  for (let index = 0; index < count; index += 1) {
    state = observeOnboardingGesture(state, gesture)
  }
  return state
}

describe("onboarding progression", () => {
  it("validates stable placement, pinch, then open hand", () => {
    const placed = observeRepeatedly(initialOnboardingState, "open-hand")
    const pinched = observeRepeatedly(placed, "pinch")
    const completed = observeRepeatedly(pinched, "open-hand")

    expect(placed.step).toBe(1)
    expect(pinched.step).toBe(2)
    expect(completed.step).toBe(3)
  })

  it("resets stability when the expected gesture is interrupted", () => {
    let state = observeRepeatedly(
      { step: 1, stableFrames: 0 },
      "pinch",
      ONBOARDING_STABLE_FRAMES - 1,
    )
    state = observeOnboardingGesture(state, "open-hand")

    expect(state).toEqual({ step: 1, stableFrames: 0 })
  })

  it("does not churn identity for an already invalid or completed state", () => {
    expect(observeOnboardingGesture(initialOnboardingState, "uncertain")).toBe(
      initialOnboardingState,
    )
    const complete = { step: 3, stableFrames: 0 } as const
    expect(observeOnboardingGesture(complete, "pinch")).toBe(complete)
  })

  it("supports returning to the previous step", () => {
    expect(previousOnboardingStep({ step: 2, stableFrames: 6 })).toEqual({
      step: 1,
      stableFrames: 0,
    })
    expect(previousOnboardingStep(initialOnboardingState)).toEqual(
      initialOnboardingState,
    )
  })
})
