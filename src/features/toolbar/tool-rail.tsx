import { Circle, Eraser, MousePointer2, PenLine } from "lucide-react"

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
  onToolChange: (tool: DrawingTool) => void
  onColorChange: (color: DrawingColor) => void
  onThicknessChange: (thickness: number) => void
}

export function ToolRail({
  activeTool,
  color,
  thickness,
  onToolChange,
  onColorChange,
  onThicknessChange,
}: ToolRailProps) {
  return (
    <aside aria-label="Outils de dessin" className="tool-rail">
      <ToolButton
        label="Pointeur"
        variant={activeTool === "pointer" ? "default" : "ghost"}
        aria-pressed={activeTool === "pointer"}
        onClick={() => onToolChange("pointer")}
      >
        <MousePointer2 aria-hidden="true" />
      </ToolButton>
      <ToolButton
        label="Stylo"
        shortcut="P"
        variant={activeTool === "pen" ? "default" : "ghost"}
        aria-pressed={activeTool === "pen"}
        onClick={() => onToolChange("pen")}
      >
        <PenLine aria-hidden="true" />
      </ToolButton>
      <ToolButton
        label="Gomme"
        shortcut="E"
        variant={activeTool === "eraser" ? "default" : "ghost"}
        aria-pressed={activeTool === "eraser"}
        onClick={() => onToolChange("eraser")}
      >
        <Eraser aria-hidden="true" />
      </ToolButton>

      <Separator className="my-1 w-8" />

      <Popover>
        <PopoverTrigger
          render={
            <ToolButton label={`Épaisseur ${thickness} pixels`} variant="ghost">
              <span
                aria-hidden="true"
                className="drawing-thickness-preview"
                style={{ width: Math.min(22, thickness) }}
              />
            </ToolButton>
          }
        />
        <PopoverContent side="right" align="center" className="w-64 gap-4 p-4">
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

      <div
        className="mt-auto flex flex-col gap-2"
        aria-label="Couleurs du trait"
      >
        {drawingColors.map((drawingColor) => (
          <ToolButton
            key={drawingColor.value}
            label={drawingColor.name}
            variant="ghost"
            aria-pressed={color === drawingColor.value}
            onClick={() => {
              onColorChange(drawingColor.value)
              onToolChange("pen")
            }}
          >
            <Circle
              aria-hidden="true"
              className={`${drawingColor.className} fill-current stroke-current`}
            />
          </ToolButton>
        ))}
      </div>
    </aside>
  )
}
