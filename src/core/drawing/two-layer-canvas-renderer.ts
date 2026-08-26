import type { CanvasPoint } from "@/core/geometry/coordinate-mapping"

import { initialCanvasViewport, type CanvasViewport } from "./canvas-viewport"
import type { DrawingDocument, Stroke } from "./drawing-model"
import { emptyDrawingDocument } from "./drawing-model"
import { canvasToPngBlob } from "./canvas-png-export"

type FrameScheduler = (callback: FrameRequestCallback) => number

export type CanvasRendererOptions = {
  devicePixelRatio?: () => number
  requestFrame?: FrameScheduler
  cancelFrame?: (handle: number) => void
}

export class TwoLayerCanvasRenderer {
  readonly #persistentCanvas: HTMLCanvasElement
  readonly #interactionCanvas: HTMLCanvasElement
  readonly #persistentContext: CanvasRenderingContext2D
  readonly #interactionContext: CanvasRenderingContext2D
  readonly #devicePixelRatio: () => number
  readonly #requestFrame: FrameScheduler
  readonly #cancelFrame: (handle: number) => void
  #document: DrawingDocument = emptyDrawingDocument
  #pointer: CanvasPoint | null = null
  #pointerVisible = true
  #previewStroke: Stroke | null = null
  #viewport: CanvasViewport = initialCanvasViewport
  #width = 0
  #height = 0
  #frameHandle: number | null = null

  constructor(
    persistentCanvas: HTMLCanvasElement,
    interactionCanvas: HTMLCanvasElement,
    options: CanvasRendererOptions = {},
  ) {
    const persistentContext = persistentCanvas.getContext("2d")
    const interactionContext = interactionCanvas.getContext("2d")
    if (!persistentContext || !interactionContext) {
      throw new Error("DrawMotion requires Canvas 2D support")
    }
    this.#persistentCanvas = persistentCanvas
    this.#interactionCanvas = interactionCanvas
    this.#persistentContext = persistentContext
    this.#interactionContext = interactionContext
    this.#devicePixelRatio =
      options.devicePixelRatio ?? (() => devicePixelRatio)
    this.#requestFrame =
      options.requestFrame ?? ((callback) => requestAnimationFrame(callback))
    this.#cancelFrame =
      options.cancelFrame ?? ((handle) => cancelAnimationFrame(handle))
  }

  resize(width: number, height: number) {
    this.#width = Math.max(0, width)
    this.#height = Math.max(0, height)
    const ratio = Math.max(1, this.#devicePixelRatio())
    for (const canvas of [this.#persistentCanvas, this.#interactionCanvas]) {
      canvas.width = Math.round(this.#width * ratio)
      canvas.height = Math.round(this.#height * ratio)
      canvas.style.width = `${this.#width}px`
      canvas.style.height = `${this.#height}px`
    }
    this.#persistentContext.setTransform(ratio, 0, 0, ratio, 0, 0)
    this.#interactionContext.setTransform(ratio, 0, 0, ratio, 0, 0)
    this.requestRender()
  }

  setDocument(document: DrawingDocument) {
    this.#document = document
    this.requestRender()
  }

  setPointer(point: CanvasPoint | null) {
    this.#pointer = point
    this.requestRender()
  }

  setPointerVisible(visible: boolean) {
    this.#pointerVisible = visible
    this.requestRender()
  }

  setPreviewStroke(stroke: Stroke | null) {
    this.#previewStroke = stroke
    this.requestRender()
  }

  setViewport(viewport: CanvasViewport) {
    this.#viewport = viewport
    this.requestRender()
  }

  toPngBlob() {
    this.#render()
    return canvasToPngBlob(this.#persistentCanvas)
  }

  requestRender() {
    if (this.#frameHandle !== null) return
    this.#frameHandle = this.#requestFrame(() => {
      this.#frameHandle = null
      this.#render()
    })
  }

  dispose() {
    if (this.#frameHandle !== null) {
      this.#cancelFrame(this.#frameHandle)
      this.#frameHandle = null
    }
  }

  #renderStroke(
    context: CanvasRenderingContext2D,
    stroke: Stroke,
    applyEraserComposite: boolean,
  ) {
    const [first, ...rest] = stroke.points
    if (!first) return
    context.save()
    context.globalCompositeOperation =
      applyEraserComposite && stroke.tool === "eraser"
        ? "destination-out"
        : "source-over"
    context.strokeStyle = stroke.color
    context.lineWidth =
      stroke.width * Math.min(this.#width, this.#height) * this.#viewport.zoom
    context.lineCap = "round"
    context.lineJoin = "round"
    const dashUnit = Math.max(2, context.lineWidth)
    context.setLineDash(
      stroke.pattern === "dashed"
        ? [dashUnit * 3, dashUnit * 2]
        : stroke.pattern === "dotted"
          ? [0, dashUnit * 2]
          : [],
    )

    if (rest.length === 0) {
      context.beginPath()
      const point = this.#toViewportPoint(first)
      context.arc(point.x, point.y, context.lineWidth / 2, 0, Math.PI * 2)
      context.fillStyle = stroke.color
      context.fill()
      context.restore()
      return
    }

    context.beginPath()
    const start = this.#toViewportPoint(first)
    context.moveTo(start.x, start.y)
    for (const [index, point] of rest.entries()) {
      const next = rest[index + 1]
      if (!next) {
        const end = this.#toViewportPoint(point)
        context.lineTo(end.x, end.y)
        continue
      }
      const control = this.#toViewportPoint(point)
      const midpoint = this.#toViewportPoint({
        x: (point.x + next.x) / 2,
        y: (point.y + next.y) / 2,
      })
      context.quadraticCurveTo(control.x, control.y, midpoint.x, midpoint.y)
    }
    context.stroke()
    context.restore()
  }

  #render() {
    this.#persistentContext.clearRect(0, 0, this.#width, this.#height)
    for (const stroke of this.#document.strokes) {
      this.#renderStroke(this.#persistentContext, stroke, true)
    }
    if (this.#previewStroke?.tool === "eraser") {
      this.#renderStroke(this.#persistentContext, this.#previewStroke, true)
    }

    this.#interactionContext.clearRect(0, 0, this.#width, this.#height)
    if (this.#previewStroke && this.#previewStroke.tool !== "eraser") {
      this.#renderStroke(this.#interactionContext, this.#previewStroke, false)
    }
    if (!this.#pointer || !this.#pointerVisible) return
    this.#interactionContext.beginPath()
    this.#interactionContext.arc(
      this.#pointer.x,
      this.#pointer.y,
      6,
      0,
      Math.PI * 2,
    )
    this.#interactionContext.fillStyle = "#7c3aed"
    this.#interactionContext.fill()
  }

  #toViewportPoint(point: CanvasPoint): CanvasPoint {
    return {
      x: point.x * this.#width * this.#viewport.zoom + this.#viewport.offsetX,
      y: point.y * this.#height * this.#viewport.zoom + this.#viewport.offsetY,
    }
  }
}
