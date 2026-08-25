import { describe, expect, it } from "vitest"

import { DRAWING_INTENTION_VERSION } from "./drawing-intentions"
import {
  initialGestureMachineState,
  transitionGestureState,
} from "./gesture-state-machine"

describe("transitionGestureState", () => {
  it("emits pointer and drawing intentions for a pinch sequence", () => {
    const started = transitionGestureState(initialGestureMachineState, {
      gesture: "pinch",
      point: { x: 10, y: 20 },
      timestampMs: 100,
    })
    const moved = transitionGestureState(started.state, {
      gesture: "pinch",
      point: { x: 12, y: 24 },
      timestampMs: 116,
    })

    expect(started.intentions.map(({ type }) => type)).toEqual([
      "POINTER_MOVE",
      "DRAW_START",
    ])
    expect(moved.intentions.map(({ type }) => type)).toEqual([
      "POINTER_MOVE",
      "DRAW_MOVE",
    ])
    expect(moved.state.mode).toBe("drawing")
  })

  it("ends a stroke before pausing on an open hand", () => {
    const state = {
      mode: "drawing" as const,
      lastPoint: { x: 12, y: 24 },
      interruption: null,
      interruptionFrames: 0,
    }
    const pending = transitionGestureState(state, {
      gesture: "open-hand",
      point: { x: 15, y: 25 },
      timestampMs: 132,
    })
    const transition = transitionGestureState(pending.state, {
      gesture: "open-hand",
      point: { x: 16, y: 26 },
      timestampMs: 148,
    })

    expect(pending.intentions.map(({ type }) => type)).toEqual(["POINTER_MOVE"])
    expect(pending.state).toMatchObject({
      mode: "drawing",
      interruption: "release",
      interruptionFrames: 1,
    })
    expect(transition.intentions.map(({ type }) => type)).toEqual([
      "POINTER_MOVE",
      "DRAW_END",
      "PAUSE",
    ])
    expect(transition.state.mode).toBe("paused")
  })

  it("ends a stroke once and never extrapolates on tracking loss", () => {
    const drawingState = {
      mode: "drawing" as const,
      lastPoint: { x: 30, y: 40 },
      interruption: null,
      interruptionFrames: 0,
    }
    const firstGap = transitionGestureState(drawingState, {
      gesture: "tracking-lost",
      point: { x: 999, y: 999 },
      timestampMs: 200,
    })
    const secondGap = transitionGestureState(firstGap.state, {
      gesture: "tracking-lost",
      point: null,
      timestampMs: 216,
    })
    const lost = transitionGestureState(secondGap.state, {
      gesture: "tracking-lost",
      point: null,
      timestampMs: 232,
    })
    const stillLost = transitionGestureState(lost.state, {
      gesture: "tracking-lost",
      point: null,
      timestampMs: 248,
    })

    expect(firstGap.intentions).toEqual([])
    expect(secondGap.intentions).toEqual([])
    expect(lost.intentions).toEqual([
      {
        version: DRAWING_INTENTION_VERSION,
        type: "DRAW_END",
        point: { x: 30, y: 40 },
        timestampMs: 232,
      },
      {
        version: DRAWING_INTENTION_VERSION,
        type: "TRACKING_LOST",
        timestampMs: 232,
      },
    ])
    expect(stillLost.intentions).toEqual([])
    expect(stillLost.state.lastPoint).toEqual({ x: 30, y: 40 })
  })

  it("pauses safely when classification becomes uncertain", () => {
    const drawing = {
      mode: "drawing" as const,
      lastPoint: { x: 4, y: 8 },
      interruption: null,
      interruptionFrames: 0,
    }
    const firstGap = transitionGestureState(drawing, {
      gesture: "uncertain",
      point: { x: 20, y: 40 },
      timestampMs: 50,
    })
    const secondGap = transitionGestureState(firstGap.state, {
      gesture: "uncertain",
      point: null,
      timestampMs: 66,
    })
    const transition = transitionGestureState(secondGap.state, {
      gesture: "uncertain",
      point: null,
      timestampMs: 82,
    })

    expect(firstGap.intentions).toEqual([])
    expect(secondGap.intentions).toEqual([])
    expect(transition.intentions.map(({ type }) => type)).toEqual([
      "DRAW_END",
      "PAUSE",
    ])
    expect(transition.state).toEqual({
      mode: "paused",
      lastPoint: { x: 4, y: 8 },
      interruption: null,
      interruptionFrames: 0,
    })
  })

  it("versions every emitted intention", () => {
    const { intentions } = transitionGestureState(initialGestureMachineState, {
      gesture: "pinch",
      point: { x: 1, y: 2 },
      timestampMs: 10,
    })

    expect(intentions.every(({ version }) => version === 1)).toBe(true)
  })
})
