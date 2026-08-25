export type NormalizedLandmark = {
  x: number
  y: number
  z: number
  visibility?: number
}

export type TrackedHand = {
  handedness: "Left" | "Right" | "Unknown"
  handednessConfidence: number
  landmarks: NormalizedLandmark[]
  worldLandmarks: NormalizedLandmark[]
}

export type HandTrackingResult = {
  frameId: number
  timestampMs: number
  hands: TrackedHand[]
}

export type HandTrackerMetrics = {
  frameId: number
  inferenceMs: number
  droppedFrames: number
}

export type HandTrackerOptions = {
  delegate?: "CPU" | "GPU"
  maxHands: number
  minDetectionConfidence: number
  minPresenceConfidence: number
  minTrackingConfidence: number
  modelAssetUrl: string
  wasmRootUrl: string
}

export interface HandTrackerPort {
  initialize(options: HandTrackerOptions): Promise<void>
  detect(
    frame: ImageBitmap,
    frameId: number,
    timestampMs: number,
  ): Promise<HandTrackingResult>
  dispose(): void
}
