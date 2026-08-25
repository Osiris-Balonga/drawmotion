import { describe, expect, it } from "vitest"

import {
  fistGestureLandmarks,
  handFromGestureFixture,
  openHandGestureLandmarks,
  pinchGestureLandmarks,
  uncertainGestureLandmarks,
  withPinchRatio,
} from "@/test/fixtures/gesture-landmarks"

import { classifyGesture, type GestureKind } from "./gesture-classifier"
import {
  initialGestureMachineState,
  transitionGestureState,
} from "./gesture-state-machine"
import { PointerMotionFilter } from "./pointer-motion-filter"

function classifySequence(ratios: number[], initial: GestureKind) {
  let previous = initial
  return ratios.map((ratio) => {
    const classification = classifyGesture(
      handFromGestureFixture(withPinchRatio(ratio)),
      previous,
    )
    previous = classification.kind
    return classification.kind
  })
}

describe("gesture jitter and accidental activation resistance", () => {
  it("does not chatter while a pinched hand jitters inside the dead band", () => {
    expect(
      classifySequence([0.17, 0.19, 0.21, 0.2, 0.23, 0.19], "open-hand"),
    ).toEqual(["pinch", "pinch", "pinch", "pinch", "pinch", "pinch"])
  })

  it("does not enter pinch while an open hand jitters above entry", () => {
    expect(
      classifySequence([0.19, 0.22, 0.2, 0.23, 0.185], "open-hand"),
    ).toEqual(["open-hand", "open-hand", "open-hand", "open-hand", "open-hand"])
  })

  it("requires crossing the exit boundary before releasing pinch", () => {
    expect(classifySequence([0.23, 0.239, 0.25], "pinch")).toEqual([
      "pinch",
      "pinch",
      "open-hand",
    ])
  })

  it("never emits drawing activation for non-pinch safety poses", () => {
    const safetyPoses = [
      fistGestureLandmarks,
      openHandGestureLandmarks,
      uncertainGestureLandmarks,
    ]

    for (const landmarks of safetyPoses) {
      const gesture = classifyGesture(handFromGestureFixture(landmarks)).kind
      const { intentions } = transitionGestureState(
        initialGestureMachineState,
        { gesture, point: { x: 100, y: 100 }, timestampMs: 16 },
      )
      expect(intentions.map(({ type }) => type)).not.toContain("DRAW_START")
    }
  })

  it("does not use handedness certainty to reject a tracked pinch", () => {
    const gesture = classifyGesture(
      handFromGestureFixture(pinchGestureLandmarks, 0.2),
    ).kind
    const { intentions } = transitionGestureState(initialGestureMachineState, {
      gesture,
      point: { x: 100, y: 100 },
      timestampMs: 16,
    })

    expect(gesture).toBe("pinch")
    expect(intentions.map(({ type }) => type)).toContain("DRAW_START")
  })

  it("ends an active stroke when the hand disappears", () => {
    const started = transitionGestureState(initialGestureMachineState, {
      gesture: "pinch",
      point: { x: 10, y: 20 },
      timestampMs: 0,
    })
    const firstGap = transitionGestureState(started.state, {
      gesture: classifyGesture(null).kind,
      point: null,
      timestampMs: 16,
    })
    const secondGap = transitionGestureState(firstGap.state, {
      gesture: "tracking-lost",
      point: null,
      timestampMs: 32,
    })
    const lost = transitionGestureState(secondGap.state, {
      gesture: "tracking-lost",
      point: null,
      timestampMs: 48,
    })

    expect(firstGap.intentions).toEqual([])
    expect(secondGap.intentions).toEqual([])
    expect(lost.intentions.map(({ type }) => type)).toEqual([
      "DRAW_END",
      "TRACKING_LOST",
    ])
  })

  it("treats malformed or degenerate landmark geometry as uncertain", () => {
    const incomplete = Array.from({ length: 21 }, () => undefined)
    const incompleteHand = handFromGestureFixture(
      incomplete as unknown as typeof pinchGestureLandmarks,
    )
    const degenerate = openHandGestureLandmarks.map((landmark) => ({
      ...landmark,
    }))
    degenerate[9] = { ...degenerate[0]! }

    expect(classifyGesture(incompleteHand).kind).toBe("uncertain")
    expect(classifyGesture(handFromGestureFixture(degenerate)).kind).toBe(
      "uncertain",
    )
  })

  it("does not start drawing when a pinch has no reliable pointer", () => {
    const transition = transitionGestureState(initialGestureMachineState, {
      gesture: "pinch",
      point: null,
      timestampMs: 16,
    })

    expect(transition).toEqual({
      state: {
        mode: "idle",
        lastPoint: null,
        interruption: null,
        interruptionFrames: 0,
      },
      intentions: [],
    })
  })

  it("keeps one continuous stroke through a brief uncertain circle frame", () => {
    const frames = [
      { gesture: "pinch" as const, point: { x: 50, y: 20 } },
      { gesture: "pinch" as const, point: { x: 80, y: 50 } },
      { gesture: "uncertain" as const, point: null },
      { gesture: "pinch" as const, point: { x: 50, y: 80 } },
      { gesture: "pinch" as const, point: { x: 20, y: 50 } },
      { gesture: "pinch" as const, point: { x: 50, y: 20 } },
      { gesture: "open-hand" as const, point: { x: 50, y: 20 } },
      { gesture: "open-hand" as const, point: { x: 50, y: 20 } },
    ]
    let state = initialGestureMachineState
    const intentionTypes: string[] = []

    frames.forEach((frame, index) => {
      const transition = transitionGestureState(state, {
        ...frame,
        timestampMs: index * 16,
      })
      state = transition.state
      intentionTypes.push(...transition.intentions.map(({ type }) => type))
    })

    expect(intentionTypes.filter((type) => type === "DRAW_START")).toHaveLength(
      1,
    )
    expect(intentionTypes.filter((type) => type === "DRAW_END")).toHaveLength(1)
    expect(state.mode).toBe("paused")
  })

  it("rejects an invalid pointer smoothing time constant", () => {
    expect(() => new PointerMotionFilter({ minCutoffHz: 0 })).toThrow(
      "greater than zero",
    )
  })

  it("never bridges a bottom-to-top jump after tracking ambiguity", () => {
    const filter = new PointerMotionFilter()
    let state = transitionGestureState(initialGestureMachineState, {
      gesture: "pinch",
      point: { x: 0.5, y: 0.85 },
      timestampMs: 0,
    }).state
    state = transitionGestureState(state, {
      gesture: "uncertain",
      point: null,
      timestampMs: 16,
    }).state

    filter.update({ x: 0.5, y: 0.85 }, 0)
    filter.update(null, 16)
    const jump = filter.update({ x: 0.5, y: 0.1 }, 32)
    const transition = transitionGestureState(state, {
      gesture: "pinch",
      point: jump.reliable ? jump.point : null,
      timestampMs: 32,
      continuous: !jump.discontinuity,
    })

    expect(transition.intentions.map(({ type }) => type)).toEqual([
      "DRAW_END",
      "TRACKING_LOST",
    ])
    expect(transition.intentions.map(({ type }) => type)).not.toContain(
      "DRAW_MOVE",
    )
  })
})
