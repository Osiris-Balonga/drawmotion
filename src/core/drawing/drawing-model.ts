export type NormalizedPoint = {
  x: number
  y: number
  pressure?: number
}

export type StrokeTool = "pen" | "eraser"
export type StrokePattern = "solid" | "dashed" | "dotted"

export type AssistedPrimitive = "line" | "circle" | "ellipse" | "rectangle"

export type StrokeAssistance = {
  primitive: AssistedPrimitive
  confidence: number
  originalPoints: readonly NormalizedPoint[]
}

export type Stroke = {
  id: string
  tool: StrokeTool
  color: string
  width: number
  pattern?: StrokePattern
  points: readonly NormalizedPoint[]
  assistance?: StrokeAssistance
}

export type DrawingDocument = {
  strokes: readonly Stroke[]
}

export const emptyDrawingDocument: DrawingDocument = { strokes: [] }
