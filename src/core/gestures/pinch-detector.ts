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

function projectedDistance(a: NormalizedLandmark, b: NormalizedLandmark) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function measurePinchRatio(hand: TrackedHand | null) {
  if (!hand) return null
  const landmarks = hand.landmarks
  const wrist = landmarks[WRIST]
  const thumbTip = landmarks[THUMB_TIP]
  const indexTip = landmarks[INDEX_TIP]
  const middleMcp = landmarks[MIDDLE_MCP]
  if (!wrist || !thumbTip || !indexTip || !middleMcp) return null

  const palmSize = projectedDistance(wrist, middleMcp)
  if (palmSize <= Number.EPSILON) return null
  return projectedDistance(thumbTip, indexTip) / palmSize
}

export type PinchSignal = {
  phase: PinchPhase
  ratio: number | null
}

export type PinchPhase =
  "released" | "pending-entry" | "active" | "pending-release"

/** Keeps pinch activation independent from pointer position and tracking UI. */
export class PinchDetector {
  #phase: PinchPhase = "released"
  #candidateFrames = 0
  #releaseStartedAtMs: number | null = null

  update(
    hand: TrackedHand | null,
    reliable: boolean,
    timestampMs: number,
  ): PinchSignal {
    const ratio = reliable ? measurePinchRatio(hand) : null
    if (ratio === null) {
      this.#candidateFrames = 0
      if (this.#phase === "pending-entry") {
        this.#phase = "released"
      }
      return { phase: this.#phase, ratio }
    }

    if (this.#phase === "released" || this.#phase === "pending-entry") {
      const entering = ratio <= GESTURE_THRESHOLDS.pinchEnterRatio
      this.#candidateFrames = entering ? this.#candidateFrames + 1 : 0
      if (this.#candidateFrames >= CONFIRMATION_FRAMES) {
        this.#phase = "active"
        this.#candidateFrames = 0
      } else {
        this.#phase = entering ? "pending-entry" : "released"
      }
      return { phase: this.#phase, ratio }
    }

    if (ratio < GESTURE_THRESHOLDS.drawingPinchExitRatio) {
      this.#phase = "active"
      this.#releaseStartedAtMs = null
      return { phase: this.#phase, ratio }
    }

    if (this.#phase === "active") {
      this.#phase = "pending-release"
      this.#releaseStartedAtMs = timestampMs
      return { phase: this.#phase, ratio }
    }

    const releaseElapsedMs = Math.max(
      0,
      timestampMs - (this.#releaseStartedAtMs ?? timestampMs),
    )
    if (releaseElapsedMs >= GESTURE_THRESHOLDS.drawingReleaseGraceMs) {
      this.#phase = "released"
      this.#releaseStartedAtMs = null
    }
    return { phase: this.#phase, ratio }
  }

  reset() {
    this.#phase = "released"
    this.#candidateFrames = 0
    this.#releaseStartedAtMs = null
  }
}
