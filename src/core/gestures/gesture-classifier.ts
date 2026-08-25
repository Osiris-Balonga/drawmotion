import type {
  NormalizedLandmark,
  TrackedHand,
} from "@/infrastructure/mediapipe/hand-tracker-port"

import { GESTURE_THRESHOLDS } from "./gesture-thresholds"

export type GestureKind =
  "pinch" | "open-hand" | "fist" | "uncertain" | "tracking-lost"

export type GestureClassification = {
  kind: GestureKind
  pinchRatio: number | null
  extendedFingerCount: number
}

const WRIST = 0
const THUMB_TIP = 4
const MIDDLE_MCP = 9
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

function measurePinchRatio(landmarks: NormalizedLandmark[]) {
  const wrist = landmarkAt(landmarks, WRIST)
  const thumbTip = landmarkAt(landmarks, THUMB_TIP)
  const indexTip = landmarkAt(landmarks, 8)
  const middleMcp = landmarkAt(landmarks, MIDDLE_MCP)
  if (!wrist || !thumbTip || !indexTip || !middleMcp) return null

  const palmSize = distance(wrist, middleMcp)
  if (palmSize <= Number.EPSILON) return null
  return distance(thumbTip, indexTip) / palmSize
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

  const pinchRatio = measurePinchRatio(hand.landmarks)
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
