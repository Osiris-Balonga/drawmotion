import type {
  NormalizedLandmark,
  TrackedHand,
} from "@/infrastructure/mediapipe/hand-tracker-port"

import { GESTURE_THRESHOLDS } from "./gesture-thresholds"
import { measurePinchRatio } from "./pinch-detector"

export type GestureKind =
  "pinch" | "open-hand" | "fist" | "menu" | "uncertain" | "tracking-lost"

export type GestureClassification = {
  kind: GestureKind
  pinchRatio: number | null
  extendedFingerCount: number
}

const WRIST = 0
const FINGER_JOINTS = [
  { name: "index", pip: 6, tip: 8 },
  { name: "middle", pip: 10, tip: 12 },
  { name: "ring", pip: 14, tip: 16 },
  { name: "little", pip: 18, tip: 20 },
] as const

function distance(a: NormalizedLandmark, b: NormalizedLandmark) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function landmarkAt(landmarks: NormalizedLandmark[], index: number) {
  return landmarks[index] ?? null
}

function extendedFingers(landmarks: NormalizedLandmark[]) {
  const wrist = landmarkAt(landmarks, WRIST)
  if (!wrist) return new Set<string>()

  return FINGER_JOINTS.reduce((extended, { name, pip, tip }) => {
    const pipLandmark = landmarkAt(landmarks, pip)
    const tipLandmark = landmarkAt(landmarks, tip)
    if (!pipLandmark || !tipLandmark) return extended

    const extensionRatio =
      distance(wrist, tipLandmark) / distance(wrist, pipLandmark)
    if (extensionRatio >= GESTURE_THRESHOLDS.fingerExtensionRatio) {
      extended.add(name)
    }
    return extended
  }, new Set<string>())
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
  const extended = extendedFingers(hand.landmarks)
  const extendedFingerCount = extended.size
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
    extendedFingerCount === 2 &&
    extended.has("index") &&
    extended.has("middle")
  ) {
    return {
      kind: "menu",
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
