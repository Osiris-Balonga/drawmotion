import type { GestureKind } from "@/core/gestures/gesture-classifier"
import type { PinchPhase } from "@/core/gestures/pinch-detector"
import type { TrackingQuality } from "@/infrastructure/mediapipe/hand-tracking-session"

export type GestureModeFeedback = {
  kind: "pointer" | "pen" | "eraser" | "uncertain" | "lost"
  label: string
  persistent?: boolean
}

export function resolveGestureModeFeedback(
  gesture: GestureKind,
  quality: TrackingQuality,
  pinchPhase: PinchPhase,
): GestureModeFeedback {
  if (quality === "lost" || gesture === "tracking-lost") {
    return { kind: "lost", label: "Main non détectée" }
  }
  if (quality === "uncertain" || gesture === "uncertain") {
    return {
      kind: "uncertain",
      label: "Geste incertain",
      persistent: true,
    }
  }
  if (gesture === "fist") {
    return { kind: "eraser", label: "Mode gomme" }
  }
  if (gesture === "pinch" || pinchPhase !== "released") {
    return { kind: "pen", label: "Mode stylo" }
  }
  return { kind: "pointer", label: "Mode pointeur" }
}
