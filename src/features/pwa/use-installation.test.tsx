import { act, renderHook } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { useInstallation } from "./use-installation"

afterEach(() => vi.restoreAllMocks())

it("requests installation only on explicit action and consumes the prompt once", async () => {
  const { result, unmount } = renderHook(() => useInstallation())
  const prompt = vi.fn().mockResolvedValue({ outcome: "dismissed" })
  const event = Object.assign(
    new Event("beforeinstallprompt", { cancelable: true }),
    { prompt },
  )
  act(() => {
    window.dispatchEvent(event)
  })
  expect(event.defaultPrevented).toBe(true)
  expect(prompt).not.toHaveBeenCalled()
  expect(result.current.canPrompt).toBe(true)
  await act(async () => {
    result.current.install()
    await Promise.resolve()
  })
  expect(prompt).toHaveBeenCalledTimes(1)
  expect(result.current.canPrompt).toBe(false)
  act(() => result.current.install())
  expect(prompt).toHaveBeenCalledTimes(1)
  act(() => {
    window.dispatchEvent(new Event("appinstalled"))
  })
  expect(result.current.standalone).toBe(true)
  unmount()
  const later = new Event("beforeinstallprompt", { cancelable: true })
  window.dispatchEvent(later)
  expect(later.defaultPrevented).toBe(false)
})

it("does not request persistent storage until asked and handles a denial", async () => {
  const persist = vi.fn().mockResolvedValue(false)
  const original = Object.getOwnPropertyDescriptor(navigator, "storage")
  Object.defineProperty(navigator, "storage", {
    configurable: true,
    value: { persist, persisted: () => Promise.resolve(false) },
  })
  try {
    const { result, unmount } = renderHook(() => useInstallation())
    expect(persist).not.toHaveBeenCalled()
    await act(async () => result.current.persist())
    expect(result.current.storage).toBe("denied")
    persist.mockResolvedValue(true)
    await act(async () => result.current.persist())
    expect(result.current.storage).toBe("granted")
    unmount()
  } finally {
    if (original) Object.defineProperty(navigator, "storage", original)
    else Reflect.deleteProperty(navigator, "storage")
  }
})
