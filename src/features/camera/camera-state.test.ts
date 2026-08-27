import { describe, expect, it } from "vitest"

import {
  CAMERA_STATES,
  transitionCameraState,
  type CameraEvent,
  type CameraState,
} from "@/features/camera/camera-state"

type RequestResultEvent = Exclude<CameraEvent["type"], "REQUEST" | "STOP">

describe("camera lifecycle", () => {
  it("declares the eight lifecycle states", () => {
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
    "resolves a request with %s to %s",
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
  ] satisfies CameraState[])("allows retrying from the %s state", (state) => {
    expect(transitionCameraState(state, { type: "REQUEST" })).toBe("requesting")
  })

  it("transitions to stopped when stopping a ready stream", () => {
    expect(transitionCameraState("ready", { type: "STOP" })).toBe("stopped")
  })

  it("ignores late results after stopping", () => {
    expect(transitionCameraState("stopped", { type: "READY" })).toBe("stopped")
  })
})
