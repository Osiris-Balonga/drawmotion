import type { GestureKind } from "./gesture-classifier"
import type {
  NormalizedLandmark,
  TrackedHand,
} from "@/infrastructure/mediapipe/hand-tracker-port"

function midpoint(
  first: NormalizedLandmark,
  second: NormalizedLandmark,
): NormalizedLandmark {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
    z: (first.z + second.z) / 2,
  }
}

export function selectGesturePointer(
  hand: TrackedHand | null,
  gesture: GestureKind,
): NormalizedLandmark | null {
  if (!hand) return null
  const indexTip = hand.landmarks[8]
  if (!indexTip) return null

  if (gesture === "pinch") {
    const thumbTip = hand.landmarks[4]
    return thumbTip ? midpoint(thumbTip, indexTip) : indexTip
  }

  return indexTip
}
