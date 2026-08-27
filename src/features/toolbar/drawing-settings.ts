import { t } from "@/i18n"

import type { StrokePattern } from "@/core/drawing/drawing-model"
import type { StrokeAssistanceMode } from "@/core/drawing/stroke-assistance"
import type { DrawingTool } from "@/features/toolbar/drawing-tools"

export const strokeThicknessPresets = [4, 8, 12, 18] as const
export const eraserThicknessPresets = [24, 40, 64, 96] as const

export const drawingStrokePatterns = [
  { value: "solid", label: t("tools.solid") },
  { value: "dashed", label: t("tools.dashed") },
  { value: "dotted", label: t("tools.dotted") },
] as const satisfies ReadonlyArray<{
  value: StrokePattern
  label: string
}>

export const drawingPrecisionModes = [
  { value: "free", label: t("tools.free") },
  { value: "stabilized", label: t("tools.stabilized") },
  { value: "shapes", label: t("tools.shapes") },
] as const satisfies ReadonlyArray<{
  value: StrokeAssistanceMode
  label: string
}>

export function thicknessPresetsForTool(tool: DrawingTool) {
  return tool === "eraser" ? eraserThicknessPresets : strokeThicknessPresets
}
