import type { HandTrackerPort } from "@/infrastructure/mediapipe/hand-tracker-port"
import {
  VISION_PROTOCOL_VERSION,
  type VisionErrorResponse,
  type VisionFrameRequest,
  type VisionWorkerRequest,
  type VisionWorkerResponse,
} from "@/infrastructure/mediapipe/worker-protocol"

export type VisionWorkerScope = {
  postMessage(message: VisionWorkerResponse): void
  close(): void
}

type RuntimeClock = () => number

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown vision error"
}

export function createVisionWorkerRuntime(
  scope: VisionWorkerScope,
  tracker: HandTrackerPort,
  now: RuntimeClock = () => performance.now(),
) {
  let initialized = false
  let processing = false
  let disposed = false
  let queuedFrame: VisionFrameRequest | null = null
  let droppedFrames = 0

  const postError = (error: VisionErrorResponse) => {
    if (!disposed) {
      scope.postMessage(error)
    }
  }

  const processFrame = async (message: VisionFrameRequest) => {
    processing = true
    const startedAt = now()

    try {
      const result = await tracker.detect(
        message.frame,
        message.frameId,
        message.timestampMs,
      )
      if (!disposed) {
        scope.postMessage({
          version: VISION_PROTOCOL_VERSION,
          type: "RESULT",
          result,
        })
        scope.postMessage({
          version: VISION_PROTOCOL_VERSION,
          type: "METRICS",
          metrics: {
            frameId: message.frameId,
            inferenceMs: Math.max(0, now() - startedAt),
            droppedFrames,
          },
        })
      }
    } catch (error) {
      postError({
        version: VISION_PROTOCOL_VERSION,
        type: "ERROR",
        code: "DETECTION_FAILED",
        frameId: message.frameId,
        message: messageFromError(error),
        recoverable: true,
      })
    } finally {
      message.frame.close()
      processing = false

      const nextFrame = queuedFrame
      queuedFrame = null
      if (nextFrame && !disposed) {
        void processFrame(nextFrame)
      }
    }
  }

  const handleMessage = async (message: VisionWorkerRequest) => {
    if (disposed) {
      if (message.type === "FRAME") {
        message.frame.close()
      }
      return
    }

    if (message.version !== VISION_PROTOCOL_VERSION) {
      postError({
        version: VISION_PROTOCOL_VERSION,
        type: "ERROR",
        code: "PROTOCOL_ERROR",
        message: "Unsupported vision protocol version",
        recoverable: false,
      })
      return
    }

    switch (message.type) {
      case "INIT":
        try {
          await tracker.initialize(message.options)
          initialized = true
          scope.postMessage({
            version: VISION_PROTOCOL_VERSION,
            type: "INIT",
            status: "ready",
          })
        } catch (error) {
          postError({
            version: VISION_PROTOCOL_VERSION,
            type: "ERROR",
            code: "INIT_FAILED",
            message: messageFromError(error),
            recoverable: false,
          })
        }
        break
      case "FRAME":
        if (!initialized) {
          message.frame.close()
          postError({
            version: VISION_PROTOCOL_VERSION,
            type: "ERROR",
            code: "PROTOCOL_ERROR",
            frameId: message.frameId,
            message: "Vision worker received a frame before initialization",
            recoverable: false,
          })
        } else if (processing) {
          queuedFrame?.frame.close()
          queuedFrame = message
          droppedFrames += 1
        } else {
          void processFrame(message)
        }
        break
      case "DISPOSE":
        disposed = true
        queuedFrame?.frame.close()
        queuedFrame = null
        tracker.dispose()
        scope.postMessage({
          version: VISION_PROTOCOL_VERSION,
          type: "DISPOSE",
          status: "disposed",
        })
        scope.close()
        break
    }
  }

  return { handleMessage }
}
