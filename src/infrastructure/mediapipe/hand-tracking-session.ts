import type {
  HandTrackerMetrics,
  HandTrackerOptions,
  HandTrackerPort,
  HandTrackingResult,
} from "@/infrastructure/mediapipe/hand-tracker-port"

export type TrackingQuality = "reliable" | "uncertain" | "lost"

type SessionCallbacks = {
  onResult(result: HandTrackingResult, quality: TrackingQuality): void
  onMetrics?(metrics: HandTrackerMetrics): void
  onError(error: Error): void
}

export function classifyTrackingQuality(
  result: HandTrackingResult,
): TrackingQuality {
  const hand = result.hands[0]
  if (!hand) {
    return "lost"
  }
  const hasCompleteFiniteGeometry =
    hand.landmarks.length >= 21 &&
    hand.landmarks.every(
      ({ x, y, z }) =>
        Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z),
    )
  return hasCompleteFiniteGeometry ? "reliable" : "uncertain"
}

export class HandTrackingSession {
  private disposed = false
  private frameId = 0
  private videoFrameCallbackId: number | null = null
  private animationFrameId: number | null = null

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly tracker: HandTrackerPort,
    private readonly callbacks: SessionCallbacks,
  ) {}

  async start(options: HandTrackerOptions): Promise<void> {
    await this.tracker.initialize(options)
    if (!this.disposed) {
      this.scheduleFrame()
    }
  }

  dispose(): void {
    if (this.disposed) {
      return
    }
    this.disposed = true
    if (this.videoFrameCallbackId !== null) {
      this.video.cancelVideoFrameCallback(this.videoFrameCallbackId)
    }
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
    }
    this.tracker.dispose()
  }

  private scheduleFrame(): void {
    if (this.disposed) {
      return
    }

    if (typeof this.video.requestVideoFrameCallback === "function") {
      this.videoFrameCallbackId = this.video.requestVideoFrameCallback(
        (_now, metadata) => {
          this.videoFrameCallbackId = null
          void this.captureFrame(metadata.mediaTime * 1000)
        },
      )
    } else {
      this.animationFrameId = requestAnimationFrame((timestamp) => {
        this.animationFrameId = null
        void this.captureFrame(timestamp)
      })
    }
  }

  private async captureFrame(timestampMs: number): Promise<void> {
    if (this.disposed) {
      return
    }
    if (this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      this.scheduleFrame()
      return
    }

    try {
      const frame = await createImageBitmap(this.video)
      if (this.disposed) {
        frame.close()
        return
      }

      this.frameId += 1
      const result = await this.tracker.detect(frame, this.frameId, timestampMs)
      if (!this.disposed) {
        this.callbacks.onResult(result, classifyTrackingQuality(result))
      }
    } catch (error) {
      if (!this.disposed) {
        this.callbacks.onError(
          error instanceof Error ? error : new Error("Hand tracking failed"),
        )
      }
    } finally {
      this.scheduleFrame()
    }
  }
}
