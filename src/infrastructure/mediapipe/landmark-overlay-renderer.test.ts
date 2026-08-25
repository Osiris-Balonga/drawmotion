import { describe, expect, it, vi } from "vitest"

import { LandmarkOverlayRenderer } from "@/infrastructure/mediapipe/landmark-overlay-renderer"
import { deterministicTrackingResult } from "@/test/fixtures/hand-landmarks"

function createRenderer(contextAvailable = true) {
  const arc = vi.fn()
  const beginPath = vi.fn()
  const clearRect = vi.fn()
  const fill = vi.fn()
  const lineTo = vi.fn()
  const moveTo = vi.fn()
  const stroke = vi.fn()
  const context = {
    arc,
    beginPath,
    clearRect,
    fill,
    lineCap: "butt",
    lineJoin: "miter",
    lineTo,
    lineWidth: 1,
    moveTo,
    stroke,
    fillStyle: "",
    strokeStyle: "",
  } as unknown as CanvasRenderingContext2D
  const canvas = {
    clientHeight: 100,
    clientWidth: 100,
    getContext: vi.fn(() => (contextAvailable ? context : null)),
    height: 0,
    width: 0,
  } as unknown as HTMLCanvasElement
  const video = {
    videoHeight: 100,
    videoWidth: 200,
  } as HTMLVideoElement

  return {
    canvas,
    context,
    mocks: { arc, beginPath, clearRect, fill, lineTo, moveTo, stroke },
    renderer: new LandmarkOverlayRenderer(canvas, video),
  }
}

describe("LandmarkOverlayRenderer", () => {
  it("draws mirrored landmarks over an object-fit cover viewport", () => {
    const ratio = vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(2)
    const { canvas, context, mocks, renderer } = createRenderer()

    renderer.render(deterministicTrackingResult)

    expect(canvas.width).toBe(200)
    expect(canvas.height).toBe(200)
    expect(mocks.clearRect).toHaveBeenCalledWith(0, 0, 200, 200)
    expect(mocks.moveTo).toHaveBeenCalled()
    expect(mocks.lineTo).toHaveBeenCalled()
    expect(mocks.stroke).toHaveBeenCalledOnce()
    expect(mocks.arc).toHaveBeenCalledTimes(21)
    expect(mocks.fill).toHaveBeenCalledTimes(21)
    expect(context.strokeStyle).toBe("#8b5cf6")
    expect(context.fillStyle).toBe("#35d07f")
    ratio.mockRestore()
  })

  it("clears the overlay when tracking is lost", () => {
    const { mocks, renderer } = createRenderer()

    renderer.render({ ...deterministicTrackingResult, hands: [] })
    renderer.clear()

    expect(mocks.clearRect).toHaveBeenCalledTimes(2)
    expect(mocks.arc).not.toHaveBeenCalled()
  })

  it("does nothing when a 2D context is unavailable", () => {
    const { renderer } = createRenderer(false)

    expect(() => renderer.render(deterministicTrackingResult)).not.toThrow()
    expect(() => renderer.clear()).not.toThrow()
  })
})
