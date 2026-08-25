import { describe, expect, it, vi } from "vitest"

import type {
  HandTrackerOptions,
  HandTrackerPort,
  HandTrackingResult,
} from "@/infrastructure/mediapipe/hand-tracker-port"
import {
  createVisionWorkerRuntime,
  type VisionWorkerScope,
} from "@/infrastructure/mediapipe/vision-worker-runtime"
import {
  VISION_PROTOCOL_VERSION,
  type VisionWorkerRequest,
  type VisionWorkerResponse,
} from "@/infrastructure/mediapipe/worker-protocol"
import { deterministicTrackingResult } from "@/test/fixtures/hand-landmarks"

const options: HandTrackerOptions = {
  maxHands: 1,
  minDetectionConfidence: 0.5,
  minPresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
  modelAssetUrl: "/vision/hand_landmarker.task",
  wasmRootUrl: "/vision/wasm",
}

function createDeferred<T>() {
  let resolvePromise: (value: T) => void = () => undefined
  let rejectPromise: (reason: unknown) => void = () => undefined
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })
  return { promise, reject: rejectPromise, resolve: resolvePromise }
}

function createFrame() {
  const close = vi.fn()
  return {
    close,
    frame: { close } as unknown as ImageBitmap,
  }
}

function createScope() {
  const messages: VisionWorkerResponse[] = []
  const close = vi.fn()
  const scope: VisionWorkerScope = {
    close,
    postMessage: (message) => messages.push(message),
  }
  return { close, messages, scope }
}

function createTracker(overrides: Partial<HandTrackerPort> = {}) {
  const tracker: HandTrackerPort = {
    detect: vi.fn<HandTrackerPort["detect"]>((_frame, frameId, timestampMs) =>
      Promise.resolve({
        ...deterministicTrackingResult,
        frameId,
        timestampMs,
      }),
    ),
    dispose: vi.fn(),
    initialize: vi.fn(() => Promise.resolve()),
    ...overrides,
  }
  return tracker
}

