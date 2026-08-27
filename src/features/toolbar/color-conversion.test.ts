import { describe, expect, it } from "vitest"

import {
  hexToRgb,
  hslToRgb,
  normalizeHex,
  rgbToHex,
  rgbToHsl,
} from "./color-conversion"

describe("color conversion", () => {
  it("normalizes full and shorthand hexadecimal values", () => {
    expect(normalizeHex("#7c3aed")).toBe("#7C3AED")
    expect(normalizeHex("abc")).toBe("#AABBCC")
    expect(normalizeHex("violet")).toBeNull()
  })

  it("converts RGB and hexadecimal colors in both directions", () => {
    expect(hexToRgb("#238554")).toEqual({ r: 35, g: 133, b: 84 })
    expect(rgbToHex({ r: 35, g: 133, b: 84 })).toBe("#238554")
  })

  it("round-trips representative HSL colors", () => {
    for (const rgb of [
      { r: 124, g: 58, b: 237 },
      { r: 20, g: 200, b: 120 },
      { r: 245, g: 180, b: 30 },
    ]) {
      expect(hslToRgb(rgbToHsl(rgb))).toEqual(rgb)
    }
  })
})
