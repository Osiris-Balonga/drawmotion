import type { OnboardingState } from "@/features/onboarding/onboarding-machine"

export function canOpenGestureMenu(step: OnboardingState["step"]) {
  return step !== "cursor" && step !== "draw"
}
