import type {
  HandTrackerMetrics,
  HandTrackerOptions,
  HandTrackingResult,
} from "@/infrastructure/mediapipe/hand-tracker-port"

export const VISION_PROTOCOL_VERSION = 1 as const

export type VisionInitRequest = {
  version: typeof VISION_PROTOCOL_VERSION
  type: "INIT"
  options: HandTrackerOptions
}

export type VisionFrameRequest = {
  version: typeof VISION_PROTOCOL_VERSION
  type: "FRAME"
  frameId: number
  timestampMs: number
  frame: ImageBitmap
}

export type VisionDisposeRequest = {
  version: typeof VISION_PROTOCOL_VERSION
  type: "DISPOSE"
}

export type VisionWorkerRequest =
  VisionInitRequest | VisionFrameRequest | VisionDisposeRequest

export type VisionInitResponse = {
  version: typeof VISION_PROTOCOL_VERSION
  type: "INIT"
  status: "ready"
}

export type VisionResultResponse = {
  version: typeof VISION_PROTOCOL_VERSION
  type: "RESULT"
  result: HandTrackingResult
}

export type VisionMetricsResponse = {
  version: typeof VISION_PROTOCOL_VERSION
  type: "METRICS"
  metrics: HandTrackerMetrics
}

export type VisionDroppedResponse = {
  version: typeof VISION_PROTOCOL_VERSION
  type: "DROPPED"
  frameId: number
}

export type VisionErrorResponse = {
  version: typeof VISION_PROTOCOL_VERSION
  type: "ERROR"
  code: "INIT_FAILED" | "DETECTION_FAILED" | "PROTOCOL_ERROR"
  frameId?: number
  message: string
  recoverable: boolean
}

export type VisionDisposeResponse = {
  version: typeof VISION_PROTOCOL_VERSION
  type: "DISPOSE"
  status: "disposed"
}

export type VisionWorkerResponse =
  | VisionInitResponse
  | VisionResultResponse
  | VisionMetricsResponse
  | VisionDroppedResponse
  | VisionErrorResponse
  | VisionDisposeResponse

export function isVisionWorkerResponse(
  value: unknown,
): value is VisionWorkerResponse {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const candidate = value as { type?: unknown; version?: unknown }
  return (
    candidate.version === VISION_PROTOCOL_VERSION &&
    (candidate.type === "INIT" ||
      candidate.type === "RESULT" ||
      candidate.type === "METRICS" ||
      candidate.type === "DROPPED" ||
      candidate.type === "ERROR" ||
      candidate.type === "DISPOSE")
  )
}
