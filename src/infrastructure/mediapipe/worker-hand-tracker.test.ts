// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest"

import type { HandTrackerOptions } from "@/infrastructure/mediapipe/hand-tracker-port"
import {
  DroppedFrameError,
  WorkerHandTracker,
} from "@/infrastructure/mediapipe/worker-hand-tracker"
import { deterministicTrackingResult } from "@/test/fixtures/hand-landmarks"

const options: HandTrackerOptions = {
  maxHands: 1,
  minDetectionConfidence: 0.5,
  minPresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
  modelAssetUrl: "/vision/hand_landmarker.task",
  wasmRootUrl: "/vision/wasm",
}

function createWorker() {
  const postMessage = vi.fn()
  const terminate = vi.fn()
  const worker = {
    onerror: null,
    onmessage: null,
    postMessage,
    terminate,
  } as unknown as Worker
  return { postMessage, terminate, worker }
}

function emit(worker: Worker, data: unknown) {
  worker.onmessage?.call(worker, new MessageEvent("message", { data }))
}

describe("WorkerHandTracker", () => {
  it("initializes once and forwards development metrics", async () => {
    const { postMessage, worker } = createWorker()
    const onMetrics = vi.fn()
    const tracker = new WorkerHandTracker(() => worker, onMetrics)

    const firstInitialization = tracker.initialize(options)
    const secondInitialization = tracker.initialize(options)
    expect(firstInitialization).toBe(secondInitialization)
    expect(postMessage).toHaveBeenCalledOnce()

    emit(worker, { version: 1, type: "INIT", status: "ready" })
    await expect(firstInitialization).resolves.toBeUndefined()
    emit(worker, {
      version: 1,
      type: "METRICS",
      metrics: { frameId: 2, inferenceMs: 12, droppedFrames: 0 },
    })

    expect(onMetrics).toHaveBeenCalledWith({
      frameId: 2,
      inferenceMs: 12,
      droppedFrames: 0,
    })
  })

  it("rejects initialization when the worker cannot load MediaPipe", async () => {
    const { worker } = createWorker()
    const tracker = new WorkerHandTracker(() => worker)
    const initialization = tracker.initialize(options)

    emit(worker, {
      version: 1,
      type: "ERROR",
      code: "INIT_FAILED",
      message: "Model missing",
      recoverable: false,
    })

    await expect(initialization).rejects.toThrow("Model missing")
  })

  it("transfers frames and resolves the matching result", async () => {
    const { postMessage, worker } = createWorker()
    const tracker = new WorkerHandTracker(() => worker)
    const frame = { close: vi.fn() } as unknown as ImageBitmap
    const detection = tracker.detect(frame, 7, 120)

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "FRAME", frameId: 7, frame }),
      [frame],
    )
    emit(worker, {
      version: 1,
      type: "RESULT",
      result: deterministicTrackingResult,
    })

    await expect(detection).resolves.toEqual(deterministicTrackingResult)
  })

  it("rejects the matching detection when inference fails", async () => {
    const { worker } = createWorker()
    const tracker = new WorkerHandTracker(() => worker)
    const frame = { close: vi.fn() } as unknown as ImageBitmap
    const detection = tracker.detect(frame, 11, 200)

    emit(worker, {
      version: 1,
      type: "ERROR",
      code: "DETECTION_FAILED",
      frameId: 11,
      message: "Inference failed",
      recoverable: true,
    })

    await expect(detection).rejects.toThrow("Inference failed")
  })

  it("releases a superseded detection without reporting a tracker failure", async () => {
    const { worker } = createWorker()
    const tracker = new WorkerHandTracker(() => worker)
    const detection = tracker.detect(
      { close: vi.fn() } as unknown as ImageBitmap,
      10,
      180,
    )

    emit(worker, { version: 1, type: "DROPPED", frameId: 10 })

    await expect(detection).rejects.toBeInstanceOf(DroppedFrameError)
  })

  it("rejects pending work after an invalid response or worker crash", async () => {
    const firstWorker = createWorker().worker
    const firstTracker = new WorkerHandTracker(() => firstWorker)
    const invalidDetection = firstTracker.detect(
      { close: vi.fn() } as unknown as ImageBitmap,
      12,
      220,
    )
    emit(firstWorker, { version: 2, type: "RESULT" })
    await expect(invalidDetection).rejects.toThrow(
      "Invalid response from vision worker",
    )

    const secondWorker = createWorker().worker
    const secondTracker = new WorkerHandTracker(() => secondWorker)
    const initialization = secondTracker.initialize(options)
    secondWorker.onerror?.call(
      secondWorker,
      new ErrorEvent("error", { message: "crash" }),
    )
    await expect(initialization).rejects.toThrow("Vision worker crashed")
  })

  it("requests graceful disposal before terminating the worker", () => {
    vi.useFakeTimers()
    const { postMessage, terminate, worker } = createWorker()
    const tracker = new WorkerHandTracker(() => worker)

    tracker.dispose()

    expect(postMessage).toHaveBeenLastCalledWith({
      version: 1,
      type: "DISPOSE",
    })
    expect(terminate).not.toHaveBeenCalled()
    emit(worker, { version: 1, type: "DISPOSE", status: "disposed" })
    expect(terminate).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })

  it("is idempotent and refuses frames after disposal", async () => {
    vi.useFakeTimers()
    const { postMessage, terminate, worker } = createWorker()
    const tracker = new WorkerHandTracker(() => worker)
    const frameClose = vi.fn()

    tracker.dispose()
    tracker.dispose()
    const detection = tracker.detect(
      { close: frameClose } as unknown as ImageBitmap,
      13,
      240,
    )

    await expect(detection).rejects.toThrow("Vision worker is disposed")
    expect(frameClose).toHaveBeenCalledOnce()
    expect(postMessage).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(250)
    expect(terminate).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })
})
