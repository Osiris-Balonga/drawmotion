import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision"

import type {
  HandTrackerOptions,
  HandTrackerPort,
  HandTrackingResult,
  NormalizedLandmark,
  TrackedHand,
} from "@/infrastructure/mediapipe/hand-tracker-port"

function copyLandmark(landmark: NormalizedLandmark): NormalizedLandmark {
  return {
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
    ...(landmark.visibility === undefined
      ? {}
      : { visibility: landmark.visibility }),
  }
}

function normalizeHandedness(
  value: string | undefined,
): TrackedHand["handedness"] {
  return value === "Left" || value === "Right" ? value : "Unknown"
}

function toTrackedHands(result: HandLandmarkerResult): TrackedHand[] {
  return result.landmarks.map((landmarks, index) => {
    const handedness = result.handedness[index]?.[0]
    return {
      handedness: normalizeHandedness(handedness?.categoryName),
      handednessConfidence: handedness?.score ?? 0,
      landmarks: landmarks.map(copyLandmark),
      worldLandmarks: (result.worldLandmarks[index] ?? []).map(copyLandmark),
    }
  })
}

export class MediaPipeHandTracker implements HandTrackerPort {
  private landmarker: HandLandmarker | null = null

  async initialize(options: HandTrackerOptions): Promise<void> {
    this.dispose()
    const fileset = await FilesetResolver.forVisionTasks(
      options.wasmRootUrl,
      true,
    )
    this.landmarker = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: options.modelAssetUrl,
      },
      minHandDetectionConfidence: options.minDetectionConfidence,
      minHandPresenceConfidence: options.minPresenceConfidence,
      minTrackingConfidence: options.minTrackingConfidence,
      numHands: options.maxHands,
      runningMode: "VIDEO",
    })
  }

  detect(
    frame: ImageBitmap,
    frameId: number,
    timestampMs: number,
  ): Promise<HandTrackingResult> {
    if (!this.landmarker) {
      return Promise.reject(new Error("Hand tracker is not initialized"))
    }

    const result = this.landmarker.detectForVideo(frame, timestampMs)
    return Promise.resolve({
      frameId,
      timestampMs,
      hands: toTrackedHands(result),
    })
  }

  dispose(): void {
    this.landmarker?.close()
    this.landmarker = null
  }
}
