import {
  initialCanvasViewport,
  MAX_CANVAS_ZOOM,
  MIN_CANVAS_ZOOM,
  type CanvasViewport,
} from "@/core/drawing/canvas-viewport"
import {
  emptyDrawingDocument,
  type DrawingDocument,
  type NormalizedPoint,
  type Stroke,
} from "@/core/drawing/drawing-model"

export const DRAWING_DRAFT_KEY = "drawmotion:drawing"
const MAX_DRAFT_LENGTH = 2_000_000

export type DrawingDraft = {
  document: DrawingDocument
  viewport: CanvasViewport
}

const emptyDraft: DrawingDraft = {
  document: emptyDrawingDocument,
  viewport: initialCanvasViewport,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isPoint(value: unknown): value is NormalizedPoint {
  return (
    isRecord(value) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    (value.pressure === undefined ||
      (isFiniteNumber(value.pressure) &&
        value.pressure >= 0 &&
        value.pressure <= 1))
  )
}

function isStroke(value: unknown): value is Stroke {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    value.id.length > 100 ||
    !value.id ||
    (value.tool !== "pen" && value.tool !== "eraser") ||
    typeof value.color !== "string" ||
    !/^#[\da-f]{6}$/i.test(value.color) ||
    !isFiniteNumber(value.width) ||
    value.width <= 0 ||
    value.width > 1 ||
    (value.pattern !== undefined &&
      (typeof value.pattern !== "string" ||
        !["solid", "dashed", "dotted"].includes(value.pattern))) ||
    !Array.isArray(value.points) ||
    value.points.length === 0 ||
    !value.points.every(isPoint)
  )
    return false
  if (value.assistance === undefined) return true
  const assistance = value.assistance
  return (
    isRecord(assistance) &&
    typeof assistance.primitive === "string" &&
    ["line", "circle", "ellipse", "rectangle"].includes(assistance.primitive) &&
    isFiniteNumber(assistance.confidence) &&
    assistance.confidence >= 0 &&
    assistance.confidence <= 1 &&
    Array.isArray(assistance.originalPoints) &&
    assistance.originalPoints.length > 0 &&
    assistance.originalPoints.every(isPoint)
  )
}

function isDraft(value: unknown): value is DrawingDraft & { version: 1 } {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !isRecord(value.document) ||
    !isRecord(value.viewport)
  )
    return false
  const { strokes } = value.document
  const { zoom, offsetX, offsetY } = value.viewport
  return (
    Array.isArray(strokes) &&
    strokes.every(isStroke) &&
    new Set(strokes.map((stroke) => stroke.id)).size === strokes.length &&
    isFiniteNumber(zoom) &&
    zoom >= MIN_CANVAS_ZOOM &&
    zoom <= MAX_CANVAS_ZOOM &&
    isFiniteNumber(offsetX) &&
    isFiniteNumber(offsetY)
  )
}

export function loadDrawingDraft(storage?: Pick<Storage, "getItem">): {
  draft: DrawingDraft
  failed: boolean
} {
  try {
    const raw = (storage ?? window.localStorage).getItem(DRAWING_DRAFT_KEY)
    if (raw === null) return { draft: emptyDraft, failed: false }
    if (raw.length > MAX_DRAFT_LENGTH)
      throw new Error("Drawing draft is too large")
    const parsed: unknown = JSON.parse(raw)
    if (!isDraft(parsed))
      throw new Error("Unsupported or damaged drawing draft")
    return {
      draft: { document: parsed.document, viewport: parsed.viewport },
      failed: false,
    }
  } catch {
    return { draft: emptyDraft, failed: true }
  }
}

// Only committed strokes and the viewport are saved, never video or landmarks.
// Call at document changes, not at camera-frame frequency.
export function saveDrawingDraft(
  draft: DrawingDraft,
  storage?: Pick<Storage, "setItem">,
): boolean {
  try {
    const raw = JSON.stringify({ version: 1, ...draft })
    if (raw.length > MAX_DRAFT_LENGTH) return false
    const target = storage ?? window.localStorage
    target.setItem(DRAWING_DRAFT_KEY, raw)
    return true
  } catch {
    return false
  }
}
