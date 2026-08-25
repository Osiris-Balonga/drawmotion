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
    }
    const transition = transitionGestureState(state, {
      gesture: "open-hand",
      point: { x: 15, y: 25 },
      timestampMs: 132,
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
    }
    const lost = transitionGestureState(drawingState, {
      gesture: "tracking-lost",
      point: { x: 999, y: 999 },
      timestampMs: 200,
    })
    const stillLost = transitionGestureState(lost.state, {
      gesture: "tracking-lost",
      point: null,
      timestampMs: 216,
    })

    expect(lost.intentions).toEqual([
      {
        version: DRAWING_INTENTION_VERSION,
        type: "DRAW_END",
        point: { x: 30, y: 40 },
        timestampMs: 200,
      },
      {
        version: DRAWING_INTENTION_VERSION,
        type: "TRACKING_LOST",
        timestampMs: 200,
      },
    ])
    expect(stillLost.intentions).toEqual([])
    expect(stillLost.state.lastPoint).toEqual({ x: 30, y: 40 })
  })

  it("pauses safely when classification becomes uncertain", () => {
    const transition = transitionGestureState(
      { mode: "drawing", lastPoint: { x: 4, y: 8 } },
      { gesture: "uncertain", point: { x: 20, y: 40 }, timestampMs: 50 },
    )

    expect(transition.intentions.map(({ type }) => type)).toEqual([
      "DRAW_END",
      "PAUSE",
    ])
    expect(transition.state).toEqual({
      mode: "paused",
      lastPoint: { x: 4, y: 8 },
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
