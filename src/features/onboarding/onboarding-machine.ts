export const onboardingSteps = [
  "cursor",
  "draw",
  "style",
  "shapes",
  "correct",
] as const

export type ActiveOnboardingStep = (typeof onboardingSteps)[number]
export type OnboardingStep = ActiveOnboardingStep | "complete"

export type OnboardingState = {
  step: OnboardingStep
  cursorTarget: number
  stableFrames: number
  colorChanged: boolean
  thicknessChanged: boolean
}

export type OnboardingEvent =
  | { type: "CURSOR_TARGET_OBSERVED"; inside: boolean }
  | { type: "STROKE_COMPLETED" }
  | { type: "COLOR_CHANGED" }
  | { type: "THICKNESS_CHANGED" }
  | { type: "ASSISTED_SHAPE_CREATED" }
  | { type: "UNDO_USED" }

export const ONBOARDING_CURSOR_TARGETS = 3
export const ONBOARDING_STABLE_FRAMES = 6

export const initialOnboardingState: OnboardingState = {
  step: "cursor",
  cursorTarget: 0,
  stableFrames: 0,
  colorChanged: false,
  thicknessChanged: false,
}

export function createOnboardingState(step: OnboardingStep): OnboardingState {
  return { ...initialOnboardingState, step }
}

export function observeOnboardingEvent(
  state: OnboardingState,
  event: OnboardingEvent,
): OnboardingState {
  if (state.step === "complete") return state

  if (state.step === "cursor") {
    if (event.type !== "CURSOR_TARGET_OBSERVED") return state
    if (!event.inside) {
      return state.stableFrames === 0 ? state : { ...state, stableFrames: 0 }
    }
    const stableFrames = state.stableFrames + 1
    if (stableFrames < ONBOARDING_STABLE_FRAMES) {
      return { ...state, stableFrames }
    }
    const cursorTarget = state.cursorTarget + 1
    return cursorTarget < ONBOARDING_CURSOR_TARGETS
      ? { ...state, cursorTarget, stableFrames: 0 }
      : createOnboardingState("draw")
  }

  if (state.step === "draw" && event.type === "STROKE_COMPLETED") {
    return createOnboardingState("style")
  }

  if (state.step === "style") {
    const colorChanged = state.colorChanged || event.type === "COLOR_CHANGED"
    const thicknessChanged =
      state.thicknessChanged || event.type === "THICKNESS_CHANGED"
    if (colorChanged && thicknessChanged) {
      return createOnboardingState("shapes")
    }
    if (
      colorChanged !== state.colorChanged ||
      thicknessChanged !== state.thicknessChanged
    ) {
      return { ...state, colorChanged, thicknessChanged }
    }
  }

  if (state.step === "shapes" && event.type === "ASSISTED_SHAPE_CREATED") {
    return createOnboardingState("correct")
  }

  if (state.step === "correct" && event.type === "UNDO_USED") {
    return createOnboardingState("complete")
  }

  return state
}

export function previousOnboardingStep(
  state: OnboardingState,
): OnboardingState {
  const currentIndex =
    state.step === "complete"
      ? onboardingSteps.length
      : onboardingSteps.indexOf(state.step)
  const previous = onboardingSteps[Math.max(0, currentIndex - 1)] ?? "cursor"
  if (previous === state.step) return state
  return createOnboardingState(previous)
}
