import { beforeEach, describe, expect, it, vi } from "vitest"

import type { HandTrackerOptions } from "@/infrastructure/mediapipe/hand-tracker-port"
import { MediaPipeHandTracker } from "@/infrastructure/mediapipe/mediapipe-hand-tracker"

const mediaPipe = vi.hoisted(() => ({
  close: vi.fn(),
  createFromOptions: vi.fn(),
  detectForVideo: vi.fn(),
  forVisionTasks: vi.fn(),
}))

vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: { forVisionTasks: mediaPipe.forVisionTasks },
  HandLandmarker: { createFromOptions: mediaPipe.createFromOptions },
}))

const options: HandTrackerOptions = {
  maxHands: 1,
  minDetectionConfidence: 0.5,
  minPresenceConfidence: 0.6,
  minTrackingConfidence: 0.7,
  modelAssetUrl: "http://localhost/vision/hand_landmarker.task",
  wasmRootUrl: "http://localhost/vision/wasm",
}

describe("MediaPipeHandTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mediaPipe.forVisionTasks.mockResolvedValue({ fileset: true })
    mediaPipe.createFromOptions.mockResolvedValue({
      close: mediaPipe.close,
      detectForVideo: mediaPipe.detectForVideo,
    })
  })

  it("uses the local ES module runtime in VIDEO mode", async () => {
    const tracker = new MediaPipeHandTracker()

    await tracker.initialize(options)

    expect(mediaPipe.forVisionTasks).toHaveBeenCalledWith(
      "http://localhost/vision/wasm",
      true,
    )
    expect(mediaPipe.createFromOptions).toHaveBeenCalledWith(
      { fileset: true },
      {
        baseOptions: {
          modelAssetPath: "http://localhost/vision/hand_landmarker.task",
        },
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.7,
        numHands: 1,
        runningMode: "VIDEO",
      },
    )
  })

  it("normalizes MediaPipe results without leaking SDK objects", async () => {
    mediaPipe.detectForVideo.mockReturnValue({
      handedness: [
        [{ categoryName: "Left", score: 0.96 }],
        [{ categoryName: "Other" }],
      ],
      landmarks: [
        [{ x: 0.1, y: 0.2, z: -0.01, visibility: 0.9 }],
        [{ x: 0.4, y: 0.5, z: -0.02 }],
      ],
      worldLandmarks: [[{ x: 0.01, y: 0.02, z: -0.03 }]],
    })
    const tracker = new MediaPipeHandTracker()
    await tracker.initialize(options)
    const frame = {} as ImageBitmap

    await expect(tracker.detect(frame, 4, 80)).resolves.toEqual({
      frameId: 4,
      timestampMs: 80,
      hands: [
        {
          handedness: "Left",
          handednessConfidence: 0.96,
          landmarks: [{ x: 0.1, y: 0.2, z: -0.01, visibility: 0.9 }],
          worldLandmarks: [{ x: 0.01, y: 0.02, z: -0.03 }],
        },
        {
          handedness: "Unknown",
          handednessConfidence: 0,
          landmarks: [{ x: 0.4, y: 0.5, z: -0.02 }],
          worldLandmarks: [],
        },
      ],
    })
    expect(mediaPipe.detectForVideo).toHaveBeenCalledWith(frame, 80)
  })

  it("falls back to the CPU delegate when GPU initialization fails", async () => {
    mediaPipe.createFromOptions
      .mockRejectedValueOnce(new Error("WebGL unavailable"))
      .mockResolvedValueOnce({
        close: mediaPipe.close,
        detectForVideo: mediaPipe.detectForVideo,
      })
    const tracker = new MediaPipeHandTracker()

    await tracker.initialize({ ...options, delegate: "GPU" })

    expect(mediaPipe.createFromOptions).toHaveBeenNthCalledWith(
      1,
      { fileset: true },
      {
        baseOptions: {
          delegate: "GPU",
          modelAssetPath: "http://localhost/vision/hand_landmarker.task",
        },
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.7,
        numHands: 1,
        runningMode: "VIDEO",
      },
    )
    expect(mediaPipe.createFromOptions).toHaveBeenNthCalledWith(
      2,
      { fileset: true },
      {
        baseOptions: {
          delegate: "CPU",
          modelAssetPath: "http://localhost/vision/hand_landmarker.task",
        },
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.7,
        numHands: 1,
        runningMode: "VIDEO",
      },
    )
  })

  it("rejects detection before initialization and disposes idempotently", async () => {
    const tracker = new MediaPipeHandTracker()

    await expect(tracker.detect({} as ImageBitmap, 1, 0)).rejects.toThrow(
      "Hand tracker is not initialized",
    )
    await tracker.initialize(options)
    tracker.dispose()
    tracker.dispose()

    expect(mediaPipe.close).toHaveBeenCalledOnce()
  })
})
