import {
  isOfflineReport,
  OFFLINE_PROTOCOL,
  OFFLINE_STATUS_REQUEST,
  type OfflineReport,
} from "./pwa-contract"

export type OfflineState =
  | "unavailable"
  | "idle"
  | "preparing"
  | "prepared-reopen"
  | "verifying"
  | "ready"
  | "failed"
export type UpdateState =
  "none" | "checking" | "downloading" | "waiting-for-close" | "failed"
export type PwaState = {
  offline: OfflineState
  update: UpdateState
  buildId: string | null
}

export function queryOfflineStatus(
  worker: ServiceWorker,
  scope: string,
  repair = false,
): Promise<OfflineReport> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel()
    const requestId = crypto.randomUUID()
    const close = () => {
      clearTimeout(timer)
      channel.port1.close()
      channel.port2.close()
    }
    const timer = setTimeout(
      () => {
        close()
        reject(new Error("Offline verification timed out"))
      },
      repair ? 60_000 : 5000,
    )
    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      if (!isOfflineReport(event.data, requestId, scope)) return
      close()
      resolve(event.data)
    }
    try {
      worker.postMessage(
        {
          type: OFFLINE_STATUS_REQUEST,
          protocol: OFFLINE_PROTOCOL,
          requestId,
          repair,
        },
        [channel.port2],
      )
    } catch (error) {
      close()
      reject(
        error instanceof Error
          ? error
          : new Error("Offline verification failed"),
      )
    }
  })
}

// One instance per mounted application. Browser lifecycle, not React renders,
// owns the registration. Disposing this observer never unregisters the worker.
export class PwaClient {
  private state: PwaState
  private listeners = new Set<() => void>()
  private registration: ServiceWorkerRegistration | undefined
  private stopped = true
  private cleanups: (() => void)[] = []
  private verification: Promise<void> | undefined
  private lastVerification = 0
  private lastUpdateCheck = 0
  private watched = new WeakSet<ServiceWorker>()
  private retryTimer: ReturnType<typeof setTimeout> | undefined
  private retryCount = 0
  private lastAttempt = 0
  private generation = 0

  constructor(
    private readonly workers: ServiceWorkerContainer | undefined,
    readonly scope: string,
  ) {
    this.state = {
      offline: workers ? "idle" : "unavailable",
      update: "none",
      buildId: null,
    }
  }

  getSnapshot = () => this.state
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  private set(patch: Partial<PwaState>) {
    if (this.stopped) return
    this.state = { ...this.state, ...patch }
    if (patch.offline === "failed") this.scheduleRetry()
    if (patch.offline === "ready" || patch.offline === "prepared-reopen") {
      clearTimeout(this.retryTimer)
      this.retryTimer = undefined
      this.retryCount = 0
    }
    this.listeners.forEach((listener) => listener())
  }

  start() {
    if (!this.stopped) return
    this.stopped = false
    const generation = ++this.generation
    if (!this.workers) return
    const onController = () => {
      void this.verify()
    }
    this.workers.addEventListener("controllerchange", onController)
    this.cleanups.push(() =>
      this.workers?.removeEventListener("controllerchange", onController),
    )
    void this.workers
      .getRegistration(this.scope)
      .then((registration) => {
        if (this.stopped || generation !== this.generation) return
        if (!registration) {
          void this.prepare()
          return
        }
        if (!this.owns(registration)) {
          this.set({ offline: "unavailable" })
          return
        }
        this.observe(registration)
        void this.verify()
        void this.checkForUpdate()
      })
      .catch(() => {
        if (generation === this.generation) this.set({ offline: "unavailable" })
      })
  }

  dispose() {
    this.stopped = true
    this.generation++
    this.verification = undefined
    this.cleanups.splice(0).forEach((cleanup) => cleanup())
    this.watched = new WeakSet()
    this.registration = undefined
    clearTimeout(this.retryTimer)
    this.retryTimer = undefined
  }

  private owns(registration: ServiceWorkerRegistration) {
    const worker =
      registration.active ?? registration.waiting ?? registration.installing
    return (
      registration.scope === this.scope &&
      worker?.scriptURL === `${this.scope}sw.js`
    )
  }

