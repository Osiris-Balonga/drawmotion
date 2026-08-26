import type { GestureKind } from "@/core/gestures/gesture-classifier"
import type { PinchPhase } from "@/core/gestures/pinch-detector"
import type { DrawingTool } from "@/features/toolbar/drawing-tools"
import type { TrackingQuality } from "@/infrastructure/mediapipe/hand-tracking-session"

export type GestureDrawingMode = {
  gesture: GestureKind
  pinchPhase: PinchPhase
  temporaryEraser: boolean
}

type ResolveGestureDrawingModeOptions = {
  gesture: GestureKind
  pinchPhase: PinchPhase
  quality: TrackingQuality
  activeTool: DrawingTool
  hasReliablePoint: boolean
}

/** Maps interaction gestures to the drawing state machine without changing classification. */
export function resolveGestureDrawingMode(
  options: ResolveGestureDrawingModeOptions,
): GestureDrawingMode {
  const { gesture, pinchPhase, quality, hasReliablePoint } = options
  if (quality === "lost") {
    return {
      gesture: "tracking-lost",
      pinchPhase,
      temporaryEraser: false,
    }
  }

  if (quality === "uncertain") {
    return { gesture: "uncertain", pinchPhase, temporaryEraser: false }
  }

  const temporaryEraser = gesture === "fist" && hasReliablePoint
  if (temporaryEraser) {
    return { gesture: "pinch", pinchPhase: "active", temporaryEraser: true }
  }

  return {
    gesture: pinchPhase !== "released" ? "pinch" : "open-hand",
    pinchPhase,
    temporaryEraser: false,
  }
}
