import { describe, expect, it, vi } from "vitest"

import {
  loadOnboardingCompletion,
  resetOnboardingCompletion,
  saveOnboardingCompletion,
} from "./onboarding-persistence"

describe("onboarding completion persistence", () => {
  it("stores only a versioned completion flag", () => {
    const storage = new Map<string, string>()
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    } as unknown as Storage

    saveOnboardingCompletion(adapter)
    expect(loadOnboardingCompletion(adapter)).toBe(true)
    expect([...storage.values()][0]).toBe(
      JSON.stringify({ version: 1, completed: true }),
    )
    resetOnboardingCompletion(adapter)
    expect(loadOnboardingCompletion(adapter)).toBe(false)
  })

  it("rejects missing, malformed, or outdated values", () => {
    const getItem = vi
      .fn<Storage["getItem"]>()
      .mockReturnValueOnce(null)
      .mockReturnValueOnce("not-json")
      .mockReturnValueOnce(JSON.stringify({ version: 0, completed: true }))
    const storage = { getItem } as unknown as Storage

    expect(loadOnboardingCompletion(storage)).toBe(false)
    expect(loadOnboardingCompletion(storage)).toBe(false)
    expect(loadOnboardingCompletion(storage)).toBe(false)
  })

  it("does not fail when browser storage is unavailable", () => {
    const failure = new Error("blocked")
    const storage = {
      getItem: () => {
        throw failure
      },
      removeItem: () => {
        throw failure
      },
      setItem: () => {
        throw failure
      },
    } as unknown as Storage

    expect(loadOnboardingCompletion(storage)).toBe(false)
    expect(() => saveOnboardingCompletion(storage)).not.toThrow()
    expect(() => resetOnboardingCompletion(storage)).not.toThrow()
  })
})
