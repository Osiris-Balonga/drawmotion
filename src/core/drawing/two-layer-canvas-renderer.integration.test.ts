import { describe, expect, it, vi } from "vitest"

import { CanvasDrawingController } from "./canvas-drawing-controller"
import type { Stroke } from "./drawing-model"
import { TwoLayerCanvasRenderer } from "./two-layer-canvas-renderer"

function createContext() {
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    fill: vi.fn(),
    fillStyle: "",
    globalCompositeOperation: "source-over",
    lineCap: "butt",
    lineJoin: "miter",
    lineTo: vi.fn(),
    lineWidth: 1,
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    setLineDash: vi.fn(),
    setTransform: vi.fn(),
    stroke: vi.fn(),
    strokeStyle: "",
  }
}

function createHarness(devicePixelRatio = 2) {
  const persistentContext = createContext()
  const interactionContext = createContext()
  const persistentCanvas = {
    getContext: () => persistentContext,
    height: 0,
    style: { height: "", width: "" },
    width: 0,
  } as unknown as HTMLCanvasElement
  const interactionCanvas = {
    getContext: () => interactionContext,
    height: 0,
    style: { height: "", width: "" },
    width: 0,
  } as unknown as HTMLCanvasElement
  let scheduled: FrameRequestCallback | null = null
  const cancelFrame = vi.fn()
  const renderer = new TwoLayerCanvasRenderer(
    persistentCanvas,
    interactionCanvas,
    {
      devicePixelRatio: () => devicePixelRatio,
      requestFrame: (callback) => {
        scheduled = callback
        return 1
      },
      cancelFrame,
    },
  )
  const flush = () => {
    const callback = scheduled
    scheduled = null
    if (callback) callback(0)
  }
  return {
    cancelFrame,
    flush,
    interactionCanvas,
    interactionContext,
    persistentCanvas,
    persistentContext,
    renderer,
  }
}

const stroke: Stroke = {
  id: "stroke-1",
  tool: "pen",
  color: "#111111",
  width: 0.01,
  points: [
    { x: 0.25, y: 0.5 },
    { x: 0.75, y: 0.5 },
  ],
}

