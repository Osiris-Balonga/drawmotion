import { describe, expect, it, vi } from "vitest"

import type {
  HandTrackerOptions,
  HandTrackerPort,
} from "@/infrastructure/mediapipe/hand-tracker-port"
import {
  classifyTrackingQuality,
  HandTrackingSession,
} from "@/infrastructure/mediapipe/hand-tracking-session"
import { deterministicTrackingResult } from "@/test/fixtures/hand-landmarks"

const options: HandTrackerOptions = {
  maxHands: 1,
  minDetectionConfidence: 0.5,
  minPresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
  modelAssetUrl: "/vision/hand_landmarker.task",
  wasmRootUrl: "/vision/wasm",
}

describe("HandTrackingSession", () => {
  it("classifies reliable, uncertain and lost tracking", () => {
    expect(classifyTrackingQuality(deterministicTrackingResult)).toBe(
      "reliable",
    )
    expect(
      classifyTrackingQuality({
        ...deterministicTrackingResult,
        hands: [{ ...deterministicTrackingResult.hands[0]!, confidence: 0.6 }],
      }),
    ).toBe("uncertain")
    expect(
      classifyTrackingQuality({ ...deterministicTrackingResult, hands: [] }),
    ).toBe("lost")
  })

  it("cancels scheduled video work and disposes the tracker", async () => {
    const cancelVideoFrameCallback = vi.fn()
    const requestVideoFrameCallback = vi.fn(() => 42)
    const video = {
      cancelVideoFrameCallback,
      requestVideoFrameCallback,
    } as unknown as HTMLVideoElement
    const dispose = vi.fn()
    const initialize = vi.fn(() => Promise.resolve())
    const tracker: HandTrackerPort = {
      detect: vi.fn(),
      dispose,
      initialize,
    }
    const session = new HandTrackingSession(video, tracker, {
      onError: vi.fn(),
      onResult: vi.fn(),
    })

    await session.start(options)
    session.dispose()

    expect(initialize).toHaveBeenCalledWith(options)
    expect(requestVideoFrameCallback).toHaveBeenCalledOnce()
    expect(cancelVideoFrameCallback).toHaveBeenCalledWith(42)
    expect(dispose).toHaveBeenCalledOnce()
  })

  it("captures a frame and reports its tracking quality", async () => {
    let videoCallback: VideoFrameRequestCallback | null = null
    const requestVideoFrameCallback = vi.fn(
      (callback: VideoFrameRequestCallback) => {
        videoCallback = callback
        return 5
      },
    )
    const video = {
      cancelVideoFrameCallback: vi.fn(),
      readyState: HTMLMediaElement.HAVE_CURRENT_DATA,
      requestVideoFrameCallback,
    } as unknown as HTMLVideoElement
    const frame = { close: vi.fn() } as unknown as ImageBitmap
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(() => Promise.resolve(frame)),
    )
    const detect = vi.fn(() => Promise.resolve(deterministicTrackingResult))
    const tracker: HandTrackerPort = {
      detect,
      dispose: vi.fn(),
      initialize: vi.fn(() => Promise.resolve()),
    }
    const onResult = vi.fn()
    const session = new HandTrackingSession(video, tracker, {
      onError: vi.fn(),
      onResult,
    })
    await session.start(options)

    const callback = videoCallback as VideoFrameRequestCallback | null
    expect(callback).not.toBeNull()
    callback?.(0, { mediaTime: 0.25 } as VideoFrameCallbackMetadata)
    await vi.waitFor(() => expect(onResult).toHaveBeenCalledOnce())

    expect(detect).toHaveBeenCalledWith(frame, 1, 250)
    expect(onResult).toHaveBeenCalledWith(
      deterministicTrackingResult,
      "reliable",
    )
    expect(requestVideoFrameCallback).toHaveBeenCalledTimes(2)
    session.dispose()
    vi.unstubAllGlobals()
  })

  it("reports capture failures and keeps the session recoverable", async () => {
    let videoCallback: VideoFrameRequestCallback | null = null
    const requestVideoFrameCallback = vi.fn(
      (callback: VideoFrameRequestCallback) => {
        videoCallback = callback
        return 8
      },
    )
    const video = {
      cancelVideoFrameCallback: vi.fn(),
      readyState: HTMLMediaElement.HAVE_CURRENT_DATA,
      requestVideoFrameCallback,
    } as unknown as HTMLVideoElement
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(() => Promise.reject(new Error("Decoder failed"))),
    )
    const tracker: HandTrackerPort = {
      detect: vi.fn(),
      dispose: vi.fn(),
      initialize: vi.fn(() => Promise.resolve()),
    }
    const onError = vi.fn()
    const session = new HandTrackingSession(video, tracker, {
      onError,
      onResult: vi.fn(),
    })
    await session.start(options)

    const callback = videoCallback as VideoFrameRequestCallback | null
    callback?.(0, { mediaTime: 0.5 } as VideoFrameCallbackMetadata)
    await vi.waitFor(() =>
      expect(onError).toHaveBeenCalledWith(new Error("Decoder failed")),
    )

    expect(requestVideoFrameCallback).toHaveBeenCalledTimes(2)
    session.dispose()
    vi.unstubAllGlobals()
  })

  it("waits for video data before creating an image", async () => {
    let videoCallback: VideoFrameRequestCallback | null = null
    const requestVideoFrameCallback = vi.fn(
      (callback: VideoFrameRequestCallback) => {
        videoCallback = callback
        return 9
      },
    )
    const video = {
      cancelVideoFrameCallback: vi.fn(),
      readyState: HTMLMediaElement.HAVE_NOTHING,
      requestVideoFrameCallback,
    } as unknown as HTMLVideoElement
    const createBitmap = vi.fn()
    vi.stubGlobal("createImageBitmap", createBitmap)
    const tracker: HandTrackerPort = {
      detect: vi.fn(),
      dispose: vi.fn(),
      initialize: vi.fn(() => Promise.resolve()),
    }
    const session = new HandTrackingSession(video, tracker, {
      onError: vi.fn(),
      onResult: vi.fn(),
    })
    await session.start(options)

    const callback = videoCallback as VideoFrameRequestCallback | null
    callback?.(0, { mediaTime: 0 } as VideoFrameCallbackMetadata)
    await vi.waitFor(() =>
      expect(requestVideoFrameCallback).toHaveBeenCalledTimes(2),
    )

    expect(createBitmap).not.toHaveBeenCalled()
    session.dispose()
    vi.unstubAllGlobals()
  })
})
