import type { DrawingIntention } from "@/core/gestures/drawing-intentions"
import type { CanvasBounds } from "@/core/geometry/coordinate-mapping"

import { applyDrawingCommand } from "./drawing-commands"
import {
  createDrawingHistory,
  recordDrawing,
  redoDrawing,
  undoDrawing,
  type DrawingHistory,
} from "./drawing-history"
import {
  emptyDrawingDocument,
  type NormalizedPoint,
  type Stroke,
  type StrokeTool,
} from "./drawing-model"
import { TwoLayerCanvasRenderer } from "./two-layer-canvas-renderer"

export type DrawingStyle = {
  tool: StrokeTool
  color: string
  width: number
}

export class CanvasDrawingController {
  readonly #renderer: TwoLayerCanvasRenderer
  #history: DrawingHistory
  #bounds: CanvasBounds = { left: 0, top: 0, width: 1, height: 1 }
  #style: DrawingStyle = { tool: "pen", color: "#111111", width: 0.008 }
  #activeStroke: Stroke | null = null
  #nextStrokeId = 1

  constructor(renderer: TwoLayerCanvasRenderer, historyLimit = 50) {
    this.#renderer = renderer
    this.#history = createDrawingHistory(emptyDrawingDocument, historyLimit)
  }

  get document() {
    return this.#history.present
  }

  setBounds(bounds: CanvasBounds) {
    this.#bounds = bounds
    this.#renderer.resize(bounds.width, bounds.height)
    this.#renderer.setDocument(this.#history.present)
  }

  setStyle(style: DrawingStyle) {
    this.#style = style
  }

  handle(intention: DrawingIntention) {
    switch (intention.type) {
      case "POINTER_MOVE":
        this.#renderer.setPointer(this.#toLocalPoint(intention.point))
        break
      case "DRAW_START": {
        const point = this.#normalize(intention.point)
        this.#activeStroke = {
          id: `stroke-${this.#nextStrokeId++}`,
          ...this.#style,
          points: [point],
        }
        this.#renderer.setPreviewStroke(this.#activeStroke)
        break
      }
      case "DRAW_MOVE":
        if (this.#activeStroke) {
          this.#activeStroke = {
            ...this.#activeStroke,
            points: [
              ...this.#activeStroke.points,
              this.#normalize(intention.point),
            ],
          }
          this.#renderer.setPreviewStroke(this.#activeStroke)
        }
        break
      case "DRAW_END":
      case "PAUSE":
      case "TRACKING_LOST":
        this.#finishStroke()
        if (intention.type === "TRACKING_LOST") {
          this.#renderer.setPointer(null)
        }
        break
    }
  }

  undo() {
    this.#history = undoDrawing(this.#history)
    this.#renderer.setDocument(this.#history.present)
  }

  redo() {
    this.#history = redoDrawing(this.#history)
    this.#renderer.setDocument(this.#history.present)
  }

  #finishStroke() {
    if (!this.#activeStroke) return
    const next = applyDrawingCommand(this.#history.present, {
      type: "ADD_STROKE",
      stroke: this.#activeStroke,
    })
    this.#history = recordDrawing(this.#history, next)
    this.#activeStroke = null
    this.#renderer.setPreviewStroke(null)
    this.#renderer.setDocument(this.#history.present)
  }

  #toLocalPoint(point: { x: number; y: number }) {
    return { x: point.x - this.#bounds.left, y: point.y - this.#bounds.top }
  }

  #normalize(point: { x: number; y: number }): NormalizedPoint {
    return {
      x: Math.min(
        1,
        Math.max(0, (point.x - this.#bounds.left) / this.#bounds.width),
      ),
      y: Math.min(
        1,
        Math.max(0, (point.y - this.#bounds.top) / this.#bounds.height),
      ),
    }
  }
}
