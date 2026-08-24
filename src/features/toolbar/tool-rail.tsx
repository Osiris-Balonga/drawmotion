import { Circle, Eraser, Minus, MousePointer2, PenLine } from "lucide-react"

import { Separator } from "@/components/ui/separator"
import { ToolButton } from "@/features/toolbar/tool-button"

export type DrawingTool = "pointer" | "pen" | "eraser"

type ToolRailProps = {
  activeTool: DrawingTool
  onToolChange: (tool: DrawingTool) => void
}

const colors = [
  { name: "Encre", className: "text-canvas-foreground" },
  { name: "Violet", className: "text-primary" },
  { name: "Vert", className: "text-success" },
  { name: "Orange", className: "text-warning" },
]

export function ToolRail({ activeTool, onToolChange }: ToolRailProps) {
  return (
    <aside
      aria-label="Outils de dessin simulés"
      className="border-border bg-shell-raised flex min-h-0 flex-col items-center gap-2 rounded-xl border py-3"
    >
      <ToolButton
        label="Pointeur simulé"
        variant={activeTool === "pointer" ? "default" : "ghost"}
        aria-pressed={activeTool === "pointer"}
        onClick={() => onToolChange("pointer")}
      >
        <MousePointer2 aria-hidden="true" />
      </ToolButton>
      <ToolButton
        label="Stylo simulé"
        shortcut="P"
        variant={activeTool === "pen" ? "default" : "ghost"}
        aria-pressed={activeTool === "pen"}
        onClick={() => onToolChange("pen")}
      >
        <PenLine aria-hidden="true" />
      </ToolButton>
      <ToolButton
        label="Gomme simulée"
        shortcut="E"
        variant={activeTool === "eraser" ? "default" : "ghost"}
        aria-pressed={activeTool === "eraser"}
        onClick={() => onToolChange("eraser")}
      >
        <Eraser aria-hidden="true" />
      </ToolButton>

      <Separator className="my-1 w-8" />

      <ToolButton
        label="Épaisseur — bientôt disponible"
        variant="ghost"
        disabled
      >
        <Minus aria-hidden="true" className="stroke-[3]" />
      </ToolButton>

      <div
        className="mt-auto flex flex-col gap-2"
        aria-label="Couleurs simulées"
      >
        {colors.map((color, index) => (
          <ToolButton
            key={color.name}
            label={`${color.name} — sélection simulée`}
            variant="ghost"
            aria-pressed={index === 0}
            disabled={index !== 0}
          >
            <Circle
              aria-hidden="true"
              className={`${color.className} fill-current stroke-current`}
            />
          </ToolButton>
        ))}
      </div>
    </aside>
  )
}