describe("createVisionWorkerRuntime", () => {
  it("rejects unsupported protocol versions", async () => {
    const { messages, scope } = createScope()
    const runtime = createVisionWorkerRuntime(scope, createTracker())

    await runtime.handleMessage({
      version: 2,
      type: "DISPOSE",
    } as unknown as VisionWorkerRequest)

    expect(messages[0]).toMatchObject({
      type: "ERROR",
      code: "PROTOCOL_ERROR",
      recoverable: false,
    })
  })

  it("closes frames received before initialization", async () => {
    const { close, frame } = createFrame()
    const { messages, scope } = createScope()
    const runtime = createVisionWorkerRuntime(scope, createTracker())

    await runtime.handleMessage({
      version: 1,
      type: "FRAME",
      frameId: 1,
      timestampMs: 10,
      frame,
    })

    expect(close).toHaveBeenCalledOnce()
    expect(messages[0]).toMatchObject({
      type: "ERROR",
      code: "PROTOCOL_ERROR",
      frameId: 1,
    })
  })

  it("reports initialization failures without becoming ready", async () => {
    const { messages, scope } = createScope()
    const tracker = createTracker({
      initialize: vi.fn(() => Promise.reject(new Error("WASM unavailable"))),
    })
    const runtime = createVisionWorkerRuntime(scope, tracker)

    await runtime.handleMessage({
      version: VISION_PROTOCOL_VERSION,
      type: "INIT",
      options,
    })

    expect(messages).toEqual([
      {
        version: 1,
        type: "ERROR",
        code: "INIT_FAILED",
        message: "WASM unavailable",
        recoverable: false,
      },
    ])
  })

  it("keeps one inference active and replaces an obsolete queued frame", async () => {
    const firstResult = createDeferred<HandTrackingResult>()
    const lastResult = createDeferred<HandTrackingResult>()
    const detect = vi
      .fn<HandTrackerPort["detect"]>()
      .mockReturnValueOnce(firstResult.promise)
      .mockReturnValueOnce(lastResult.promise)
    const tracker = createTracker({ detect })
    const { messages, scope } = createScope()
    let clock = 0
    const runtime = createVisionWorkerRuntime(scope, tracker, () => clock)
    await runtime.handleMessage({
      version: 1,
      type: "INIT",
      options,
    })
    messages.length = 0

    const first = createFrame()
    const obsolete = createFrame()
    const latest = createFrame()
    await runtime.handleMessage({
      version: 1,
      type: "FRAME",
      frameId: 1,
      timestampMs: 10,
      frame: first.frame,
    })
    await runtime.handleMessage({
      version: 1,
      type: "FRAME",
      frameId: 2,
      timestampMs: 20,
      frame: obsolete.frame,
    })
    await runtime.handleMessage({
      version: 1,
      type: "FRAME",
      frameId: 3,
      timestampMs: 30,
      frame: latest.frame,
    })

    expect(detect).toHaveBeenCalledTimes(1)
    expect(obsolete.close).toHaveBeenCalledOnce()
    clock = 8
    firstResult.resolve({ ...deterministicTrackingResult, frameId: 1 })
    await vi.waitFor(() => expect(detect).toHaveBeenCalledTimes(2))
    clock = 15
    lastResult.resolve({ ...deterministicTrackingResult, frameId: 3 })
    await vi.waitFor(() => expect(latest.close).toHaveBeenCalledOnce())

    expect(first.close).toHaveBeenCalledOnce()
    expect(
      messages
        .filter((message) => message.type === "RESULT")
        .map((message) => message.result.frameId),
    ).toEqual([1, 3])
    expect(
      messages.find(
        (message) =>
          message.type === "METRICS" && message.metrics.frameId === 3,
      ),
    ).toMatchObject({ metrics: { droppedFrames: 1 } })
  })

  it("reports recoverable detection failures and releases the frame", async () => {
    const tracker = createTracker({
      detect: vi.fn(() => Promise.reject(new Error("Bad frame"))),
    })
    const { messages, scope } = createScope()
    const runtime = createVisionWorkerRuntime(scope, tracker)
    await runtime.handleMessage({ version: 1, type: "INIT", options })
    messages.length = 0
    const { close, frame } = createFrame()

    await runtime.handleMessage({
      version: 1,
      type: "FRAME",
      frameId: 4,
      timestampMs: 40,
      frame,
    })
    await vi.waitFor(() => expect(close).toHaveBeenCalledOnce())

    expect(messages[0]).toEqual({
      version: 1,
      type: "ERROR",
      code: "DETECTION_FAILED",
      frameId: 4,
      message: "Bad frame",
      recoverable: true,
    })
  })

  it("closes queued frames and the tracker on disposal", async () => {
    const activeResult = createDeferred<HandTrackingResult>()
    const dispose = vi.fn()
    const tracker = createTracker({
      detect: vi.fn(() => activeResult.promise),
      dispose,
    })
    const { close, messages, scope } = createScope()
    const runtime = createVisionWorkerRuntime(scope, tracker)
    await runtime.handleMessage({ version: 1, type: "INIT", options })
    const active = createFrame()
    const queued = createFrame()
    await runtime.handleMessage({
      version: 1,
      type: "FRAME",
      frameId: 1,
      timestampMs: 10,
      frame: active.frame,
    })
    await runtime.handleMessage({
      version: 1,
      type: "FRAME",
      frameId: 2,
      timestampMs: 20,
      frame: queued.frame,
    })

    await runtime.handleMessage({ version: 1, type: "DISPOSE" })

    expect(queued.close).toHaveBeenCalledOnce()
    expect(dispose).toHaveBeenCalledOnce()
    expect(close).toHaveBeenCalledOnce()
    expect(messages.at(-1)).toEqual({
      version: 1,
      type: "DISPOSE",
      status: "disposed",
    })

    activeResult.resolve({ ...deterministicTrackingResult, frameId: 1 })
    await vi.waitFor(() => expect(active.close).toHaveBeenCalledOnce())

    const late = createFrame()
    await runtime.handleMessage({
      version: 1,
      type: "FRAME",
      frameId: 3,
      timestampMs: 30,
      frame: late.frame,
    })
    expect(late.close).toHaveBeenCalledOnce()
  })
})
