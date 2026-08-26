import { describe, expect, it } from "vitest"

import { resolveGestureModeFeedback } from "@/features/workspace/gesture-mode-feedback"

describe("resolveGestureModeFeedback", () => {
  it.each([
    ["open-hand", "reliable", "released", "pointer"],
    ["pinch", "reliable", "active", "pen"],
    ["fist", "reliable", "released", "eraser"],
  ] as const)(
    "maps %s to the %s dock mode",
    (gesture, quality, phase, kind) => {
      expect(resolveGestureModeFeedback(gesture, quality, phase).kind).toBe(
        kind,
      )
    },
  )

  it("keeps uncertain feedback visible until tracking recovers", () => {
    expect(
      resolveGestureModeFeedback("uncertain", "uncertain", "released"),
    ).toEqual({
      kind: "uncertain",
      label: "Geste incertain",
      persistent: true,
    })
  })

  it("reports a lost hand without keeping the notice persistent", () => {
    expect(
      resolveGestureModeFeedback("tracking-lost", "lost", "released"),
    ).toEqual({
      kind: "lost",
      label: "Main non détectée",
    })
  })

  it("uses the pinch phase while gesture classification catches up", () => {
    expect(
      resolveGestureModeFeedback("open-hand", "reliable", "pending-entry"),
    ).toMatchObject({ kind: "pen" })
  })
})
