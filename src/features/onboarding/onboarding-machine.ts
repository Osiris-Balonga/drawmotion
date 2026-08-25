import type { GestureKind } from "@/core/gestures/gesture-classifier"

export type OnboardingStep = 0 | 1 | 2 | 3

export type OnboardingState = {
  step: OnboardingStep
  stableFrames: number
}

export const ONBOARDING_STABLE_FRAMES = 10

export const initialOnboardingState: OnboardingState = {
  step: 0,
  stableFrames: 0,
}

function matchesStep(step: OnboardingStep, gesture: GestureKind) {
  if (step === 0) return gesture !== "tracking-lost" && gesture !== "uncertain"
  if (step === 1) return gesture === "pinch"
  if (step === 2) return gesture === "open-hand"
  return false
}

export function observeOnboardingGesture(
  state: OnboardingState,
  gesture: GestureKind,
): OnboardingState {
  if (state.step === 3) return state
  if (!matchesStep(state.step, gesture)) {
    return state.stableFrames === 0 ? state : { ...state, stableFrames: 0 }
  }
  const stableFrames = state.stableFrames + 1
  if (stableFrames < ONBOARDING_STABLE_FRAMES) {
    return { ...state, stableFrames }
  }
  return {
    step: (state.step + 1) as OnboardingStep,
    stableFrames: 0,
  }
}

export function previousOnboardingStep(
  state: OnboardingState,
): OnboardingState {
  return {
    step: Math.max(0, state.step - 1) as OnboardingStep,
    stableFrames: 0,
  }
}
