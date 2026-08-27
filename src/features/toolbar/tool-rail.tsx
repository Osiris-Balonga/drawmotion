import { t } from "@/i18n"

import { useEffect, useState } from "react"

import {
  Activity,
  BookOpen,
  Check,
  ChevronDown,
  Circle,
  Eraser,
  MousePointer2,
  Menu,
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
import type { StrokePattern } from "@/core/drawing/drawing-model"
import { CustomColorPicker } from "@/features/toolbar/custom-color-picker"
import {
  drawingPrecisionModes,
  drawingStrokePatterns,
  thicknessPresetsForTool,
} from "@/features/toolbar/drawing-settings"
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
  strokePattern: StrokePattern
  assistanceMode: StrokeAssistanceMode
  onToolChange: (tool: DrawingTool) => void
  onColorChange: (color: DrawingColor) => void
  onThicknessChange: (thickness: number) => void
  onStrokePatternChange: (pattern: StrokePattern) => void
  onAssistanceModeChange: (mode: StrokeAssistanceMode) => void
  onReplayOnboarding: () => void
  onOpenGestureCommands: () => void
}

const compactDockMediaQuery = "(max-width: 80rem)"

const precisionModeDetails = {
  free: {
    description: t("tools.freeDescription"),
    Icon: PenLine,
  },
  stabilized: {
    description: t("tools.stabilizedDescription"),
    Icon: Activity,
  },
  shapes: {
    description: t("tools.shapesDescription"),
    Icon: Shapes,
  },
} as const

