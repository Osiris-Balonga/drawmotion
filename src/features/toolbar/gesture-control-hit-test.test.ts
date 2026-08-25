import { describe, expect, it } from "vitest"

import { findGestureControlAtPoint } from "./gesture-control-hit-test"

describe("findGestureControlAtPoint", () => {
  it("finds the enabled control under a gesture pointer", () => {
    const button = document.createElement("button")
    button.dataset.gestureControl = ""
    const icon = document.createElement("span")
    button.append(icon)

    expect(
      findGestureControlAtPoint(
        { x: 20, y: 40 },
        { elementFromPoint: () => icon },
      ),
    ).toBe(button)
  })

  it("ignores disabled and unrelated elements", () => {
    const button = document.createElement("button")
    button.dataset.gestureControl = ""
    button.disabled = true
    const unrelated = document.createElement("span")

    expect(
      findGestureControlAtPoint(
        { x: 0, y: 0 },
        { elementFromPoint: () => button },
      ),
    ).toBeNull()
    expect(
      findGestureControlAtPoint(
        { x: 0, y: 0 },
        { elementFromPoint: () => unrelated },
      ),
    ).toBeNull()
  })
})
