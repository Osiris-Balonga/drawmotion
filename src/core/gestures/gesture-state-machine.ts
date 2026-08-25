import type { CanvasPoint } from "@/core/geometry/coordinate-mapping"

import type { GestureKind } from "./gesture-classifier"
import {
  DRAWING_INTENTION_VERSION,
  type DrawingIntention,
} from "./drawing-intentions"

export type GestureMachineMode = "idle" | "drawing" | "paused" | "lost"
export type GestureInterruption = "release" | "tracking-gap" | null

export type GestureMachineState = {
  mode: GestureMachineMode
  lastPoint: CanvasPoint | null
  interruption: GestureInterruption
  interruptionFrames: number
}

export type GestureFrame = {
  gesture: GestureKind
  point: CanvasPoint | null
  timestampMs: number
  continuous?: boolean
}

export type GestureTransition = {
  state: GestureMachineState
  intentions: DrawingIntention[]
}

export const initialGestureMachineState: GestureMachineState = {
  mode: "idle",
  lastPoint: null,
  interruption: null,
  interruptionFrames: 0,
}

const RELEASE_CONFIRMATION_FRAMES = 2
const TRACKING_GRACE_FRAMES = 3

function pointIntention(
  type: "POINTER_MOVE" | "DRAW_START" | "DRAW_MOVE" | "DRAW_END",
  point: CanvasPoint,
  timestampMs: number,
): DrawingIntention {
  return { version: DRAWING_INTENTION_VERSION, type, point, timestampMs }
}

function signalIntention(
  type: "PAUSE" | "TRACKING_LOST",
  timestampMs: number,
): DrawingIntention {
  return { version: DRAWING_INTENTION_VERSION, type, timestampMs }
}

function stopDrawing(
  state: GestureMachineState,
  intentions: DrawingIntention[],
  timestampMs: number,
) {
  if (state.mode === "drawing" && state.lastPoint) {
    intentions.push(pointIntention("DRAW_END", state.lastPoint, timestampMs))
  }
}

function clearInterruption(
  state: Pick<GestureMachineState, "mode" | "lastPoint">,
): GestureMachineState {
  return {
    ...state,
    interruption: null,
    interruptionFrames: 0,
  }
}

function pendingInterruption(
  state: GestureMachineState,
  interruption: Exclude<GestureInterruption, null>,
) {
  const interruptionFrames =
    state.interruption === interruption ? state.interruptionFrames + 1 : 1
  return {
    interruption,
    interruptionFrames,
  }
}

export function transitionGestureState(
  state: GestureMachineState,
  frame: GestureFrame,
): GestureTransition {
  const intentions: DrawingIntention[] = []
  if (frame.continuous === false) {
    stopDrawing(state, intentions, frame.timestampMs)
    if (state.mode !== "lost") {
      intentions.push(signalIntention("TRACKING_LOST", frame.timestampMs))
    }
    return {
      state: clearInterruption({ mode: "lost", lastPoint: state.lastPoint }),
      intentions,
    }
  }
  const visiblePoint =
    frame.gesture === "tracking-lost" || frame.gesture === "uncertain"
      ? null
      : frame.point

  if (visiblePoint) {
    intentions.push(
      pointIntention("POINTER_MOVE", visiblePoint, frame.timestampMs),
    )
  }

  if (frame.gesture === "pinch" && visiblePoint) {
    const drawType = state.mode === "drawing" ? "DRAW_MOVE" : "DRAW_START"
    intentions.push(pointIntention(drawType, visiblePoint, frame.timestampMs))
    return {
      state: clearInterruption({ mode: "drawing", lastPoint: visiblePoint }),
      intentions,
    }
  }

  if (state.mode === "drawing") {
    const interruption =
      frame.gesture === "open-hand"
        ? "release"
        : frame.gesture === "uncertain" || frame.gesture === "tracking-lost"
          ? "tracking-gap"
          : null
    if (interruption) {
      const pending = pendingInterruption(state, interruption)
      const requiredFrames =
        interruption === "release"
          ? RELEASE_CONFIRMATION_FRAMES
          : TRACKING_GRACE_FRAMES
      if (pending.interruptionFrames < requiredFrames) {
        return {
          state: { ...state, ...pending },
          intentions,
        }
      }
    }
  }

  if (frame.gesture === "tracking-lost") {
    stopDrawing(state, intentions, frame.timestampMs)
    if (state.mode !== "lost") {
      intentions.push(signalIntention("TRACKING_LOST", frame.timestampMs))
    }
    return {
      state: clearInterruption({ mode: "lost", lastPoint: state.lastPoint }),
      intentions,
    }
  }

  if (
    frame.gesture === "open-hand" ||
    frame.gesture === "fist" ||
    frame.gesture === "uncertain"
  ) {
    stopDrawing(state, intentions, frame.timestampMs)
    if (state.mode !== "paused") {
      intentions.push(signalIntention("PAUSE", frame.timestampMs))
    }
    return {
      state: clearInterruption({
        mode: "paused",
        lastPoint: visiblePoint ?? state.lastPoint,
      }),
      intentions,
    }
  }

  return {
    state: clearInterruption({
      mode: "idle",
      lastPoint: visiblePoint ?? state.lastPoint,
    }),
    intentions,
  }
}
