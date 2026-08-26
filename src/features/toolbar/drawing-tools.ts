export const drawingColors = [
  { name: "Encre", value: "#17171c", className: "text-canvas-foreground" },
  { name: "Violet", value: "#7c3aed", className: "text-primary" },
  { name: "Vert", value: "#238554", className: "text-success" },
  { name: "Orange", value: "#a46c1f", className: "text-warning" },
] as const

export type DrawingColor = string
export type DrawingTool = "pointer" | "pen" | "eraser"

export function isPresetDrawingColor(color: DrawingColor) {
  return drawingColors.some((preset) => preset.value === color)
}
