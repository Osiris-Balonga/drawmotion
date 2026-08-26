import { describe, expect, it } from "vitest"

import { resolveGesturePaletteAction } from "./gesture-palette-interaction"

describe("resolveGesturePaletteAction", () => {
  it("selects whenever an active pinch reaches a palette control", () => {
    expect(resolveGesturePaletteAction("pinch", "active", true)).toBe("select")
  })

  it("prioritizes selection when a pinch is briefly classified as a fist", () => {
    expect(resolveGesturePaletteAction("fist", "active", true)).toBe("select")
  })

  it("closes only for a released fist and ignores empty space", () => {
    expect(resolveGesturePaletteAction("fist", "released", false)).toBe("close")
    expect(resolveGesturePaletteAction("pinch", "active", false)).toBeNull()
    expect(
      resolveGesturePaletteAction("open-hand", "released", true),
    ).toBeNull()
  })
})
