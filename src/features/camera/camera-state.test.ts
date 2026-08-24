import { describe, expect, it } from "vitest"

import {
  CAMERA_STATES,
  transitionCameraState,
  type CameraEvent,
  type CameraState,
} from "@/features/camera/camera-state"

type RequestResultEvent = Exclude<CameraEvent["type"], "REQUEST" | "STOP">

describe("camera lifecycle", () => {
  it("déclare les huit états contractuels", () => {
    expect(CAMERA_STATES).toEqual([
      "idle",
      "requesting",
      "ready",
      "denied",
      "missing",
      "busy",
      "failed",
      "stopped",
    ])
  })

  it.each([
    ["READY", "ready"],
    ["DENIED", "denied"],
    ["MISSING", "missing"],
    ["BUSY", "busy"],
    ["FAIL", "failed"],
  ] satisfies Array<[RequestResultEvent, CameraState]>)(
    "résout une demande avec %s vers %s",
    (eventType, expectedState) => {
      expect(transitionCameraState("requesting", { type: eventType })).toBe(
        expectedState,
      )
    },
  )

  it.each([
    "denied",
    "missing",
    "busy",
    "failed",
    "stopped",
  ] satisfies CameraState[])("permet de relancer depuis l’état %s", (state) => {
    expect(transitionCameraState(state, { type: "REQUEST" })).toBe("requesting")
  })

  it("passe à stopped lors de l’arrêt d’un flux prêt", () => {
    expect(transitionCameraState("ready", { type: "STOP" })).toBe("stopped")
  })

  it("ignore les résultats tardifs après un arrêt", () => {
    expect(transitionCameraState("stopped", { type: "READY" })).toBe("stopped")
  })
})
