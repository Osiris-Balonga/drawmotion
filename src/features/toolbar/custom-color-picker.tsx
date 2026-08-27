import { t } from "@/i18n"

import {
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react"

import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  hexToRgb,
  hslToRgb,
  normalizeHex,
  rgbToHex,
  rgbToHsl,
  type HslColor,
  type RgbColor,
} from "@/features/toolbar/color-conversion"
import {
  isPresetDrawingColor,
  type DrawingColor,
} from "@/features/toolbar/drawing-tools"
import { ToolButton } from "@/features/toolbar/tool-button"

type CustomColorPickerProps = {
  color: DrawingColor
  onColorChange: (color: DrawingColor) => void
}

const fallbackColor = "#7C3AED"

function colorDraft(color: DrawingColor) {
  const hex = normalizeHex(color) ?? fallbackColor
  const rgb = hexToRgb(hex) ?? { r: 124, g: 58, b: 237 }
  return { hex, hsl: rgbToHsl(rgb) }
}

export function CustomColorPicker({
  color,
  onColorChange,
}: CustomColorPickerProps) {
  const initial = colorDraft(color)
  const [open, setOpen] = useState(false)
  const [hex, setHex] = useState(initial.hex)
  const [hsl, setHsl] = useState(initial.hsl)
  const customActive = !isPresetDrawingColor(color)
  const rgb = hslToRgb(hsl)

  const updateHsl = (next: HslColor) => {
    setHsl(next)
    setHex(rgbToHex(hslToRgb(next)))
  }

  const updateFromWheel = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const radius = bounds.width / 2
    const x = event.clientX - bounds.left - radius
    const y = event.clientY - bounds.top - radius
    const saturation = Math.min(100, (Math.hypot(x, y) / radius) * 100)
    const hue = (Math.atan2(y, x) * 180) / Math.PI
    updateHsl({ ...hsl, h: (hue + 360) % 360, s: saturation })
  }

  const updateRgbChannel = (channel: keyof RgbColor, value: string) => {
    const numeric = Number.parseInt(value, 10)
    if (!Number.isFinite(numeric)) return
    const nextRgb = { ...rgb, [channel]: Math.min(255, Math.max(0, numeric)) }
    const nextHex = rgbToHex(nextRgb)
    setHex(nextHex)
    setHsl(rgbToHsl(nextRgb))
  }

  const handleWheelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = event.shiftKey ? 10 : 3
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault()
      updateHsl({
        ...hsl,
        h: (hsl.h + (event.key === "ArrowLeft" ? -delta : delta) + 360) % 360,
      })
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault()
      updateHsl({
        ...hsl,
        s: Math.min(
          100,
          Math.max(0, hsl.s + (event.key === "ArrowUp" ? delta : -delta)),
        ),
      })
    }
  }

  const wheelCursorStyle = {
    left: `${50 + Math.cos((hsl.h * Math.PI) / 180) * (hsl.s / 2)}%`,
    top: `${50 + Math.sin((hsl.h * Math.PI) / 180) * (hsl.s / 2)}%`,
    "--custom-color": hex,
  } as CSSProperties

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) {
          const next = colorDraft(color)
          setHex(next.hex)
          setHsl(next.hsl)
        }
      }}
    >
      <PopoverTrigger
        render={
          <ToolButton
            label={t("colors.custom")}
            tooltipSide="top"
            variant="ghost"
            aria-pressed={customActive}
            className="command-dock__color command-dock__custom-color"
          >
            <span className="command-dock__color-swatch command-dock__spectrum-swatch">
              {customActive ? (
                <span
                  aria-hidden="true"
                  className="command-dock__custom-color-value"
                  style={{ backgroundColor: color }}
                />
              ) : null}
              {customActive ? (
                <Check
                  aria-hidden="true"
                  className="command-dock__color-check"
                />
              ) : null}
            </span>
          </ToolButton>
        }
      />
      <PopoverContent side="top" align="end" className="custom-color-picker">
        <PopoverHeader>
          <PopoverTitle>{t("colors.custom")}</PopoverTitle>
          <PopoverDescription>{t("colors.description")}</PopoverDescription>
        </PopoverHeader>

        <div
          role="slider"
          tabIndex={0}
          aria-label={t("colors.hueSaturation")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(hsl.s)}
          aria-valuetext={t("colors.wheelValue", {
            hue: Math.round(hsl.h),
            saturation: Math.round(hsl.s),
          })}
          className="custom-color-picker__wheel"
          onKeyDown={handleWheelKeyDown}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            updateFromWheel(event)
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              updateFromWheel(event)
            }
          }}
          onPointerUp={(event) =>
            event.currentTarget.releasePointerCapture(event.pointerId)
          }
          onPointerCancel={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId)
            }
          }}
        >
          <span
            aria-hidden="true"
            className="custom-color-picker__cursor"
            style={wheelCursorStyle}
          />
        </div>
        <p className="custom-color-picker__help">{t("colors.keyboardHelp")}</p>

        <label className="custom-color-picker__lightness">
          <span>{t("colors.lightness")}</span>
          <input
            type="range"
            min={5}
            max={95}
            value={Math.round(hsl.l)}
            onChange={(event) =>
              updateHsl({ ...hsl, l: Number(event.target.value) })
            }
            style={{ "--custom-color": hex } as CSSProperties}
          />
        </label>

        <div className="custom-color-picker__fields">
          <label className="custom-color-picker__hex">
            <span>HEX</span>
            <input
              value={hex}
              maxLength={7}
              spellCheck={false}
              onChange={(event) => {
                const value = event.target.value
                setHex(value)
                const normalized = normalizeHex(value)
                const nextRgb = normalized ? hexToRgb(normalized) : null
                if (nextRgb) setHsl(rgbToHsl(nextRgb))
              }}
            />
          </label>
          {(["r", "g", "b"] as const).map((channel) => (
            <label key={channel}>
              <span>{channel.toUpperCase()}</span>
              <input
                type="number"
                aria-label={t(
                  (
                    {
                      r: "colors.redChannel",
                      g: "colors.greenChannel",
                      b: "colors.blueChannel",
                    } as const
                  )[channel],
                )}
                min={0}
                max={255}
                value={rgb[channel]}
                onChange={(event) =>
                  updateRgbChannel(channel, event.target.value)
                }
              />
            </label>
          ))}
        </div>

        <Button
          type="button"
          className="custom-color-picker__apply"
          onClick={() => {
            const normalized = normalizeHex(hex)
            if (!normalized) return
            onColorChange(normalized)
            setOpen(false)
          }}
        >
          <span
            aria-hidden="true"
            className="custom-color-picker__preview"
            style={{ backgroundColor: hex }}
          />
          {t("colors.apply", { color: normalizeHex(hex) ?? "" })}
        </Button>
      </PopoverContent>
    </Popover>
  )
}
