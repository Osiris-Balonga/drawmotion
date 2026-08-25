import { useState } from "react"

import {
  Activity,
  Check,
  ChevronDown,
  Circle,
  Eraser,
  MousePointer2,
  PenLine,
  Shapes,
} from "lucide-react"

import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { StrokeAssistanceMode } from "@/core/drawing/stroke-assistance"
import {
  drawingColors,
  type DrawingColor,
  type DrawingTool,
} from "@/features/toolbar/drawing-tools"
import { ToolButton } from "@/features/toolbar/tool-button"

type ToolRailProps = {
  activeTool: DrawingTool
  color: DrawingColor
  thickness: number
  assistanceMode: StrokeAssistanceMode
  onToolChange: (tool: DrawingTool) => void
  onColorChange: (color: DrawingColor) => void
  onThicknessChange: (thickness: number) => void
  onAssistanceModeChange: (mode: StrokeAssistanceMode) => void
}

const assistanceModes = [
  {
    value: "free",
    label: "Libre",
    description: "Respecte chaque mouvement sans correction de forme",
    Icon: PenLine,
  },
  {
    value: "stabilized",
    label: "Stabilisé",
    description: "Réduit les irrégularités sans transformer le dessin",
    Icon: Activity,
  },
  {
    value: "shapes",
    label: "Formes",
    description: "Régularise les lignes, cercles, ellipses et rectangles",
    Icon: Shapes,
  },
] as const

export function ToolRail({
  activeTool,
  color,
  thickness,
  assistanceMode,
  onToolChange,
  onColorChange,
  onThicknessChange,
  onAssistanceModeChange,
}: ToolRailProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      aria-label="Outils de dessin"
      className="tool-rail"
      data-collapsed={collapsed || undefined}
    >
      <div className="command-dock__group" aria-label="Outil actif">
        <ToolButton
          label="Pointeur"
          tooltipSide="top"
          variant={activeTool === "pointer" ? "default" : "ghost"}
          aria-pressed={activeTool === "pointer"}
          onClick={() => onToolChange("pointer")}
        >
          <MousePointer2 aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="Stylo"
          shortcut="P"
          tooltipSide="top"
          variant={activeTool === "pen" ? "default" : "ghost"}
          aria-pressed={activeTool === "pen"}
          onClick={() => onToolChange("pen")}
        >
          <PenLine aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="Gomme"
          shortcut="E"
          tooltipSide="top"
          variant={activeTool === "eraser" ? "default" : "ghost"}
          aria-pressed={activeTool === "eraser"}
          onClick={() => onToolChange("eraser")}
        >
          <Eraser aria-hidden="true" />
        </ToolButton>
      </div>

      <Separator orientation="vertical" className="command-dock__separator" />

      <Popover>
        <PopoverTrigger
          render={
            <ToolButton
              label={`Épaisseur ${thickness} pixels`}
              tooltipSide="top"
              variant="ghost"
              className="command-dock__thickness"
            >
              <span
                aria-hidden="true"
                className="drawing-thickness-preview"
                style={{ width: Math.min(22, thickness) }}
              />
              <span className="text-xs font-semibold">{thickness}</span>
            </ToolButton>
          }
        />
        <PopoverContent side="top" align="center" className="w-64 gap-4 p-4">
          <PopoverHeader>
            <PopoverTitle>Épaisseur du trait</PopoverTitle>
            <PopoverDescription>
              {thickness} pixels à la résolution de référence
            </PopoverDescription>
          </PopoverHeader>
          <Slider
            aria-label="Épaisseur du trait"
            min={2}
            max={24}
            step={2}
            value={[thickness]}
            onValueChange={(value) => {
              const nextThickness = typeof value === "number" ? value : value[0]

              if (nextThickness !== undefined) {
                onThicknessChange(nextThickness)
              }
            }}
          />
          <div
            className="grid grid-cols-4 gap-2"
            aria-label="Épaisseurs rapides"
          >
            {[4, 8, 12, 18].map((preset) => (
              <Button
                key={preset}
                type="button"
                size="sm"
                variant={thickness === preset ? "default" : "outline"}
                aria-pressed={thickness === preset}
                data-gesture-control=""
                onClick={() => onThicknessChange(preset)}
              >
                {preset} px
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="command-dock__extended">
        <Separator orientation="vertical" className="command-dock__separator" />
        <ToggleGroup
          value={[assistanceMode]}
          onValueChange={(nextValue) => {
            const nextMode = nextValue[0]
            if (nextMode) {
              onAssistanceModeChange(nextMode as StrokeAssistanceMode)
            }
          }}
          variant="default"
          size="sm"
          spacing={1}
          aria-label="Mode de précision"
          className="command-dock__precision"
        >
          {assistanceModes.map(({ value, label, description, Icon }) => (
            <ToggleGroupItem
              key={value}
              value={value}
              aria-label={`${label} — ${description}`}
              title={description}
              data-gesture-control=""
              className="command-dock__precision-option"
            >
              <Icon aria-hidden="true" />
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <Separator orientation="vertical" className="command-dock__separator" />
      </div>

      <div
        className="command-dock__colors command-dock__extended"
        aria-label="Couleurs du trait"
      >
        {drawingColors.map((drawingColor) => (
          <ToolButton
            key={drawingColor.value}
            label={drawingColor.name}
            tooltipSide="top"
            variant="ghost"
            aria-pressed={color === drawingColor.value}
            className="command-dock__color"
            onClick={() => {
              onColorChange(drawingColor.value)
              onToolChange("pen")
            }}
          >
            <span className="command-dock__color-swatch">
              <Circle
                aria-hidden="true"
                className={`${drawingColor.className} fill-current stroke-current`}
              />
              {color === drawingColor.value ? (
                <Check
                  aria-hidden="true"
                  className="command-dock__color-check"
                />
              ) : null}
            </span>
          </ToolButton>
        ))}
      </div>

      <Separator orientation="vertical" className="command-dock__separator" />
      <ToolButton
        label={collapsed ? "Déployer la palette" : "Réduire la palette"}
        tooltipSide="top"
        variant="ghost"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((value) => !value)}
      >
        <ChevronDown
          aria-hidden="true"
          className="command-dock__collapse-icon"
        />
      </ToolButton>
    </aside>
  )
}