  async prepare() {
    if (this.stopped || !this.workers || this.state.offline === "preparing")
      return
    this.lastAttempt = Date.now()
    const generation = this.generation
    this.set({ offline: "preparing" })
    try {
      const registration = await this.workers.register(`${this.scope}sw.js`, {
        scope: this.scope,
        updateViaCache: "none",
      })
      if (this.stopped || generation !== this.generation) return
      this.observe(registration)
      await this.verify()
    } catch {
      if (generation === this.generation) this.set({ offline: "failed" })
    }
  }

  private observe(registration: ServiceWorkerRegistration) {
    if (this.registration !== registration) {
      this.registration = registration
      const onUpdate = () => {
        if (registration.installing) this.watch(registration.installing)
      }
      registration.addEventListener("updatefound", onUpdate)
      this.cleanups.push(() =>
        registration.removeEventListener("updatefound", onUpdate),
      )
    }
    if (registration.installing) this.watch(registration.installing)
    if (registration.waiting) this.set({ update: "waiting-for-close" })
  }

  private watch(worker: ServiceWorker) {
    if (this.watched.has(worker)) return
    this.watched.add(worker)
    const isUpdate = Boolean(this.registration?.active)
    const onState = () => {
      if (worker.state === "installing")
        this.set(
          isUpdate ? { update: "downloading" } : { offline: "preparing" },
        )
      if (worker.state === "installed" && isUpdate)
        this.set({ update: "waiting-for-close" })
      if (worker.state === "activated") {
        void this.verify()
      }
      if (worker.state === "redundant")
        this.set(isUpdate ? { update: "failed" } : { offline: "failed" })
    }
    worker.addEventListener("statechange", onState)
    this.cleanups.push(() => worker.removeEventListener("statechange", onState))
    onState()
  }

  verify(repair = false): Promise<void> {
    if (this.verification) return this.verification
    const controller = this.workers?.controller
    const worker =
      controller?.scriptURL === `${this.scope}sw.js`
        ? controller
        : this.registration?.active
    if (!worker || worker.state !== "activated") return Promise.resolve()
    this.lastVerification = Date.now()
    const generation = this.generation
    if (this.state.offline !== "ready") this.set({ offline: "verifying" })
    this.verification = queryOfflineStatus(worker, this.scope, repair)
      .then((report) => {
        if (generation !== this.generation) return
        this.set({
          offline: !report.complete
            ? "failed"
            : this.workers?.controller === worker
              ? "ready"
              : "prepared-reopen",
          buildId: report.buildId,
        })
      })
      .catch(() => {
        if (generation === this.generation) this.set({ offline: "failed" })
      })
      .finally(() => {
        if (generation === this.generation) this.verification = undefined
      })
    return this.verification
  }

  async checkForUpdate(force = false) {
    if (this.state.update === "checking") return
    if (
      !this.registration ||
      this.registration.installing ||
      this.registration.waiting
    )
      return
    if (!force && Date.now() - this.lastUpdateCheck < 15 * 60_000) return
    this.lastUpdateCheck = Date.now()
    this.set({ update: "checking" })
    try {
      await this.registration.update()
      if (!this.registration.installing && !this.registration.waiting)
        this.set({ update: "none" })
    } catch {
      this.set({ update: force ? "failed" : "none" })
    }
  }

  private scheduleRetry() {
    if (this.retryTimer || this.stopped || this.retryCount >= 5) return
    const delay = Math.min(30_000 * 2 ** this.retryCount++, 300_000)
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined
      this.onVisible()
    }, delay)
  }

  onVisible(reconnected = false) {
    if (this.stopped) return
    if (
      this.state.offline === "failed" &&
      Date.now() - this.lastAttempt >= (reconnected ? 0 : 10_000)
    ) {
      this.lastAttempt = Date.now()
      if (this.registration?.active) void this.verify(true)
      else void this.prepare()
      return
    }
    if (Date.now() - this.lastVerification > 60_000) void this.verify()
    void this.checkForUpdate()
  }
}
