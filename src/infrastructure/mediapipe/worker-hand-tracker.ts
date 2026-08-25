import type {
  HandTrackerMetrics,
  HandTrackerOptions,
  HandTrackerPort,
  HandTrackingResult,
} from "@/infrastructure/mediapipe/hand-tracker-port"
import {
  isVisionWorkerResponse,
  VISION_PROTOCOL_VERSION,
} from "@/infrastructure/mediapipe/worker-protocol"

type WorkerPort = Pick<
  Worker,
  "onerror" | "onmessage" | "postMessage" | "terminate"
>
type WorkerFactory = () => WorkerPort
type MetricsListener = (metrics: HandTrackerMetrics) => void

function createVisionWorker(): Worker {
  return new Worker(
    new URL("../../workers/hand-tracking.worker.ts", import.meta.url),
    {
      name: "drawmotion-hand-tracking",
      type: "module",
    },
  )
}

export class WorkerHandTracker implements HandTrackerPort {
  private readonly worker: WorkerPort
  private initializePromise: Promise<void> | null = null
  private resolveInitialize: (() => void) | null = null
  private rejectInitialize: ((reason: Error) => void) | null = null
  private readonly pendingFrames = new Map<
    number,
    {
      resolve: (result: HandTrackingResult) => void
      reject: (reason: Error) => void
    }
  >()
  private disposed = false

  constructor(
    workerFactory: WorkerFactory = createVisionWorker,
    private readonly onMetrics?: MetricsListener,
  ) {
    this.worker = workerFactory()
    this.worker.onmessage = (event: MessageEvent<unknown>) =>
      this.handleMessage(event.data)
    this.worker.onerror = () =>
      this.failPending(new Error("Vision worker crashed"))
  }

  initialize(options: HandTrackerOptions): Promise<void> {
    if (this.disposed) {
      return Promise.reject(new Error("Vision worker is disposed"))
    }
    if (this.initializePromise) {
      return this.initializePromise
    }

    this.initializePromise = new Promise<void>((resolve, reject) => {
      this.resolveInitialize = resolve
      this.rejectInitialize = reject
      this.worker.postMessage({
        version: VISION_PROTOCOL_VERSION,
        type: "INIT",
        options,
      })
    })
    return this.initializePromise
  }

  detect(
    frame: ImageBitmap,
    frameId: number,
    timestampMs: number,
  ): Promise<HandTrackingResult> {
    if (this.disposed) {
      frame.close()
      return Promise.reject(new Error("Vision worker is disposed"))
    }

    return new Promise((resolve, reject) => {
      this.pendingFrames.set(frameId, { resolve, reject })
      this.worker.postMessage(
        {
          version: VISION_PROTOCOL_VERSION,
          type: "FRAME",
          frameId,
          timestampMs,
          frame,
        },
        [frame],
      )
    })
  }

  dispose(): void {
    if (this.disposed) {
      return
    }

    this.disposed = true
    this.failPending(new Error("Vision worker disposed"))
    this.worker.postMessage({
      version: VISION_PROTOCOL_VERSION,
      type: "DISPOSE",
    })

    window.setTimeout(() => this.worker.terminate(), 250)
  }

  private handleMessage(value: unknown): void {
    if (!isVisionWorkerResponse(value)) {
      this.failPending(new Error("Invalid response from vision worker"))
      return
    }

    switch (value.type) {
      case "INIT":
        this.resolveInitialize?.()
        this.resolveInitialize = null
        this.rejectInitialize = null
        break
      case "RESULT": {
        const pending = this.pendingFrames.get(value.result.frameId)
        pending?.resolve(value.result)
        this.pendingFrames.delete(value.result.frameId)
        break
      }
      case "METRICS":
        this.onMetrics?.(value.metrics)
        break
      case "ERROR": {
        const error = new Error(value.message)
        if (value.code === "INIT_FAILED") {
          this.rejectInitialize?.(error)
          this.resolveInitialize = null
          this.rejectInitialize = null
        } else if (value.frameId !== undefined) {
          this.pendingFrames.get(value.frameId)?.reject(error)
          this.pendingFrames.delete(value.frameId)
        } else {
          this.failPending(error)
        }
        break
      }
      case "DISPOSE":
        this.worker.terminate()
        break
    }
  }

  private failPending(error: Error): void {
    this.rejectInitialize?.(error)
    this.resolveInitialize = null
    this.rejectInitialize = null
    this.pendingFrames.forEach(({ reject }) => reject(error))
    this.pendingFrames.clear()
  }
}
