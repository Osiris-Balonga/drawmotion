import type {
  HandTrackingResult,
  NormalizedLandmark,
  TrackedHand,
} from "@/infrastructure/mediapipe/hand-tracker-port"

export const openHandLandmarks: NormalizedLandmark[] = Array.from(
  { length: 21 },
  (_, index) => ({
    x: 0.3 + (index % 4) * 0.08,
    y: 0.8 - Math.floor(index / 4) * 0.1,
    z: index === 0 ? 0 : -index * 0.002,
  }),
)

export const trackedRightHand: TrackedHand = {
  handedness: "Right",
  confidence: 0.98,
  landmarks: openHandLandmarks,
  worldLandmarks: openHandLandmarks.map((landmark) => ({
    x: (landmark.x - 0.5) * 0.15,
    y: (landmark.y - 0.5) * 0.15,
    z: landmark.z,
  })),
}

export const deterministicTrackingResult: HandTrackingResult = {
  frameId: 7,
  timestampMs: 120,
  hands: [trackedRightHand],
}
