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
): Promise<OfflineReport> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel()
    const requestId = crypto.randomUUID()
    const close = () => {
      clearTimeout(timer)
      channel.port1.close()
      channel.port2.close()
    }
    const timer = setTimeout(() => {
      close()
      reject(new Error("Offline verification timed out"))
    }, 5000)
    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      if (!isOfflineReport(event.data, requestId, scope)) return
      close()
      resolve(event.data)
    }
    try {
      worker.postMessage(
        { type: OFFLINE_STATUS_REQUEST, protocol: OFFLINE_PROTOCOL, requestId },
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
    this.listeners.forEach((listener) => listener())
  }

  start() {
    this.stopped = false
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
        if (this.stopped || !registration || !this.owns(registration)) return
        this.observe(registration)
        void this.verify()
        void this.checkForUpdate()
      })
      .catch(() => this.set({ offline: "unavailable" }))
  }

  dispose() {
    this.stopped = true
    this.cleanups.splice(0).forEach((cleanup) => cleanup())
    this.watched = new WeakSet()
    this.registration = undefined
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
    if (!this.workers || this.state.offline === "preparing") return
    this.set({ offline: "preparing" })
    try {
      const registration = await this.workers.register(`${this.scope}sw.js`, {
        scope: this.scope,
        updateViaCache: "none",
      })
      if (this.stopped) return
      this.observe(registration)
      await this.verify()
    } catch {
      this.set({ offline: "failed" })
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

  verify(): Promise<void> {
    if (this.verification) return this.verification
    const controller = this.workers?.controller
    const worker =
      controller?.scriptURL === `${this.scope}sw.js`
        ? controller
        : this.registration?.active
    if (!worker || worker.state !== "activated") return Promise.resolve()
    this.lastVerification = Date.now()
    this.set({ offline: "verifying" })
    this.verification = queryOfflineStatus(worker, this.scope)
      .then((report) => {
        this.set({
          offline: !report.complete
            ? "failed"
            : controller === worker
              ? "ready"
              : "prepared-reopen",
          buildId: report.buildId,
        })
      })
      .catch(() => this.set({ offline: "failed" }))
      .finally(() => {
        this.verification = undefined
      })
    return this.verification
  }

  async checkForUpdate(force = false) {
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

  onVisible() {
    if (Date.now() - this.lastVerification > 60_000) void this.verify()
    void this.checkForUpdate()
  }
}
