import { afterEach, describe, expect, it, vi } from "vitest"
import { PwaClient, queryOfflineStatus } from "./pwa-client"

const scope = "https://example.test/drawmotion/"

function fixture(controlled = false) {
  const worker = Object.assign(new EventTarget(), {
    state: "activated",
    scriptURL: `${scope}sw.js`,
    missing: 0,
    postMessage: vi.fn(
      (message: { requestId: string }, ports: MessagePort[]) => {
        ports[0]!.postMessage({
          protocol: 1,
          requestId: message.requestId,
          scope,
          buildId: "A",
          complete: worker.missing === 0,
          missing: worker.missing,
        })
      },
    ),
  })
  const registration = Object.assign(new EventTarget(), {
    scope,
    active: worker,
    installing: null,
    waiting: null,
    update: vi.fn().mockResolvedValue(undefined),
  })
  const workers = Object.assign(new EventTarget(), {
    controller: controlled ? worker : null,
    getRegistration: vi.fn().mockResolvedValue(undefined),
    register: vi.fn().mockResolvedValue(registration),
  })
  const client = new PwaClient(
    workers as unknown as ServiceWorkerContainer,
    scope,
  )
  client.start()
  return { client, workers, registration, worker }
}

afterEach(() => vi.useRealTimers())

describe("offline lifecycle", () => {
  it("does not register until asked and distinguishes prepared from controlled", async () => {
    const { client, workers, worker } = fixture()
    await Promise.resolve()
    expect(workers.register).not.toHaveBeenCalled()
    await client.prepare()
    expect(workers.register).toHaveBeenCalledWith(`${scope}sw.js`, {
      scope,
      updateViaCache: "none",
    })
    expect(client.getSnapshot().offline).toBe("prepared-reopen")
    workers.controller = worker
    await client.verify()
    expect(client.getSnapshot().offline).toBe("ready")
    worker.missing = 1
    await client.verify()
    expect(client.getSnapshot().offline).toBe("failed")
    client.dispose()
  })

  it("coalesces verification and preserves ready state after an update failure", async () => {
    const { client, worker, registration } = fixture(true)
    await client.prepare()
    const first = client.verify()
    expect(client.verify()).toBe(first)
    await first
    registration.update.mockRejectedValue(new Error("offline"))
    await client.checkForUpdate(true)
    expect(client.getSnapshot()).toMatchObject({
      offline: "ready",
      update: "failed",
    })
    expect(worker.postMessage).toHaveBeenCalledTimes(2)
    client.dispose()
  })

  it("rejects registration failure without changing stored drawings", async () => {
    const { client, workers } = fixture()
    workers.register.mockRejectedValue(new Error("QuotaExceededError"))
    await client.prepare()
    expect(client.getSnapshot().offline).toBe("failed")
    client.dispose()
    const unsupported = new PwaClient(undefined, scope)
    unsupported.start()
    await unsupported.prepare()
    expect(unsupported.getSnapshot().offline).toBe("unavailable")
  })

  it("rejects mismatched protocol replies and times out without leaking a port", async () => {
    vi.useFakeTimers()
    const worker = {
      postMessage: (message: { requestId: string }, ports: MessagePort[]) =>
        ports[0]!.postMessage({
          protocol: 99,
          requestId: message.requestId,
          scope,
        }),
    }
    const result = queryOfflineStatus(worker as ServiceWorker, scope)
    const assertion = expect(result).rejects.toThrow("timed out")
    await vi.advanceTimersByTimeAsync(5000)
    await assertion
  })
})
