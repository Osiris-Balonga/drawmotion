import { t } from "@/i18n"

export const drawingColors = [
  {
    name: t("colors.ink"),
    value: "#17171c",
    className: "text-canvas-foreground",
  },
  { name: t("colors.purple"), value: "#7c3aed", className: "text-primary" },
  { name: t("colors.green"), value: "#238554", className: "text-success" },
  { name: t("colors.orange"), value: "#a46c1f", className: "text-warning" },
] as const

export type DrawingColor = string
export type DrawingTool = "pointer" | "pen" | "eraser"

export function isPresetDrawingColor(color: DrawingColor) {
  return drawingColors.some((preset) => preset.value === color)
}
