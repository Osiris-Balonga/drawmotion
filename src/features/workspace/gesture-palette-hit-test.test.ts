import { describe, expect, it, vi } from "vitest"

import { findGesturePaletteControl } from "@/features/workspace/gesture-palette-hit-test"

function setBounds(element: HTMLElement, bounds: Partial<DOMRect>) {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    bottom: 180,
    height: 80,
    left: 100,
    right: 220,
    top: 100,
    width: 120,
    x: 100,
    y: 100,
    toJSON: () => ({}),
    ...bounds,
  })
}

describe("findGesturePaletteControl", () => {
  it("uses the full command card instead of its icon or label", () => {
    const palette = document.createElement("section")
    const button = document.createElement("button")
    button.dataset.gesturePaletteControl = ""
    button.innerHTML = "<svg></svg><span>Couleur</span>"
    palette.append(button)
    setBounds(button, {})

    expect(findGesturePaletteControl(palette, { x: 210, y: 170 })).toBe(button)
  })

  it("keeps a forgiving magnetic margin around a command card", () => {
    const palette = document.createElement("section")
    const button = document.createElement("button")
    button.dataset.gesturePaletteControl = ""
    palette.append(button)
    setBounds(button, {})

    expect(findGesturePaletteControl(palette, { x: 246, y: 140 })).toBe(button)
    expect(findGesturePaletteControl(palette, { x: 280, y: 140 })).toBeNull()
  })

  it("ignores disabled cards and resolves the closest enabled card", () => {
    const palette = document.createElement("section")
    const disabled = document.createElement("button")
    const enabled = document.createElement("button")
    disabled.dataset.gesturePaletteControl = ""
    disabled.disabled = true
    enabled.dataset.gesturePaletteControl = ""
    palette.append(disabled, enabled)
    setBounds(disabled, { left: 100, right: 180 })
    setBounds(enabled, { left: 200, right: 280 })

    expect(findGesturePaletteControl(palette, { x: 210, y: 140 })).toBe(enabled)
  })
})
