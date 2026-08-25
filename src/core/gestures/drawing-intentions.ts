import type { CanvasPoint } from "@/core/geometry/coordinate-mapping"

export const DRAWING_INTENTION_VERSION = 1 as const

type IntentionBase = {
  version: typeof DRAWING_INTENTION_VERSION
  timestampMs: number
}

type PointIntention = IntentionBase & {
  point: CanvasPoint
}

export type DrawingIntention =
  | (PointIntention & { type: "POINTER_MOVE" })
  | (PointIntention & { type: "DRAW_START" })
  | (PointIntention & { type: "DRAW_MOVE" })
  | (PointIntention & { type: "DRAW_END" })
  | (IntentionBase & { type: "PAUSE" })
  | (IntentionBase & { type: "TRACKING_LOST" })
