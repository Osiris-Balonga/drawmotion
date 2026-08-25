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

export function loadOnboardingProgress(
  storage: Storage = localStorage,
): OnboardingProgress {
  try {
    const value = storage.getItem(STORAGE_KEY)
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
  storage: Storage = localStorage,
) {
  const preference: StoredOnboardingProgress = {
    version: STORAGE_VERSION,
    status: progress.status === "new" ? "in_progress" : progress.status,
    currentStep: progress.currentStep,
  }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(preference))
  } catch {
    // Drawing remains available when private storage is unavailable.
  }
}

export function saveOnboardingCompletion(storage: Storage = localStorage) {
  saveOnboardingProgress(
    { status: "completed", currentStep: "complete" },
    storage,
  )
}

export function loadOnboardingCompletion(storage: Storage = localStorage) {
  const progress = loadOnboardingProgress(storage)
  return progress.status === "completed" || progress.status === "skipped"
}

export function resetOnboardingCompletion(storage: Storage = localStorage) {
  try {
    storage.removeItem(STORAGE_KEY)
  } catch {
    // Reset is best-effort and never blocks the camera experience.
  }
}
