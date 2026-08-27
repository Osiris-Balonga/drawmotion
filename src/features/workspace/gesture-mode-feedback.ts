import { t } from "@/i18n"

import type { GestureKind } from "@/core/gestures/gesture-classifier"
import type { PinchPhase } from "@/core/gestures/pinch-detector"
import type { TrackingQuality } from "@/infrastructure/mediapipe/hand-tracking-session"

export type GestureModeFeedback = {
  kind: "pointer" | "pen" | "eraser" | "commands" | "uncertain" | "lost"
  label: string
  persistent?: boolean
}

export function resolveGestureModeFeedback(
  gesture: GestureKind,
  quality: TrackingQuality,
  pinchPhase: PinchPhase,
): GestureModeFeedback {
  if (quality === "lost" || gesture === "tracking-lost") {
    return { kind: "lost", label: t("tracking.lost") }
  }
  if (quality === "uncertain" || gesture === "uncertain") {
    return {
      kind: "uncertain",
      label: t("gesture.uncertain"),
      persistent: true,
    }
  }
  if (gesture === "fist") {
    return { kind: "eraser", label: t("mode.eraser") }
  }
  if (gesture === "menu") {
    return { kind: "commands", label: t("mode.commands") }
  }
  if (gesture === "pinch" || pinchPhase !== "released") {
    return { kind: "pen", label: t("mode.pen") }
  }
  return { kind: "pointer", label: t("mode.pointer") }
}
