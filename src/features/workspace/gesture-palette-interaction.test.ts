import { describe, expect, it } from "vitest"

import { resolveGesturePaletteAction } from "./gesture-palette-interaction"

describe("resolveGesturePaletteAction", () => {
  it("selects after the menu pose dwells on a palette control", () => {
    expect(resolveGesturePaletteAction("menu", "released", true, 1)).toBe(
      "select",
    )
  })

  it("does not select before the dwell completes or while pinching", () => {
    expect(
      resolveGesturePaletteAction("menu", "released", true, 0.99),
    ).toBeNull()
    expect(resolveGesturePaletteAction("pinch", "active", true, 1)).toBeNull()
  })

  it("closes only for a released fist and ignores empty space", () => {
    expect(resolveGesturePaletteAction("fist", "released", false, 0)).toBe(
      "close",
    )
    expect(resolveGesturePaletteAction("menu", "released", false, 1)).toBeNull()
    expect(
      resolveGesturePaletteAction("open-hand", "released", true, 1),
    ).toBeNull()
  })
})
