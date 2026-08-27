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
    active: null as typeof worker | null,
    installing: null as typeof worker | null,
    waiting: null as typeof worker | null,
    update: vi.fn().mockResolvedValue(undefined),
  })
  registration.active = worker
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

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

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

  it("reattaches only its own registration and throttles background checks", async () => {
    const { client, workers, registration, worker } = fixture(true)
    await Promise.resolve()
    client.dispose()
    workers.getRegistration.mockResolvedValue(registration)
    registration.scope = "https://example.test/another-app/"
    client.start()
    await Promise.resolve()
    expect(registration.update).not.toHaveBeenCalled()
    client.dispose()
    registration.scope = scope
    worker.scriptURL = `${scope}another-worker.js`
    client.start()
    await Promise.resolve()
    expect(registration.update).not.toHaveBeenCalled()
    client.dispose()
    worker.scriptURL = `${scope}sw.js`
    const now = vi.spyOn(Date, "now").mockReturnValue(2_000_000)
    client.start()
    await Promise.resolve()
    await client.verify()
    expect(client.getSnapshot().offline).toBe("ready")
    expect(registration.update).toHaveBeenCalledTimes(1)
    client.onVisible()
    await Promise.resolve()
    expect(worker.postMessage).toHaveBeenCalledTimes(1)
    expect(registration.update).toHaveBeenCalledTimes(1)
    now.mockReturnValue(3_000_000)
    registration.update.mockRejectedValue(new Error("offline"))
    client.onVisible()
    await client.verify()
    expect(registration.update).toHaveBeenCalledTimes(2)
    expect(client.getSnapshot()).toMatchObject({
      offline: "ready",
      update: "none",
    })
    client.dispose()
    now.mockRestore()
  })

  it("reports installation failures, observes retries and waits for activation", async () => {
    const { client, registration, worker } = fixture()
    registration.active = null
    worker.state = "installing"
    registration.installing = worker
    const pending = client.prepare()
    await client.prepare()
    await pending
    expect(client.getSnapshot().offline).toBe("preparing")
    await client.checkForUpdate(true)
    expect(registration.update).not.toHaveBeenCalled()
    worker.state = "redundant"
    worker.dispatchEvent(new Event("statechange"))
    expect(client.getSnapshot().offline).toBe("failed")
    registration.installing = null
    registration.active = worker
    worker.state = "activated"
    worker.dispatchEvent(new Event("statechange"))
    await client.verify()
    expect(client.getSnapshot().offline).toBe("prepared-reopen")
    const next = Object.assign(new EventTarget(), {
      state: "installing",
      scriptURL: worker.scriptURL,
      missing: 0,
      postMessage: worker.postMessage,
    })
    registration.installing = next
    registration.dispatchEvent(new Event("updatefound"))
    expect(client.getSnapshot().update).toBe("downloading")
    next.state = "installed"
    next.dispatchEvent(new Event("statechange"))
    registration.waiting = next
    expect(client.getSnapshot().update).toBe("waiting-for-close")
    await client.checkForUpdate(true)
    expect(registration.update).not.toHaveBeenCalled()
    client.dispose()
    next.state = "redundant"
    next.dispatchEvent(new Event("statechange"))
    expect(client.getSnapshot().update).toBe("waiting-for-close")
  })

  it("does not replace a pending update check or notify after disposal", async () => {
    const { client, registration } = fixture(true)
    const changed = vi.fn()
    const unsubscribe = client.subscribe(changed)
    await client.prepare()
    expect(changed).toHaveBeenCalled()
    unsubscribe()
    changed.mockClear()
    let finish!: () => void
    registration.update.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )
    const check = client.checkForUpdate(true)
    await client.checkForUpdate(true)
    expect(registration.update).toHaveBeenCalledTimes(1)
    client.dispose()
    finish()
    await check
    expect(changed).not.toHaveBeenCalled()
  })

  it("handles unavailable browser storage and unresponsive status messaging", async () => {
    const { client, workers, worker } = fixture(true)
    client.dispose()
    workers.getRegistration.mockRejectedValue(new Error("SecurityError"))
    client.start()
    await vi.waitFor(() =>
      expect(client.getSnapshot().offline).toBe("unavailable"),
    )
    worker.postMessage.mockImplementation(() => {
      throw new Error("InvalidStateError")
    })
    await client.prepare()
    expect(client.getSnapshot().offline).toBe("failed")
    client.dispose()
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
