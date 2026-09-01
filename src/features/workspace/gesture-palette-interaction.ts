import type { GestureKind } from "@/core/gestures/gesture-classifier"
import type { PinchPhase } from "@/core/gestures/pinch-detector"

export type GesturePaletteAction = "select" | "close" | null

/** Keeps selection forgiving when the pinch starts just outside a palette target. */
export function resolveGesturePaletteAction(
  gesture: GestureKind,
  pinchPhase: PinchPhase,
  hasControl: boolean,
  dwellProgress: number,
): GesturePaletteAction {
  if (
    gesture === "menu" &&
    pinchPhase === "released" &&
    hasControl &&
    dwellProgress >= 1
  ) {
    return "select"
  }
  if (gesture === "fist" && pinchPhase === "released") return "close"
  return null
}
