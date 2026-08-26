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
      aria-label="Navigation de la toile"
      className="canvas-viewport-controls"
    >
      <ToolButton
        label="Dézoomer"
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
        aria-label="Réinitialiser la vue"
        title="Réinitialiser la vue"
        onClick={onReset}
      >
        {Math.round(zoom * 100)}%
      </button>
      <ToolButton
        label="Zoomer"
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
