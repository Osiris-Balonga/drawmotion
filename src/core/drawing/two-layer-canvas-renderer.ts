import type { CanvasPoint } from "@/core/geometry/coordinate-mapping"

import type { DrawingDocument, Stroke } from "./drawing-model"
import { emptyDrawingDocument } from "./drawing-model"

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
    this.#requestFrame = options.requestFrame ?? requestAnimationFrame
    this.#cancelFrame = options.cancelFrame ?? cancelAnimationFrame
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

  #renderStroke(stroke: Stroke) {
    const [first, ...rest] = stroke.points
    if (!first) return
    const context = this.#persistentContext
    context.save()
    context.globalCompositeOperation =
      stroke.tool === "eraser" ? "destination-out" : "source-over"
    context.strokeStyle = stroke.color
    context.lineWidth = stroke.width * Math.min(this.#width, this.#height)
    context.lineCap = "round"
    context.lineJoin = "round"
    context.beginPath()
    context.moveTo(first.x * this.#width, first.y * this.#height)
    for (const point of rest) {
      context.lineTo(point.x * this.#width, point.y * this.#height)
    }
    context.stroke()
    context.restore()
  }

  #render() {
    this.#persistentContext.clearRect(0, 0, this.#width, this.#height)
    for (const stroke of this.#document.strokes) this.#renderStroke(stroke)

    this.#interactionContext.clearRect(0, 0, this.#width, this.#height)
    if (!this.#pointer) return
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
}
