import type { StrokePattern } from "@/core/drawing/drawing-model"
import type { StrokeAssistanceMode } from "@/core/drawing/stroke-assistance"
import type { DrawingTool } from "@/features/toolbar/drawing-tools"

export const strokeThicknessPresets = [4, 8, 12, 18] as const
export const eraserThicknessPresets = [24, 40, 64, 96] as const

export const drawingStrokePatterns = [
  { value: "solid", label: "Continu" },
  { value: "dashed", label: "Tirets" },
  { value: "dotted", label: "Pointillé" },
] as const satisfies ReadonlyArray<{
  value: StrokePattern
  label: string
}>

export const drawingPrecisionModes = [
  { value: "free", label: "Libre" },
  { value: "stabilized", label: "Stabilisé" },
  { value: "shapes", label: "Formes" },
] as const satisfies ReadonlyArray<{
  value: StrokeAssistanceMode
  label: string
}>

export function thicknessPresetsForTool(tool: DrawingTool) {
  return tool === "eraser" ? eraserThicknessPresets : strokeThicknessPresets
}
