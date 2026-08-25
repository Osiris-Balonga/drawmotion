export type NormalizedPoint = {
  x: number
  y: number
  pressure?: number
}

export type StrokeTool = "pen" | "eraser"

export type Stroke = {
  id: string
  tool: StrokeTool
  color: string
  width: number
  points: readonly NormalizedPoint[]
}

export type DrawingDocument = {
  strokes: readonly Stroke[]
}

export const emptyDrawingDocument: DrawingDocument = { strokes: [] }

export function isNormalizedPoint(point: NormalizedPoint) {
  return point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1
}
