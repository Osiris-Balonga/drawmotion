import { describe, expect, it } from "vitest"

import { DRAWING_INTENTION_VERSION } from "./drawing-intentions"
import {
  initialGestureMachineState,
  transitionGestureState,
  type GestureMachineState,
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

  it("restores the first point collected while pinch entry is confirmed", () => {
    const pending = transitionGestureState(initialGestureMachineState, {
      gesture: "pinch",
      pinchPhase: "pending-entry",
      point: { x: 10, y: 20 },
      timestampMs: 100,
    })
    const started = transitionGestureState(pending.state, {
      gesture: "pinch",
      pinchPhase: "active",
      point: { x: 30, y: 40 },
      timestampMs: 200,
    })

    expect(pending.intentions.map(({ type }) => type)).toEqual(["POINTER_MOVE"])
    expect(started.intentions.map(({ type }) => type)).toEqual([
      "POINTER_MOVE",
      "DRAW_START",
      "DRAW_MOVE",
    ])
    expect(started.intentions).toContainEqual({
      version: DRAWING_INTENTION_VERSION,
      type: "DRAW_START",
      point: { x: 10, y: 20 },
      timestampMs: 100,
    })
    expect(started.state).toMatchObject({
      mode: "drawing",
      lastPoint: { x: 30, y: 40 },
    })
    expect(started.state.pendingEntryPoints).toBeUndefined()
  })

  it("discards an entry candidate that is not confirmed", () => {
    const pending = transitionGestureState(initialGestureMachineState, {
      gesture: "pinch",
      pinchPhase: "pending-entry",
      point: { x: 10, y: 20 },
      timestampMs: 100,
    })
    const released = transitionGestureState(pending.state, {
      gesture: "open-hand",
      pinchPhase: "released",
      point: { x: 20, y: 30 },
      timestampMs: 116,
    })

    expect(released.intentions.map(({ type }) => type)).toEqual([
      "POINTER_MOVE",
      "PAUSE",
    ])
    expect(released.intentions.map(({ type }) => type)).not.toContain(
      "DRAW_START",
    )
    expect(released.state.pendingEntryPoints).toBeUndefined()
  })

  it("buffers a provisional release and commits it when pinch recovers", () => {
    const started = transitionGestureState(initialGestureMachineState, {
      gesture: "pinch",
      pinchPhase: "active",
      point: { x: 10, y: 20 },
      timestampMs: 0,
    })
    const firstPending = transitionGestureState(started.state, {
      gesture: "pinch",
      pinchPhase: "pending-release",
      point: { x: 20, y: 30 },
      timestampMs: 50,
    })
    const secondPending = transitionGestureState(firstPending.state, {
      gesture: "pinch",
      pinchPhase: "pending-release",
      point: { x: 30, y: 40 },
      timestampMs: 100,
    })
    const recovered = transitionGestureState(secondPending.state, {
      gesture: "pinch",
      pinchPhase: "active",
      point: { x: 40, y: 50 },
      timestampMs: 120,
    })

    expect(firstPending.intentions.map(({ type }) => type)).toEqual([
      "POINTER_MOVE",
    ])
    expect(secondPending.intentions.map(({ type }) => type)).toEqual([
      "POINTER_MOVE",
    ])
    expect(recovered.intentions.map(({ type }) => type)).toEqual([
      "POINTER_MOVE",
      "DRAW_MOVE",
      "DRAW_MOVE",
      "DRAW_MOVE",
    ])
    expect(
      recovered.intentions
        .filter(({ type }) => type === "DRAW_MOVE")
        .map((intention) => ("point" in intention ? intention.point : null)),
    ).toEqual([
      { x: 20, y: 30 },
      { x: 30, y: 40 },
      { x: 40, y: 50 },
    ])
    expect(recovered.state.pendingReleasePoints).toBeUndefined()
  })

  it("discards provisional points when release is confirmed", () => {
    const drawing = {
      mode: "drawing" as const,
      lastPoint: { x: 10, y: 20 },
      interruption: "release" as const,
      interruptionFrames: 0,
      pendingReleasePoints: [{ point: { x: 80, y: 90 }, timestampMs: 100 }],
    }
    const released = transitionGestureState(drawing, {
      gesture: "open-hand",
      pinchPhase: "released",
      point: { x: 100, y: 110 },
      timestampMs: 180,
    })

    expect(released.intentions.map(({ type }) => type)).toEqual([
      "POINTER_MOVE",
      "DRAW_END",
      "PAUSE",
    ])
    expect(released.intentions).toContainEqual({
      version: DRAWING_INTENTION_VERSION,
      type: "DRAW_END",
      point: { x: 10, y: 20 },
      timestampMs: 180,
    })
    expect(released.state.pendingReleasePoints).toBeUndefined()
  })

  it("still ends a pending release when tracking is lost", () => {
    let state: GestureMachineState = {
      mode: "drawing" as const,
      lastPoint: { x: 10, y: 20 },
      interruption: "release" as const,
      interruptionFrames: 0,
      pendingReleasePoints: [{ point: { x: 20, y: 30 }, timestampMs: 100 }],
    }
    const intentionTypes: string[] = []

    for (const timestampMs of [116, 132, 148]) {
      const transition = transitionGestureState(state, {
        gesture: "tracking-lost",
        pinchPhase: "pending-release",
        point: null,
        timestampMs,
      })
      state = transition.state
      intentionTypes.push(...transition.intentions.map(({ type }) => type))
    }

    expect(intentionTypes).toEqual(["DRAW_END", "TRACKING_LOST"])
    expect(state).toMatchObject({ mode: "lost", lastPoint: { x: 10, y: 20 } })
    expect(state.pendingReleasePoints).toBeUndefined()
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
