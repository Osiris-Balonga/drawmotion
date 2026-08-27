import { t } from "@/i18n"

import { Minus, Plus } from "lucide-react"

import { ToolButton } from "@/features/toolbar/tool-button"

type CanvasViewportControlsProps = {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

export function CanvasViewportControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
}: CanvasViewportControlsProps) {
  return (
    <aside
      aria-label={t("viewport.label")}
      className="canvas-viewport-controls"
    >
      <ToolButton
        label={t("viewport.zoomOut")}
        shortcut="−"
        tooltipSide="top"
        variant="ghost"
        onClick={onZoomOut}
      >
        <Minus aria-hidden="true" />
      </ToolButton>
      <button
        type="button"
        className="canvas-viewport-controls__value"
        aria-label={t("viewport.reset")}
        title={t("viewport.reset")}
        onClick={onReset}
      >
        {Math.round(zoom * 100)}%
      </button>
      <ToolButton
        label={t("viewport.zoomIn")}
        shortcut="+"
        tooltipSide="top"
        variant="ghost"
        onClick={onZoomIn}
      >
        <Plus aria-hidden="true" />
      </ToolButton>
    </aside>
  )
}
