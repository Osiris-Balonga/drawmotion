import type {
  NormalizedLandmark,
  TrackedHand,
} from "@/infrastructure/mediapipe/hand-tracker-port"

import { GESTURE_THRESHOLDS } from "./gesture-thresholds"
import { measurePinchRatio } from "./pinch-detector"

export type GestureKind =
  "pinch" | "open-hand" | "fist" | "uncertain" | "tracking-lost"

export type GestureClassification = {
  kind: GestureKind
  pinchRatio: number | null
  extendedFingerCount: number
}

const WRIST = 0
const FINGER_JOINTS = [
  { pip: 6, tip: 8 },
  { pip: 10, tip: 12 },
  { pip: 14, tip: 16 },
  { pip: 18, tip: 20 },
] as const

function distance(a: NormalizedLandmark, b: NormalizedLandmark) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function landmarkAt(landmarks: NormalizedLandmark[], index: number) {
  return landmarks[index] ?? null
}

function countExtendedFingers(landmarks: NormalizedLandmark[]) {
  const wrist = landmarkAt(landmarks, WRIST)
  if (!wrist) return 0

  return FINGER_JOINTS.reduce((count, { pip, tip }) => {
    const pipLandmark = landmarkAt(landmarks, pip)
    const tipLandmark = landmarkAt(landmarks, tip)
    if (!pipLandmark || !tipLandmark) return count

    const extensionRatio =
      distance(wrist, tipLandmark) / distance(wrist, pipLandmark)
    return (
      count +
      (extensionRatio >= GESTURE_THRESHOLDS.fingerExtensionRatio ? 1 : 0)
    )
  }, 0)
}

export function classifyGesture(
  hand: TrackedHand | null,
  previousKind: GestureKind = "tracking-lost",
): GestureClassification {
  if (!hand || hand.landmarks.length < 21) {
    return {
      kind: "tracking-lost",
      pinchRatio: null,
      extendedFingerCount: 0,
    }
  }

  const pinchRatio = measurePinchRatio(hand)
  const extendedFingerCount = countExtendedFingers(hand.landmarks)
  if (pinchRatio === null) {
    return {
      kind: "uncertain",
      pinchRatio,
      extendedFingerCount,
    }
  }

  const isContinuingPinch =
    previousKind === "pinch" &&
    pinchRatio <= GESTURE_THRESHOLDS.pinchExitRatio + Number.EPSILON * 16
  if (isContinuingPinch) {
    return {
      kind: "pinch",
      pinchRatio,
      extendedFingerCount,
    }
  }

  if (extendedFingerCount <= GESTURE_THRESHOLDS.fistMaximumExtendedFingers) {
    return {
      kind: "fist",
      pinchRatio,
      extendedFingerCount,
    }
  }

  if (pinchRatio <= GESTURE_THRESHOLDS.pinchEnterRatio + Number.EPSILON * 16) {
    return {
      kind: "pinch",
      pinchRatio,
      extendedFingerCount,
    }
  }

  if (
    extendedFingerCount >= GESTURE_THRESHOLDS.openHandMinimumExtendedFingers
  ) {
    return {
      kind: "open-hand",
      pinchRatio,
      extendedFingerCount,
    }
  }

  return {
    kind: "uncertain",
    pinchRatio,
    extendedFingerCount,
  }
}
