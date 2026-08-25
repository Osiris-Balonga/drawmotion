import { describe, expect, it, vi } from "vitest"

import {
  isVisionWorkerResponse,
  VISION_PROTOCOL_VERSION,
  type VisionWorkerRequest,
} from "@/infrastructure/mediapipe/worker-protocol"
import { FakeHandTracker } from "@/test/fakes/fake-hand-tracker"
import {
  deterministicTrackingResult,
  openHandLandmarks,
} from "@/test/fixtures/hand-landmarks"

describe("vision worker protocol", () => {
  it("uses a versioned transferable frame message", () => {
    const close = vi.fn()
    const frame = { close } as unknown as ImageBitmap
    const message: VisionWorkerRequest = {
      version: VISION_PROTOCOL_VERSION,
      type: "FRAME",
      frameId: 4,
      timestampMs: 80,
      frame,
    }

    expect(message).toMatchObject({
      version: 1,
      type: "FRAME",
      frameId: 4,
      timestampMs: 80,
    })
    expect(message.frame).toBe(frame)
  })

  it("rejects unversioned and future worker responses", () => {
    expect(isVisionWorkerResponse({ type: "RESULT" })).toBe(false)
    expect(isVisionWorkerResponse({ version: 2, type: "RESULT" })).toBe(false)
    expect(isVisionWorkerResponse({ version: 1, type: "UNKNOWN" })).toBe(false)
    expect(isVisionWorkerResponse({ version: 1, type: "METRICS" })).toBe(true)
  })

  it("provides deterministic 21-point landmark fixtures", () => {
    expect(openHandLandmarks).toHaveLength(21)
    expect(openHandLandmarks[0]).toEqual({ x: 0.3, y: 0.8, z: 0 })
    expect(deterministicTrackingResult.hands[0]?.confidence).toBe(0.98)
  })

  it("provides a disposable fake tracker", async () => {
    const close = vi.fn()
    const tracker = new FakeHandTracker(deterministicTrackingResult)
    const options = {
      maxHands: 1,
      minDetectionConfidence: 0.5,
      minPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      modelAssetUrl: "/vision/hand_landmarker.task",
      wasmRootUrl: "/vision/wasm",
    }

    await tracker.initialize(options)
    const result = await tracker.detect(
      { close } as unknown as ImageBitmap,
      9,
      160,
    )
    tracker.dispose()

    expect(tracker.initializedWith).toEqual(options)
    expect(tracker.frames).toEqual([{ frameId: 9, timestampMs: 160 }])
    expect(result).toMatchObject({ frameId: 9, timestampMs: 160 })
    expect(close).not.toHaveBeenCalled()
    expect(tracker.disposed).toBe(true)
  })
})