export function ToolRail({
  activeTool,
  color,
  thickness,
  strokePattern,
  assistanceMode,
  onToolChange,
  onColorChange,
  onThicknessChange,
  onStrokePatternChange,
  onAssistanceModeChange,
  onReplayOnboarding,
  onOpenGestureCommands,
}: ToolRailProps) {
  const [collapsed, setCollapsed] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia(compactDockMediaQuery).matches,
  )

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return
    const media = window.matchMedia(compactDockMediaQuery)
    const handleChange = (event: MediaQueryListEvent) => {
      setCollapsed(event.matches)
    }
    media.addEventListener("change", handleChange)
    return () => media.removeEventListener("change", handleChange)
  }, [])

  const isEraser = activeTool === "eraser"
  const thicknessPresets = thicknessPresetsForTool(activeTool)
  const thicknessLabel = isEraser
    ? t("tools.eraserSize")
    : t("tools.strokeWidth")
  const thicknessButtonLabel = isEraser
    ? t("tools.eraserSizeLabel", { count: thickness })
    : t("tools.widthLabel", { count: thickness })
  const thicknessMinimum = isEraser ? 16 : 2
  const thicknessMaximum = isEraser ? 112 : 24
  const thicknessStep = isEraser ? 8 : 2

  return (
    <aside
      aria-label={t("tools.label")}
      className="tool-rail"
      data-collapsed={collapsed || undefined}
    >
      <div className="command-dock__group" aria-label={t("tools.active")}>
        <ToolButton
          label={t("tools.pointer")}
          className="command-dock__tool"
          tooltipSide="top"
          variant={activeTool === "pointer" ? "default" : "ghost"}
          aria-pressed={activeTool === "pointer"}
          onClick={() => onToolChange("pointer")}
        >
          <MousePointer2 aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label={t("tools.pen")}
          className="command-dock__tool"
          shortcut="P"
          tooltipSide="top"
          variant={activeTool === "pen" ? "default" : "ghost"}
          aria-pressed={activeTool === "pen"}
          onClick={() => onToolChange("pen")}
        >
          <PenLine aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label={t("tools.eraser")}
          className="command-dock__tool"
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
              label={thicknessButtonLabel}
              tooltipSide="top"
              variant="ghost"
              className="command-dock__thickness"
              data-onboarding-target="thickness"
            >
              <span
                aria-hidden="true"
                className="drawing-thickness-preview"
                data-tool={isEraser ? "eraser" : "pen"}
                data-pattern={strokePattern}
                style={{
                  width: isEraser
                    ? Math.min(24, Math.max(12, thickness / 3))
                    : Math.min(24, Math.max(12, thickness + 8)),
                  borderTopWidth: isEraser ? 0 : Math.max(2, thickness / 4),
                  color: isEraser ? "currentColor" : color,
                  height: isEraser
                    ? Math.min(16, Math.max(6, thickness / 5))
                    : 0,
                }}
              />
              <span className="text-xs font-semibold">{thickness}</span>
            </ToolButton>
          }
        />
        <PopoverContent side="top" align="center" className="w-72 gap-4 p-4">
          <PopoverHeader>
            <PopoverTitle>{thicknessLabel}</PopoverTitle>
            <PopoverDescription>
              {t("tools.referencePixels", { count: thickness })}
            </PopoverDescription>
          </PopoverHeader>
          <Slider
            aria-label={thicknessLabel}
            min={thicknessMinimum}
            max={thicknessMaximum}
            step={thicknessStep}
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
            aria-label={t("tools.widthPresets")}
          >
            {thicknessPresets.map((preset) => (
              <Button
                key={preset}
                type="button"
                size="sm"
                variant={thickness === preset ? "default" : "outline"}
                aria-pressed={thickness === preset}
                onClick={() => onThicknessChange(preset)}
              >
                {preset} px
              </Button>
            ))}
          </div>
          {!isEraser ? (
            <div className="stroke-pattern-field">
              <span className="stroke-pattern-field__label">
                {t("tools.strokeStyle")}
              </span>
              <ToggleGroup
                value={[strokePattern]}
                onValueChange={(nextValue) => {
                  const nextPattern = nextValue[0]
                  if (nextPattern) {
                    onStrokePatternChange(nextPattern as StrokePattern)
                  }
                }}
                variant="outline"
                size="sm"
                spacing={1}
                aria-label={t("tools.strokeStyle")}
                className="w-full"
              >
                {drawingStrokePatterns.map((pattern) => (
                  <ToggleGroupItem
                    key={pattern.value}
                    value={pattern.value}
                    aria-label={pattern.label}
                    title={pattern.label}
                    className="stroke-pattern-option"
                  >
                    <span
                      aria-hidden="true"
                      className="stroke-pattern-option__preview"
                      data-pattern={pattern.value}
                    />
                    <span className="sr-only">{pattern.label}</span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>

      <div
        className="command-dock__extended"
        aria-hidden={collapsed || undefined}
      >
        <div className="command-dock__extended-inner">
          <Separator
            orientation="vertical"
            className="command-dock__separator"
          />
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
            aria-label={t("tools.precisionMode")}
            className="command-dock__precision"
          >
            {drawingPrecisionModes.map(({ value, label }) => {
              const { description, Icon } = precisionModeDetails[value]
              return (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  aria-label={`${label} — ${description}`}
                  title={description}
                  data-onboarding-target={
                    value === "shapes" ? "shapes" : undefined
                  }
                  className="command-dock__precision-option"
                >
                  <Icon aria-hidden="true" />
                  {label}
                </ToggleGroupItem>
              )
            })}
          </ToggleGroup>

          <Separator
            orientation="vertical"
            className="command-dock__separator"
          />
          <div
            className="command-dock__colors"
            aria-label={t("tools.strokeColors")}
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
                <span
                  className="command-dock__color-swatch"
                  data-onboarding-target={
                    drawingColor.value === "#238554" ? "color" : undefined
                  }
                >
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
            <CustomColorPicker
              color={color}
              onColorChange={(nextColor) => {
                onColorChange(nextColor)
                onToolChange("pen")
              }}
            />
          </div>
        </div>
      </div>

      <Separator orientation="vertical" className="command-dock__separator" />
      <ToolButton
        label={t("commands.open")}
        shortcut="M"
        tooltipSide="top"
        variant="ghost"
        onClick={onOpenGestureCommands}
      >
        <Menu aria-hidden="true" />
      </ToolButton>
      <ToolButton
        label={t("tutorial.replay")}
        tooltipSide="top"
        variant="ghost"
        onClick={() => {
          setCollapsed(true)
          onReplayOnboarding()
        }}
      >
        <BookOpen aria-hidden="true" />
      </ToolButton>
      <ToolButton
        label={collapsed ? t("tools.expand") : t("tools.collapse")}
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
