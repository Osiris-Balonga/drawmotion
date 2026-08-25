import type {
  NormalizedLandmark,
  TrackedHand,
} from "@/infrastructure/mediapipe/hand-tracker-port"

export function selectGesturePointer(
  hand: TrackedHand | null,
): NormalizedLandmark | null {
  if (!hand) return null
  return hand.landmarks[8] ?? null
}
