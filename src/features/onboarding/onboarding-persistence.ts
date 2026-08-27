import type { ActiveOnboardingStep, OnboardingStep } from "./onboarding-machine"

const STORAGE_KEY = "drawmotion:onboarding"
const STORAGE_VERSION = 2

export type OnboardingStatus = "new" | "in_progress" | "completed" | "skipped"

export type OnboardingProgress = {
  status: OnboardingStatus
  currentStep: OnboardingStep
}

type StoredOnboardingProgress = {
  version: typeof STORAGE_VERSION
  status: Exclude<OnboardingStatus, "new">
  currentStep: OnboardingStep
}

const activeSteps: readonly string[] = [
  "cursor",
  "draw",
  "style",
  "shapes",
  "correct",
]

function isStoredProgress(
  value: Partial<StoredOnboardingProgress>,
): value is StoredOnboardingProgress {
  const validStatus =
    value.status === "in_progress" ||
    value.status === "completed" ||
    value.status === "skipped"
  const validStep =
    value.currentStep === "complete" ||
    activeSteps.includes(value.currentStep as ActiveOnboardingStep)
  return value.version === STORAGE_VERSION && validStatus && validStep
}

export function loadOnboardingProgress(storage?: Storage): OnboardingProgress {
  try {
    const value = (storage ?? localStorage).getItem(STORAGE_KEY)
    if (!value) return { status: "new", currentStep: "cursor" }
    const parsed = JSON.parse(value) as Partial<StoredOnboardingProgress>
    if (!isStoredProgress(parsed)) {
      return { status: "new", currentStep: "cursor" }
    }
    return {
      status: parsed.status,
      currentStep:
        parsed.status === "completed" || parsed.status === "skipped"
          ? "complete"
          : parsed.currentStep,
    }
  } catch {
    return { status: "new", currentStep: "cursor" }
  }
}

export function saveOnboardingProgress(
  progress: OnboardingProgress,
  storage?: Storage,
) {
  const preference: StoredOnboardingProgress = {
    version: STORAGE_VERSION,
    status: progress.status === "new" ? "in_progress" : progress.status,
    currentStep: progress.currentStep,
  }
  try {
    const target = storage ?? localStorage
    target.setItem(STORAGE_KEY, JSON.stringify(preference))
  } catch {
    // Drawing remains available when private storage is unavailable.
  }
}

export function resetOnboardingCompletion(storage?: Storage) {
  try {
    const target = storage ?? localStorage
    target.removeItem(STORAGE_KEY)
  } catch {
    // Reset is best-effort and never blocks the camera experience.
  }
}
