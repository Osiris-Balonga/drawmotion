import { act, renderHook } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { t } from "@/i18n"
import { PwaClient } from "@/infrastructure/pwa/pwa-client"
import { useConnectivity } from "./use-connectivity"

vi.mock("sonner", () => ({ toast: { message: vi.fn() } }))
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it("confirms reconnection through an uncached request and coalesces noisy events", async () => {
  vi.useFakeTimers()
  const client = new PwaClient(
    {} as ServiceWorkerContainer,
    "https://example.test/drawmotion/",
  )
  const resume = vi
    .spyOn(client, "onVisible")
    .mockImplementation(() => undefined)
  vi.spyOn(client, "checkForUpdate").mockResolvedValue(undefined)
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ application: "drawmotion" }),
  })
  vi.stubGlobal("fetch", fetch)
  vi.mocked(toast.message).mockClear()
  const hook = renderHook(() => useConnectivity(client))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
  expect(hook.result.current).toBe("online")
  expect(toast.message).not.toHaveBeenCalled()
  fetch.mockRejectedValue(new Error("offline"))
  act(() => {
    window.dispatchEvent(new Event("offline"))
    window.dispatchEvent(new Event("offline"))
  })
  await act(async () => {
    await vi.advanceTimersByTimeAsync(800)
  })
  expect(hook.result.current).toBe("offline")
  expect(toast.message).toHaveBeenCalledTimes(1)
  // Unknown cache readiness on a cold launch must not be called incomplete.
  expect(toast.message).toHaveBeenLastCalledWith(
    t("pwa.disconnected"),
    expect.objectContaining({ id: "pwa-connection" }),
  )
  // A captive portal / cached shell is not a successful server probe.
  fetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ captive: true }),
  })
  act(() => {
    window.dispatchEvent(new Event("online"))
  })
  await act(async () => {
    await vi.advanceTimersByTimeAsync(800)
  })
  expect(hook.result.current).toBe("offline")
  expect(toast.message).toHaveBeenCalledTimes(1)
  fetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ application: "drawmotion" }),
  })
  act(() => {
    window.dispatchEvent(new Event("online"))
  })
  await act(async () => {
    await vi.advanceTimersByTimeAsync(800)
  })
  expect(hook.result.current).toBe("online")
  expect(resume).toHaveBeenCalledOnce()
  expect(fetch).toHaveBeenLastCalledWith(
    new URL("network-check.json", client.scope),
    expect.objectContaining({ cache: "no-store", redirect: "error" }),
  )
  hook.unmount()
  await act(async () => {
    await vi.advanceTimersByTimeAsync(120_000)
  })
  expect(fetch).toHaveBeenCalledTimes(4)
})
