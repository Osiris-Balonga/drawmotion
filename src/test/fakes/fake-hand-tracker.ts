import type {
  HandTrackerOptions,
  HandTrackerPort,
  HandTrackingResult,
} from "@/infrastructure/mediapipe/hand-tracker-port"

export class FakeHandTracker implements HandTrackerPort {
  disposed = false
  initializedWith: HandTrackerOptions | null = null
  readonly frames: Array<{
    frameId: number
    timestampMs: number
  }> = []

  constructor(private readonly result: HandTrackingResult) {}

  initialize(options: HandTrackerOptions): Promise<void> {
    this.initializedWith = options
    return Promise.resolve()
  }

  detect(
    _frame: ImageBitmap,
    frameId: number,
    timestampMs: number,
  ): Promise<HandTrackingResult> {
    this.frames.push({ frameId, timestampMs })
    return Promise.resolve({
      ...this.result,
      frameId,
      timestampMs,
    })
  }

  dispose(): void {
    this.disposed = true
  }
}
