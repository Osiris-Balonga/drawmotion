import { t } from "@/i18n"

import { useState } from "react"

import {
  Activity,
  ArrowLeft,
  Check,
  Eraser,
  Palette,
  PenLine,
  Undo2,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import type { StrokePattern } from "@/core/drawing/drawing-model"
import type { StrokeAssistanceMode } from "@/core/drawing/stroke-assistance"
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

type GesturePalettePage = "root" | "color" | "stroke" | "precision"

type GestureCommandPaletteProps = {
  anchor: { x: number; y: number }
  activeTool: DrawingTool
  color: DrawingColor
  thickness: number
  pattern: StrokePattern
  assistanceMode: StrokeAssistanceMode
  onColorChange: (color: DrawingColor) => void
  onThicknessChange: (thickness: number) => void
  onPatternChange: (pattern: StrokePattern) => void
  onAssistanceModeChange: (mode: StrokeAssistanceMode) => void
  onUndo: () => void
  onClose: () => void
}

export function GestureCommandPalette({
  anchor,
  activeTool,
  color,
  thickness,
  pattern,
  assistanceMode,
  onColorChange,
  onThicknessChange,
  onPatternChange,
  onAssistanceModeChange,
  onUndo,
  onClose,
}: GestureCommandPaletteProps) {
  const [page, setPage] = useState<GesturePalettePage>("root")
  const isEraser = activeTool === "eraser"
  const thicknesses = thicknessPresetsForTool(activeTool)

  const selectAndClose = (action: () => void) => {
    action()
    onClose()
  }

  return (
    <section
      aria-label={t("commands.label")}
      className="gesture-command-palette"
      style={{ left: anchor.x, top: anchor.y }}
    >
      <header className="gesture-command-palette__header">
        {page === "root" ? (
          <span>{t("commands.title")}</span>
        ) : (
          <Button
            aria-label={t("commands.back")}
            data-gesture-palette-control=""
            size="icon-sm"
            variant="ghost"
            onClick={() => setPage("root")}
          >
            <ArrowLeft aria-hidden="true" />
          </Button>
        )}
        <span className="gesture-command-palette__hint">
          {t("commands.hint")}
        </span>
        <Button
          aria-label={t("commands.close")}
          data-gesture-palette-control=""
          size="icon-sm"
          variant="ghost"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </Button>
      </header>

      {page === "root" ? (
        <div className="gesture-command-palette__grid">
          <PaletteButton
            label={t("commands.color")}
            Icon={Palette}
            onClick={() => setPage("color")}
          />
          <PaletteButton
            label={isEraser ? t("tools.eraser") : t("commands.stroke")}
            Icon={isEraser ? Eraser : PenLine}
            onClick={() => setPage("stroke")}
          />
          <PaletteButton
            label={t("tools.precision")}
            Icon={Activity}
            onClick={() => setPage("precision")}
          />
          <PaletteButton
            label={t("history.undo")}
            Icon={Undo2}
            onClick={() => selectAndClose(onUndo)}
          />
        </div>
      ) : null}

      {page === "color" ? (
        <div
          className="gesture-command-palette__choices gesture-command-palette__choices--colors"
          aria-label={t("commands.colors")}
        >
          {drawingColors.map((drawingColor) => (
            <Button
              key={drawingColor.value}
              aria-label={drawingColor.name}
              aria-pressed={color === drawingColor.value}
              className="gesture-command-palette__choice gesture-command-palette__color"
              data-gesture-palette-control=""
              variant="ghost"
              onClick={() =>
                selectAndClose(() => onColorChange(drawingColor.value))
              }
            >
              <span
                aria-hidden="true"
                className={`${drawingColor.className} gesture-command-palette__swatch`}
              />
              <span>{drawingColor.name}</span>
              {color === drawingColor.value ? (
                <Check aria-hidden="true" />
              ) : null}
            </Button>
          ))}
        </div>
      ) : null}

      {page === "stroke" ? (
        <div className="gesture-command-palette__stroke">
          <div
            className="gesture-command-palette__choices gesture-command-palette__choices--thickness"
            aria-label={
              isEraser ? t("tools.eraserSize") : t("tools.strokeWidth")
            }
          >
            {thicknesses.map((value) => (
              <Button
                key={value}
                aria-label={t("tools.pixels", { count: value })}
                aria-pressed={thickness === value}
                className="gesture-command-palette__choice"
                data-gesture-palette-control=""
                variant="ghost"
                onClick={() => selectAndClose(() => onThicknessChange(value))}
              >
                <span
                  aria-hidden="true"
                  className="gesture-command-palette__weight"
                  style={{ height: Math.max(2, value / 2) }}
                />
                <span>{value} px</span>
              </Button>
            ))}
          </div>
          {!isEraser ? (
            <div
              className="gesture-command-palette__choices"
              aria-label={t("tools.strokeStyle")}
            >
              {drawingStrokePatterns.map((option) => (
                <Button
                  key={option.value}
                  aria-label={option.label}
                  aria-pressed={pattern === option.value}
                  className="gesture-command-palette__choice"
                  data-gesture-palette-control=""
                  variant="ghost"
                  onClick={() =>
                    selectAndClose(() => onPatternChange(option.value))
                  }
                >
                  <span
                    aria-hidden="true"
                    className="gesture-command-palette__pattern"
                    data-pattern={option.value}
                  />
                  <span>{option.label}</span>
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {page === "precision" ? (
        <div
          className="gesture-command-palette__choices"
          aria-label={t("tools.precision")}
        >
          {drawingPrecisionModes.map((mode) => (
            <Button
              key={mode.value}
              aria-label={mode.label}
              aria-pressed={assistanceMode === mode.value}
              className="gesture-command-palette__choice"
              data-gesture-palette-control=""
              variant="ghost"
              onClick={() =>
                selectAndClose(() => onAssistanceModeChange(mode.value))
              }
            >
              <Activity aria-hidden="true" />
              <span>{mode.label}</span>
              {assistanceMode === mode.value ? (
                <Check aria-hidden="true" />
              ) : null}
            </Button>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function PaletteButton({
  label,
  Icon,
  onClick,
}: {
  label: string
  Icon: typeof Palette
  onClick: () => void
}) {
  return (
    <Button
      className="gesture-command-palette__action"
      data-gesture-palette-control=""
      variant="ghost"
      onClick={onClick}
    >
      <Icon aria-hidden="true" />
      <span>{label}</span>
    </Button>
  )
}