describe("TwoLayerCanvasRenderer", () => {
  it("sizes both layers for high-DPI output", () => {
    const harness = createHarness(2)
    harness.renderer.resize(300, 200)

    expect(harness.persistentCanvas.width).toBe(600)
    expect(harness.persistentCanvas.height).toBe(400)
    expect(harness.interactionCanvas.width).toBe(600)
    expect(harness.persistentContext.setTransform).toHaveBeenCalledWith(
      2,
      0,
      0,
      2,
      0,
      0,
    )
  })

  it("replays normalized strokes after a resize", () => {
    const harness = createHarness(1)
    harness.renderer.resize(200, 100)
    harness.renderer.setDocument({ strokes: [stroke] })
    harness.flush()
    expect(harness.persistentContext.moveTo).toHaveBeenLastCalledWith(50, 50)

    harness.renderer.resize(400, 200)
    harness.flush()
    expect(harness.persistentContext.moveTo).toHaveBeenLastCalledWith(100, 100)
    expect(harness.persistentContext.lineTo).toHaveBeenLastCalledWith(300, 100)
  })

  it("applies zoom and pan to document strokes", () => {
    const harness = createHarness(1)
    harness.renderer.resize(200, 100)
    harness.renderer.setViewport({ zoom: 0.5, offsetX: 20, offsetY: 10 })
    harness.renderer.setDocument({ strokes: [stroke] })
    harness.flush()

    expect(harness.persistentContext.moveTo).toHaveBeenLastCalledWith(45, 35)
    expect(harness.persistentContext.lineTo).toHaveBeenLastCalledWith(95, 35)
    expect(harness.persistentContext.lineWidth).toBe(0.5)
  })

  it("coalesces pointer and preview updates into one animation frame", () => {
    const harness = createHarness(1)
    harness.renderer.resize(200, 100)
    harness.renderer.setPreviewStroke(stroke)
    harness.renderer.setPointer({ x: 30, y: 40 })
    harness.flush()

    expect(harness.interactionContext.stroke).toHaveBeenCalledOnce()
    expect(harness.interactionContext.arc).toHaveBeenCalledWith(
      30,
      40,
      6,
      0,
      Math.PI * 2,
    )
  })

  it("renders ink on the first drawing point without waiting for movement", () => {
    const harness = createHarness(1)
    harness.renderer.resize(200, 100)
    harness.renderer.setPreviewStroke({
      ...stroke,
      points: [{ x: 0.25, y: 0.5 }],
    })
    harness.flush()

    expect(harness.interactionContext.arc).toHaveBeenCalledWith(
      50,
      50,
      0.5,
      0,
      Math.PI * 2,
    )
    expect(harness.interactionContext.fill).toHaveBeenCalledOnce()
    expect(harness.interactionContext.stroke).not.toHaveBeenCalled()
  })

  it("smooths sampled paths with quadratic midpoints", () => {
    const harness = createHarness(1)
    harness.renderer.resize(200, 100)
    harness.renderer.setDocument({
      strokes: [
        {
          ...stroke,
          points: [
            { x: 0.1, y: 0.2 },
            { x: 0.4, y: 0.6 },
            { x: 0.8, y: 0.4 },
          ],
        },
      ],
    })
    harness.flush()

    const curve = harness.persistentContext.quadraticCurveTo.mock.calls[0]
    expect(curve?.[0]).toBeCloseTo(80)
    expect(curve?.[1]).toBeCloseTo(60)
    expect(curve?.[2]).toBeCloseTo(120)
    expect(curve?.[3]).toBeCloseTo(50)
  })

  it("renders continuous, dashed, and dotted stroke patterns", () => {
    const harness = createHarness(1)
    harness.renderer.resize(200, 100)
    harness.renderer.setDocument({
      strokes: [
        { ...stroke, id: "solid", pattern: "solid" },
        { ...stroke, id: "dashed", pattern: "dashed" },
        { ...stroke, id: "dotted", pattern: "dotted" },
      ],
    })
    harness.flush()

    expect(harness.persistentContext.setLineDash).toHaveBeenCalledWith([])
    expect(harness.persistentContext.setLineDash).toHaveBeenCalledWith([6, 4])
    expect(harness.persistentContext.setLineDash).toHaveBeenCalledWith([0, 4])
  })

  it("renders eraser strokes and ignores empty stroke geometry", () => {
    const harness = createHarness(1)
    harness.renderer.resize(100, 100)
    harness.renderer.setDocument({
      strokes: [
        { ...stroke, tool: "eraser" },
        { ...stroke, id: "empty", points: [] },
      ],
    })
    harness.flush()

    expect(harness.persistentContext.globalCompositeOperation).toBe(
      "destination-out",
    )
    expect(harness.persistentContext.stroke).toHaveBeenCalledOnce()
  })

  it("previews erasing directly on the persistent layer", () => {
    const harness = createHarness(1)
    harness.renderer.resize(200, 100)
    harness.renderer.setDocument({ strokes: [stroke] })
    harness.renderer.setPreviewStroke({
      ...stroke,
      id: "eraser-preview",
      tool: "eraser",
      points: [
        { x: 0.4, y: 0.5 },
        { x: 0.6, y: 0.5 },
      ],
    })
    harness.flush()

    expect(harness.persistentContext.globalCompositeOperation).toBe(
      "destination-out",
    )
    expect(harness.persistentContext.stroke).toHaveBeenCalledTimes(2)
    expect(harness.interactionContext.stroke).not.toHaveBeenCalled()
  })

  it("clears the interaction layer when pointer and preview are absent", () => {
    const harness = createHarness(0.5)
    harness.renderer.resize(-10, -20)
    harness.renderer.setPointer(null)
    harness.renderer.setPreviewStroke(null)
    harness.flush()

    expect(harness.persistentCanvas.width).toBe(0)
    expect(harness.interactionContext.arc).not.toHaveBeenCalled()
  })

  it("cancels a scheduled frame when disposed", () => {
    const harness = createHarness()
    harness.renderer.resize(100, 100)
    harness.renderer.dispose()
    harness.renderer.dispose()

    expect(harness.cancelFrame).toHaveBeenCalledOnce()
  })

  it("rejects environments without two Canvas 2D contexts", () => {
    const unavailable = {
      getContext: () => null,
    } as unknown as HTMLCanvasElement
    expect(() => new TwoLayerCanvasRenderer(unavailable, unavailable)).toThrow(
      "Canvas 2D support",
    )
  })
})

