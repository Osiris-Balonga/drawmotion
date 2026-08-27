import { afterEach, expect, it, vi } from "vitest"
import { clientsMatchBuild } from "./initial-control"

const scope = "https://example.test/drawmotion/"
function page(build: string, url = scope) {
  return {
    url,
    postMessage: vi.fn((_message: unknown, ports: Transferable[]) => {
      ;(ports[0] as MessagePort).postMessage(build)
    }),
  }
}
afterEach(() => vi.useRealTimers())

it("adopts only matching documents inside its own scope", async () => {
  const sibling = page("older", "https://example.test/another-project/")
  expect(
    await clientsMatchBuild([page("A"), page("A"), sibling], scope, "A"),
  ).toBe(true)
  expect(sibling.postMessage).not.toHaveBeenCalled()
  expect(await clientsMatchBuild([page("A"), page("B")], scope, "A")).toBe(
    false,
  )
})

it("leaves silent or closed pages alone instead of forcing control", async () => {
  vi.useFakeTimers()
  const silent = { url: scope, postMessage: vi.fn() }
  const result = clientsMatchBuild([silent], scope, "A")
  await vi.advanceTimersByTimeAsync(1500)
  expect(await result).toBe(false)
  silent.postMessage.mockImplementation(() => {
    throw new Error("closed")
  })
  expect(await clientsMatchBuild([silent], scope, "A")).toBe(false)
})
