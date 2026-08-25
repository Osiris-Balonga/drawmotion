const STORAGE_KEY = "drawmotion:onboarding"
const STORAGE_VERSION = 1

type OnboardingPreference = {
  version: typeof STORAGE_VERSION
  completed: boolean
}

export function loadOnboardingCompletion(storage: Storage = localStorage) {
  try {
    const value = storage.getItem(STORAGE_KEY)
    if (!value) return false
    const parsed = JSON.parse(value) as Partial<OnboardingPreference>
    return parsed.version === STORAGE_VERSION && parsed.completed === true
  } catch {
    return false
  }
}

export function saveOnboardingCompletion(storage: Storage = localStorage) {
  const preference: OnboardingPreference = {
    version: STORAGE_VERSION,
    completed: true,
  }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(preference))
  } catch {
    // Drawing remains available when private storage is unavailable.
  }
}

export function resetOnboardingCompletion(storage: Storage = localStorage) {
  try {
    storage.removeItem(STORAGE_KEY)
  } catch {
    // Reset is best-effort and never blocks the camera experience.
  }
}
