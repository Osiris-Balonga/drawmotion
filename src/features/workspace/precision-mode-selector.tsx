import { Activity, PenLine, Shapes } from "lucide-react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { StrokeAssistanceMode } from "@/core/drawing/stroke-assistance"

type PrecisionModeSelectorProps = {
  value: StrokeAssistanceMode
  onValueChange: (value: StrokeAssistanceMode) => void
}

const modes = [
  {
    value: "free",
    label: "Libre",
    description: "Respecte chaque mouvement sans correction de forme",
    icon: PenLine,
  },
  {
    value: "stabilized",
    label: "Stabilisé",
    description: "Réduit les irrégularités sans transformer le dessin",
    icon: Activity,
  },
  {
    value: "shapes",
    label: "Formes",
    description: "Régularise les lignes, cercles, ellipses et rectangles",
    icon: Shapes,
  },
] as const

export function PrecisionModeSelector({
  value,
  onValueChange,
}: PrecisionModeSelectorProps) {
  return (
    <div className="precision-mode" aria-label="Assistance au dessin">
      <span className="precision-mode__label">Précision</span>
      <ToggleGroup
        value={[value]}
        onValueChange={(nextValue) => {
          const nextMode = nextValue[0]
          if (nextMode) onValueChange(nextMode as StrokeAssistanceMode)
        }}
        variant="default"
        size="sm"
        spacing={0}
        aria-label="Mode de précision"
      >
        {modes.map((mode) => {
          const Icon = mode.icon
          return (
            <ToggleGroupItem
              key={mode.value}
              value={mode.value}
              aria-label={`${mode.label} — ${mode.description}`}
              title={mode.description}
              className="precision-mode__option"
            >
              <Icon aria-hidden="true" />
              {mode.label}
            </ToggleGroupItem>
          )
        })}
      </ToggleGroup>
    </div>
  )
}
