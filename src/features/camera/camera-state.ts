export const CAMERA_STATES = [
  "idle",
  "requesting",
  "ready",
  "denied",
  "missing",
  "busy",
  "failed",
  "stopped",
] as const

export type CameraState = (typeof CAMERA_STATES)[number]

export type CameraEvent =
  | { type: "REQUEST" }
  | { type: "READY" }
  | { type: "DENIED" }
  | { type: "MISSING" }
  | { type: "BUSY" }
  | { type: "FAIL" }
  | { type: "STOP" }

export function transitionCameraState(
  state: CameraState,
  event: CameraEvent,
): CameraState {
  if (event.type === "STOP") {
    return state === "idle" ? "idle" : "stopped"
  }

  if (event.type === "REQUEST") {
    return "requesting"
  }

  if (state !== "requesting") {
    return state
  }

  const requestResults: Record<
    Exclude<CameraEvent["type"], "REQUEST" | "STOP">,
    CameraState
  > = {
    READY: "ready",
    DENIED: "denied",
    MISSING: "missing",
    BUSY: "busy",
    FAIL: "failed",
  }

  return requestResults[event.type]
}
