import { describe, expect, it } from "vitest"

import {
  loadOnboardingProgress,
  resetOnboardingCompletion,
  saveOnboardingProgress,
} from "./onboarding-persistence"

function createStorage() {
  const values = new Map<string, string>()
  return {
    values,
    adapter: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    } as unknown as Storage,
  }
}

describe("onboarding progress persistence", () => {
  it("stores resumable, versioned progress", () => {
    const { adapter, values } = createStorage()

    saveOnboardingProgress(
      { status: "in_progress", currentStep: "style" },
      adapter,
    )

    expect(loadOnboardingProgress(adapter)).toEqual({
      status: "in_progress",
      currentStep: "style",
    })
    expect([...values.values()][0]).toBe(
      JSON.stringify({
        version: 2,
        status: "in_progress",
        currentStep: "style",
      }),
    )
  })

  it("stores completion and can reset it", () => {
    const { adapter } = createStorage()

    saveOnboardingProgress(
      { status: "completed", currentStep: "complete" },
      adapter,
    )
    expect(loadOnboardingProgress(adapter)).toEqual({
      status: "completed",
      currentStep: "complete",
    })

    resetOnboardingCompletion(adapter)
    expect(loadOnboardingProgress(adapter)).toEqual({
      status: "new",
      currentStep: "cursor",
    })
  })

  it("normalizes skipped and newly-started sessions", () => {
    const { adapter } = createStorage()

    saveOnboardingProgress(
      { status: "skipped", currentStep: "cursor" },
      adapter,
    )
    expect(loadOnboardingProgress(adapter)).toEqual({
      status: "skipped",
      currentStep: "complete",
    })

    saveOnboardingProgress({ status: "new", currentStep: "draw" }, adapter)
    expect(loadOnboardingProgress(adapter)).toEqual({
      status: "in_progress",
      currentStep: "draw",
    })
  })

  it("treats missing, malformed and outdated values as a first visit", () => {
    const values = [
      null,
      "not-json",
      JSON.stringify({ version: 1, completed: true }),
    ]
    const storage = {
      getItem: () => values.shift() ?? null,
    } as unknown as Storage

    for (let index = 0; index < 3; index += 1) {
      expect(loadOnboardingProgress(storage)).toEqual({
        status: "new",
        currentStep: "cursor",
      })
    }
  })

  it("does not fail when browser storage is unavailable", () => {
    const storage = {
      getItem: () => {
        throw new Error("blocked")
      },
      removeItem: () => {
        throw new Error("blocked")
      },
      setItem: () => {
        throw new Error("blocked")
      },
    } as unknown as Storage

    expect(loadOnboardingProgress(storage)).toEqual({
      status: "new",
      currentStep: "cursor",
    })
    expect(() =>
      saveOnboardingProgress(
        { status: "in_progress", currentStep: "draw" },
        storage,
      ),
    ).not.toThrow()
    expect(() => resetOnboardingCompletion(storage)).not.toThrow()
  })
})
