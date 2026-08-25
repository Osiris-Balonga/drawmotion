import { describe, expect, it } from "vitest"

import {
  createOnboardingState,
  initialOnboardingState,
  observeOnboardingEvent,
  ONBOARDING_STABLE_FRAMES,
  previousOnboardingStep,
  type OnboardingEvent,
  type OnboardingState,
} from "./onboarding-machine"

function observeRepeatedly(
  state: OnboardingState,
  event: OnboardingEvent,
  count = ONBOARDING_STABLE_FRAMES,
) {
  for (let index = 0; index < count; index += 1) {
    state = observeOnboardingEvent(state, event)
  }
  return state
}

describe("onboarding progression", () => {
  it("validates three deliberate cursor targets before drawing", () => {
    let state = initialOnboardingState

    for (let target = 0; target < 3; target += 1) {
      state = observeRepeatedly(state, {
        type: "CURSOR_TARGET_OBSERVED",
        inside: true,
      })
    }

    expect(state).toEqual(createOnboardingState("draw"))
  })

  it("resets cursor stability outside the active target", () => {
    let state = observeRepeatedly(
      initialOnboardingState,
      { type: "CURSOR_TARGET_OBSERVED", inside: true },
      ONBOARDING_STABLE_FRAMES - 1,
    )
    state = observeOnboardingEvent(state, {
      type: "CURSOR_TARGET_OBSERVED",
      inside: false,
    })

    expect(state).toEqual(initialOnboardingState)
  })

  it("requires a real stroke, both style choices, a shape and an undo", () => {
    let state = createOnboardingState("draw")
    state = observeOnboardingEvent(state, { type: "STROKE_COMPLETED" })
    expect(state.step).toBe("style")

    state = observeOnboardingEvent(state, { type: "COLOR_CHANGED" })
    expect(state.step).toBe("style")
    expect(state.colorChanged).toBe(true)

    state = observeOnboardingEvent(state, { type: "THICKNESS_CHANGED" })
    expect(state.step).toBe("shapes")

    state = observeOnboardingEvent(state, {
      type: "ASSISTED_SHAPE_CREATED",
    })
    expect(state.step).toBe("correct")

    state = observeOnboardingEvent(state, { type: "UNDO_USED" })
    expect(state.step).toBe("complete")
  })

  it("ignores unrelated events and supports returning to the previous mission", () => {
    expect(
      observeOnboardingEvent(initialOnboardingState, {
        type: "STROKE_COMPLETED",
      }),
    ).toBe(initialOnboardingState)
    expect(previousOnboardingStep(createOnboardingState("shapes"))).toEqual(
      createOnboardingState("style"),
    )
    expect(previousOnboardingStep(initialOnboardingState)).toBe(
      initialOnboardingState,
    )
    const drawing = createOnboardingState("draw")
    expect(observeOnboardingEvent(drawing, { type: "COLOR_CHANGED" })).toBe(
      drawing,
    )
    const complete = createOnboardingState("complete")
    expect(observeOnboardingEvent(complete, { type: "UNDO_USED" })).toBe(
      complete,
    )
    expect(previousOnboardingStep(complete)).toEqual(
      createOnboardingState("correct"),
    )
  })
})
