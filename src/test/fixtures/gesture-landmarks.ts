import type {
  NormalizedLandmark,
  TrackedHand,
} from "@/infrastructure/mediapipe/hand-tracker-port"

type Point = readonly [x: number, y: number]

const basePose: Point[] = [
  [0.5, 0.86],
  [0.4, 0.72],
  [0.33, 0.62],
  [0.28, 0.52],
  [0.23, 0.43],
  [0.42, 0.6],
  [0.4, 0.44],
  [0.39, 0.29],
  [0.38, 0.14],
  [0.5, 0.57],
  [0.5, 0.39],
  [0.5, 0.23],
  [0.5, 0.08],
  [0.58, 0.61],
  [0.6, 0.45],
  [0.61, 0.31],
  [0.62, 0.18],
  [0.66, 0.67],
  [0.7, 0.54],
  [0.72, 0.43],
  [0.74, 0.33],
]

function pose(overrides: Partial<Record<number, Point>> = {}) {
  return basePose.map(([x, y], index): NormalizedLandmark => {
    const point = overrides[index]
    return { x: point?.[0] ?? x, y: point?.[1] ?? y, z: 0 }
  })
}

export const openHandGestureLandmarks = pose()

export const pinchGestureLandmarks = pose({
  3: [0.34, 0.28],
  4: [0.38, 0.16],
})

export const fistGestureLandmarks = pose({
  3: [0.42, 0.62],
  4: [0.47, 0.64],
  6: [0.43, 0.55],
  7: [0.46, 0.6],
  8: [0.49, 0.64],
  10: [0.5, 0.54],
  11: [0.52, 0.59],
  12: [0.53, 0.64],
  14: [0.57, 0.56],
  15: [0.56, 0.61],
  16: [0.55, 0.66],
  18: [0.64, 0.6],
  19: [0.62, 0.65],
  20: [0.59, 0.69],
})

export const uncertainGestureLandmarks = pose({
  4: [0.34, 0.44],
  8: [0.42, 0.48],
  12: [0.5, 0.47],
  16: [0.58, 0.49],
  20: [0.65, 0.53],
})

export function handFromGestureFixture(
  landmarks: NormalizedLandmark[],
  confidence = 0.98,
): TrackedHand {
  return {
    handedness: "Right",
    confidence,
    landmarks,
    worldLandmarks: landmarks,
  }
}

export function withPinchRatio(
  ratio: number,
  source = pinchGestureLandmarks,
): NormalizedLandmark[] {
  const landmarks = source.map((landmark) => ({ ...landmark }))
  const wrist = landmarks[0]
  const middleMcp = landmarks[9]
  const indexTip = landmarks[8]

  if (!wrist || !middleMcp || !indexTip) {
    throw new Error("Gesture fixture must contain the 21 MediaPipe landmarks")
  }

  const palmSize = Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y)
  landmarks[4] = {
    x: indexTip.x - ratio * palmSize,
    y: indexTip.y,
    z: indexTip.z,
  }
  return landmarks
}
