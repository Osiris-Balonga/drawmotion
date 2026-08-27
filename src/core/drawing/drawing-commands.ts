import type { DrawingDocument, NormalizedPoint, Stroke } from "./drawing-model"

export type DrawingCommand =
  | { type: "ADD_STROKE"; stroke: Stroke }
  | { type: "ERASE_AT"; point: NormalizedPoint; radius: number }
  | { type: "CLEAR" }

function distance(a: NormalizedPoint, b: NormalizedPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function strokeTouches(stroke: Stroke, point: NormalizedPoint, radius: number) {
  return stroke.points.some(
    (strokePoint) => distance(strokePoint, point) <= radius + stroke.width / 2,
  )
}

export function applyDrawingCommand(
  document: DrawingDocument,
  command: DrawingCommand,
): DrawingDocument {
  switch (command.type) {
    case "ADD_STROKE":
      return { strokes: [...document.strokes, command.stroke] }
    case "ERASE_AT": {
      const strokes = document.strokes.filter(
        (stroke) => !strokeTouches(stroke, command.point, command.radius),
      )
      return strokes.length === document.strokes.length ? document : { strokes }
    }
    case "CLEAR":
      return document.strokes.length === 0 ? document : { strokes: [] }
  }
}
