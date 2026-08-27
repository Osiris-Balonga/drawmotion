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
import { VisionDiagnostics } from "@/infrastructure/mediapipe/vision-diagnostics"

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

export class DroppedFrameError extends Error {
  constructor() {
    super("Vision frame superseded by a newer frame")
    this.name = "DroppedFrameError"
  }
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
      startedAt: number
    }
  >()
  private queuedFrame: {
    frame: ImageBitmap
    frameId: number
    timestampMs: number
  } | null = null
  private inFlightId: number | null = null
  private droppedFrames = 0
  private readonly diagnostics = import.meta.env.DEV
    ? new VisionDiagnostics()
    : null
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
      if (this.queuedFrame) {
        this.queuedFrame.frame.close()
        this.pendingFrames
          .get(this.queuedFrame.frameId)
          ?.reject(new DroppedFrameError())
        this.pendingFrames.delete(this.queuedFrame.frameId)
        this.droppedFrames += 1
      }
      this.pendingFrames.set(frameId, {
        resolve,
        reject,
        startedAt: performance.now(),
      })
      this.queuedFrame = { frame, frameId, timestampMs }
      this.dispatchNextFrame()
    })
  }

  private dispatchNextFrame(): void {
    if (this.disposed || this.inFlightId !== null || !this.queuedFrame) return
    const { frame, frameId, timestampMs } = this.queuedFrame
    this.queuedFrame = null
    this.inFlightId = frameId
    try {
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
    } catch (error) {
      frame.close()
      this.pendingFrames
        .get(frameId)
        ?.reject(
          error instanceof Error ? error : new Error("Frame transfer failed"),
        )
      this.pendingFrames.delete(frameId)
      this.inFlightId = null
    }
  }

  private completeFrame(frameId: number): void {
    this.pendingFrames.delete(frameId)
    if (this.inFlightId === frameId) {
      this.inFlightId = null
      this.dispatchNextFrame()
    }
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
        if (pending && this.diagnostics) {
          const now = performance.now()
          const summary = this.diagnostics.record(now, now - pending.startedAt)
          if (summary)
            console.debug("[DrawMotion vision]", {
              ...summary,
              droppedFrames: this.droppedFrames,
            })
        }
        pending?.resolve(value.result)
        this.completeFrame(value.result.frameId)
        break
      }
      case "METRICS":
        this.onMetrics?.({
          ...value.metrics,
          droppedFrames: value.metrics.droppedFrames + this.droppedFrames,
        })
        break
      case "DROPPED":
        this.pendingFrames.get(value.frameId)?.reject(new DroppedFrameError())
        this.completeFrame(value.frameId)
        break
      case "ERROR": {
        const error = new Error(value.message)
        if (value.code === "INIT_FAILED") {
          this.rejectInitialize?.(error)
          this.resolveInitialize = null
          this.rejectInitialize = null
        } else if (value.frameId !== undefined) {
          this.pendingFrames.get(value.frameId)?.reject(error)
          this.completeFrame(value.frameId)
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
    this.queuedFrame?.frame.close()
    this.queuedFrame = null
    this.inFlightId = null
  }
}