describe("CanvasDrawingController", () => {
  it("commits and replays a stroke when tracking is lost", () => {
    const harness = createHarness(1)
    const controller = new CanvasDrawingController(harness.renderer)
    controller.setBounds({ left: 100, top: 50, width: 400, height: 200 })
    controller.setStyle({
      tool: "pen",
      color: "#7c3aed",
      width: 0.01,
      pattern: "dashed",
    })

    controller.handle({
      version: 1,
      type: "DRAW_START",
      point: { x: 200, y: 100 },
      timestampMs: 0,
    })
    controller.handle({
      version: 1,
      type: "DRAW_MOVE",
      point: { x: 300, y: 150 },
      timestampMs: 16,
    })
    controller.handle({
      version: 1,
      type: "TRACKING_LOST",
      timestampMs: 32,
    })

    const points = controller.document.strokes[0]?.points
    expect(controller.document.strokes[0]?.pattern).toBe("dashed")
    expect(points?.[0]).toEqual({ x: 0.25, y: 0.25 })
    expect(points?.at(-1)).toEqual({ x: 0.5, y: 0.5 })
    expect(points?.length).toBeGreaterThan(2)
    controller.undo()
    expect(controller.document.strokes).toEqual([])
    controller.redo()
    expect(controller.document.strokes).toHaveLength(1)
  })

  it("publishes history availability and records a reversible clear", () => {
    const harness = createHarness(1)
    const controller = new CanvasDrawingController(harness.renderer)
    const onHistoryChange = vi.fn()
    controller.setBounds({ left: 0, top: 0, width: 100, height: 100 })
    controller.setHistoryListener(onHistoryChange)

    expect(onHistoryChange).toHaveBeenLastCalledWith({
      canUndo: false,
      canRedo: false,
      canClear: false,
    })

    controller.handle({
      version: 1,
      type: "DRAW_START",
      point: { x: 20, y: 20 },
      timestampMs: 0,
    })
    controller.handle({
      version: 1,
      type: "DRAW_END",
      point: { x: 20, y: 20 },
      timestampMs: 1,
    })
    expect(onHistoryChange).toHaveBeenLastCalledWith({
      canUndo: true,
      canRedo: false,
      canClear: true,
    })

    controller.clear()
    expect(controller.document.strokes).toEqual([])
    expect(controller.historyAvailability).toEqual({
      canUndo: true,
      canRedo: false,
      canClear: false,
    })

    controller.undo()
    expect(controller.document.strokes).toHaveLength(1)
    expect(controller.historyAvailability.canRedo).toBe(true)
  })

  it("applies style, preserves virtual-canvas points, and finishes explicitly", () => {
    const harness = createHarness(1)
    const controller = new CanvasDrawingController(harness.renderer)
    controller.setBounds({ left: 10, top: 20, width: 100, height: 50 })
    controller.setStyle({
      tool: "eraser",
      color: "#ffffff",
      width: 0.04,
      pattern: "dotted",
    })
    controller.handle({
      version: 1,
      type: "POINTER_MOVE",
      point: { x: 60, y: 45 },
      timestampMs: 0,
    })
    controller.handle({
      version: 1,
      type: "DRAW_START",
      point: { x: -100, y: 500 },
      timestampMs: 1,
    })
    controller.handle({
      version: 1,
      type: "DRAW_END",
      point: { x: 0, y: 0 },
      timestampMs: 2,
    })

    expect(controller.document.strokes[0]).toMatchObject({
      tool: "eraser",
      color: "#ffffff",
      width: 0.04,
      pattern: "solid",
      points: [{ x: -1.1, y: 9.6 }],
    })
  })

  it("maps screen points back through the current viewport", () => {
    const harness = createHarness(1)
    const controller = new CanvasDrawingController(harness.renderer)
    controller.setBounds({ left: 0, top: 0, width: 100, height: 100 })
    controller.setViewport({ zoom: 0.5, offsetX: 25, offsetY: 25 })
    controller.handle({
      version: 1,
      type: "DRAW_START",
      point: { x: 50, y: 50 },
      timestampMs: 0,
    })
    controller.handle({
      version: 1,
      type: "DRAW_END",
      point: { x: 50, y: 50 },
      timestampMs: 16,
    })

    expect(controller.document.strokes[0]?.points).toEqual([{ x: 0.5, y: 0.5 }])
  })

  it("safely ignores move and pause signals without an active stroke", () => {
    const harness = createHarness(1)
    const controller = new CanvasDrawingController(harness.renderer)
    controller.handle({
      version: 1,
      type: "DRAW_MOVE",
      point: { x: 1, y: 1 },
      timestampMs: 0,
    })
    controller.handle({ version: 1, type: "PAUSE", timestampMs: 1 })

    expect(controller.document.strokes).toEqual([])
  })

  it("applies confident shape assistance and can restore the original stroke", () => {
    const harness = createHarness(1)
    const controller = new CanvasDrawingController(harness.renderer)
    const feedback = vi.fn()
    controller.setBounds({ left: 0, top: 0, width: 1000, height: 600 })
    controller.setAssistanceMode("shapes")
    controller.setAssistanceListener(feedback)

    for (let index = 0; index < 25; index += 1) {
      const intention = {
        version: 1 as const,
        type: index === 0 ? ("DRAW_START" as const) : ("DRAW_MOVE" as const),
        point: { x: 100 + index * 20, y: 200 + Math.sin(index) },
        timestampMs: index * 16,
      }
      controller.handle(intention)
    }
    controller.handle({
      version: 1,
      type: "DRAW_END",
      point: { x: 580, y: 200 },
      timestampMs: 400,
    })

    const assisted = controller.document.strokes[0]
    expect(assisted?.points).toHaveLength(2)
    expect(assisted?.assistance?.primitive).toBe("line")
    expect(feedback).toHaveBeenCalledWith(
      expect.objectContaining({ strokeId: "stroke-1", primitive: "line" }),
    )

    expect(controller.revertAssistance("stroke-1")).toBe(true)
    expect(controller.document.strokes[0]?.points).toHaveLength(25)
    expect(controller.document.strokes[0]?.assistance).toBeUndefined()
    expect(controller.revertAssistance("stroke-1")).toBe(false)
  })
})
