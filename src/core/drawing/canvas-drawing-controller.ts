import type { DrawingIntention } from "@/core/gestures/drawing-intentions"
import type { CanvasBounds } from "@/core/geometry/coordinate-mapping"

import { initialCanvasViewport, type CanvasViewport } from "./canvas-viewport"
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
  type DrawingDocument,
  type AssistedPrimitive,
  type NormalizedPoint,
  type Stroke,
  type StrokePattern,
  type StrokeTool,
} from "./drawing-model"
import { assistStroke, type StrokeAssistanceMode } from "./stroke-assistance"
import { TwoLayerCanvasRenderer } from "./two-layer-canvas-renderer"

export type DrawingStyle = {
  tool: StrokeTool
  color: string
  width: number
  pattern?: StrokePattern
}

export type StrokeAssistanceFeedback = {
  strokeId: string
  primitive: AssistedPrimitive
  confidence: number
}

export type DrawingHistoryAvailability = {
  canUndo: boolean
  canRedo: boolean
  canClear: boolean
}

export class CanvasDrawingController {
  readonly #renderer: TwoLayerCanvasRenderer
  #history: DrawingHistory
  #bounds: CanvasBounds = { left: 0, top: 0, width: 1, height: 1 }
  #style: DrawingStyle = {
    tool: "pen",
    color: "#111111",
    width: 0.008,
    pattern: "solid",
  }
  #viewport: CanvasViewport = initialCanvasViewport
  #assistanceMode: StrokeAssistanceMode = "stabilized"
  #activeStroke: Stroke | null = null
  #nextStrokeId = 1
  readonly #usedStrokeIds: Set<string>
  #onAssistance: ((feedback: StrokeAssistanceFeedback) => void) | null = null
  #onHistoryChange:
    ((availability: DrawingHistoryAvailability) => void) | null = null

  constructor(
    renderer: TwoLayerCanvasRenderer,
    historyLimit = 50,
    document: DrawingDocument = emptyDrawingDocument,
  ) {
    this.#renderer = renderer
    this.#history = createDrawingHistory(document, historyLimit)
    this.#usedStrokeIds = new Set(document.strokes.map((stroke) => stroke.id))
  }

  get document() {
    return this.#history.present
  }

  get historyAvailability(): DrawingHistoryAvailability {
    return {
      canUndo: this.#history.past.length > 0,
      canRedo: this.#history.future.length > 0,
      canClear: this.#history.present.strokes.length > 0,
    }
  }

  setBounds(bounds: CanvasBounds) {
    this.#bounds = bounds
    this.#renderer.resize(bounds.width, bounds.height)
    this.#renderer.setDocument(this.#history.present)
  }

  setStyle(style: DrawingStyle) {
    this.#style = style
  }

  setViewport(viewport: CanvasViewport) {
    this.#finishStroke()
    this.#viewport = viewport
    this.#renderer.setViewport(viewport)
  }

  setAssistanceMode(mode: StrokeAssistanceMode) {
    this.#assistanceMode = mode
  }

  setAssistanceListener(
    listener: ((feedback: StrokeAssistanceFeedback) => void) | null,
  ) {
    this.#onAssistance = listener
  }

  setHistoryListener(
    listener: ((availability: DrawingHistoryAvailability) => void) | null,
  ) {
    this.#onHistoryChange = listener
    listener?.(this.historyAvailability)
  }

  handle(intention: DrawingIntention) {
    switch (intention.type) {
      case "POINTER_MOVE":
        this.#renderer.setPointer(this.#toLocalPoint(intention.point))
        break
      case "DRAW_START": {
        const point = this.#normalize(intention.point)
        while (this.#usedStrokeIds.has(`stroke-${this.#nextStrokeId}`))
          this.#nextStrokeId++
        const id = `stroke-${this.#nextStrokeId++}`
        this.#usedStrokeIds.add(id)
        this.#activeStroke = {
          id,
          ...this.#style,
          pattern:
            this.#style.tool === "eraser"
              ? "solid"
              : (this.#style.pattern ?? "solid"),
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
    this.#finishStroke()
    this.#history = undoDrawing(this.#history)
    this.#renderer.setDocument(this.#history.present)
    this.#emitHistoryChange()
  }

  redo() {
    this.#finishStroke()
    this.#history = redoDrawing(this.#history)
    this.#renderer.setDocument(this.#history.present)
    this.#emitHistoryChange()
  }

  clear() {
    this.#activeStroke = null
    this.#renderer.setPreviewStroke(null)
    const next = applyDrawingCommand(this.#history.present, { type: "CLEAR" })
    this.#history = recordDrawing(this.#history, next)
    this.#renderer.setDocument(this.#history.present)
    this.#emitHistoryChange()
  }

  exportPng() {
    this.#finishStroke()
    return this.#renderer.toPngBlob()
  }

  revertAssistance(strokeId: string) {
    const strokeIndex = this.#history.present.strokes.findIndex(
      (stroke) => stroke.id === strokeId && stroke.assistance,
    )
    if (strokeIndex < 0) return false
    const stroke = this.#history.present.strokes[strokeIndex]
    if (!stroke?.assistance) return false
    const { assistance, ...unassistedStroke } = stroke
    const strokes = [...this.#history.present.strokes]
    strokes[strokeIndex] = {
      ...unassistedStroke,
      points: assistance.originalPoints,
    }
    this.#history = recordDrawing(this.#history, { strokes })
    this.#renderer.setDocument(this.#history.present)
    this.#emitHistoryChange()
    return true
  }

  #finishStroke() {
    if (!this.#activeStroke) return
    const assisted = assistStroke(
      this.#activeStroke,
      {
        ...this.#bounds,
        width: this.#bounds.width * this.#viewport.zoom,
        height: this.#bounds.height * this.#viewport.zoom,
      },
      this.#assistanceMode,
    )
    const next = applyDrawingCommand(this.#history.present, {
      type: "ADD_STROKE",
      stroke: assisted.stroke,
    })
    this.#history = recordDrawing(this.#history, next)
    this.#activeStroke = null
    this.#renderer.setPreviewStroke(null)
    this.#renderer.setDocument(this.#history.present)
    this.#emitHistoryChange()
    if (assisted.correction) {
      this.#onAssistance?.({
        strokeId: assisted.stroke.id,
        ...assisted.correction,
      })
    }
  }

  #emitHistoryChange() {
    this.#onHistoryChange?.(this.historyAvailability)
  }

  #toLocalPoint(point: { x: number; y: number }) {
    return { x: point.x - this.#bounds.left, y: point.y - this.#bounds.top }
  }

  #normalize(point: { x: number; y: number }): NormalizedPoint {
    return {
      x:
        (point.x - this.#bounds.left - this.#viewport.offsetX) /
        (this.#bounds.width * this.#viewport.zoom),
      y:
        (point.y - this.#bounds.top - this.#viewport.offsetY) /
        (this.#bounds.height * this.#viewport.zoom),
    }
  }
}
