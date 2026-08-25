import { GESTURE_THRESHOLDS } from "@/core/gestures/gesture-thresholds"
import type {
  NormalizedLandmark,
  TrackedHand,
} from "@/infrastructure/mediapipe/hand-tracker-port"

const WRIST = 0
const THUMB_TIP = 4
const INDEX_TIP = 8
const MIDDLE_MCP = 9
const CONFIRMATION_FRAMES = 2

function distance(a: NormalizedLandmark, b: NormalizedLandmark) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}

export function measurePinchRatio(hand: TrackedHand | null) {
  if (!hand) return null
  const landmarks =
    hand.worldLandmarks.length >= 21 ? hand.worldLandmarks : hand.landmarks
  const wrist = landmarks[WRIST]
  const thumbTip = landmarks[THUMB_TIP]
  const indexTip = landmarks[INDEX_TIP]
  const middleMcp = landmarks[MIDDLE_MCP]
  if (!wrist || !thumbTip || !indexTip || !middleMcp) return null

  const palmSize = distance(wrist, middleMcp)
  if (palmSize <= Number.EPSILON) return null
  return distance(thumbTip, indexTip) / palmSize
}

export type PinchSignal = {
  active: boolean
  ratio: number | null
}

/** Keeps pinch activation independent from pointer position and tracking UI. */
export class PinchDetector {
  #active = false
  #candidateFrames = 0

  update(hand: TrackedHand | null, reliable: boolean): PinchSignal {
    const ratio = reliable ? measurePinchRatio(hand) : null
    if (ratio === null) {
      this.#candidateFrames = 0
      return { active: this.#active, ratio }
    }

    const shouldChange = this.#active
      ? ratio >= GESTURE_THRESHOLDS.pinchExitRatio
      : ratio <= GESTURE_THRESHOLDS.pinchEnterRatio
    this.#candidateFrames = shouldChange ? this.#candidateFrames + 1 : 0
    if (this.#candidateFrames >= CONFIRMATION_FRAMES) {
      this.#active = !this.#active
      this.#candidateFrames = 0
    }

    return { active: this.#active, ratio }
  }

  reset() {
    this.#active = false
    this.#candidateFrames = 0
  }
}
