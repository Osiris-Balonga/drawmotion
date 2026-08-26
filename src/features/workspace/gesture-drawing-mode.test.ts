import { describe, expect, it } from "vitest"

import {
  initialGestureMachineState,
  transitionGestureState,
} from "@/core/gestures/gesture-state-machine"

import { resolveGestureDrawingMode } from "./gesture-drawing-mode"

describe("resolveGestureDrawingMode", () => {
  it("turns a reliable fist into an active temporary eraser stroke", () => {
    expect(
      resolveGestureDrawingMode({
        gesture: "fist",
        pinchPhase: "released",
        quality: "reliable",
        activeTool: "pen",
        hasReliablePoint: true,
      }),
    ).toEqual({
      gesture: "pinch",
      pinchPhase: "active",
      temporaryEraser: true,
    })
  })

  it("does not erase when the fist has no reliable point", () => {
    expect(
      resolveGestureDrawingMode({
        gesture: "fist",
        pinchPhase: "released",
        quality: "reliable",
        activeTool: "pen",
        hasReliablePoint: false,
      }),
    ).toEqual({
      gesture: "open-hand",
      pinchPhase: "released",
      temporaryEraser: false,
    })
  })

  it("preserves tracking loss instead of starting an eraser stroke", () => {
    expect(
      resolveGestureDrawingMode({
        gesture: "fist",
        pinchPhase: "active",
        quality: "lost",
        activeTool: "eraser",
        hasReliablePoint: false,
      }),
    ).toEqual({
      gesture: "tracking-lost",
      pinchPhase: "active",
      temporaryEraser: false,
    })
  })

  it("preserves an uncertain frame and maps pinch according to the active tool", () => {
    expect(
      resolveGestureDrawingMode({
        gesture: "uncertain",
        pinchPhase: "pending-entry",
        quality: "uncertain",
        activeTool: "pen",
        hasReliablePoint: true,
      }),
    ).toEqual({
      gesture: "uncertain",
      pinchPhase: "pending-entry",
      temporaryEraser: false,
    })
    expect(
      resolveGestureDrawingMode({
        gesture: "pinch",
        pinchPhase: "active",
        quality: "reliable",
        activeTool: "pen",
        hasReliablePoint: true,
      }).gesture,
    ).toBe("pinch")
    expect(
      resolveGestureDrawingMode({
        gesture: "pinch",
        pinchPhase: "active",
        quality: "reliable",
        activeTool: "pointer",
        hasReliablePoint: true,
      }).gesture,
    ).toBe("open-hand")
  })

  it("starts, moves, and ends a stroke through the drawing state machine", () => {
    const fist = resolveGestureDrawingMode({
      gesture: "fist",
      pinchPhase: "released",
      quality: "reliable",
      activeTool: "pen",
      hasReliablePoint: true,
    })
    const started = transitionGestureState(initialGestureMachineState, {
      gesture: fist.gesture,
      pinchPhase: fist.pinchPhase,
      point: { x: 10, y: 10 },
      timestampMs: 0,
    })
    const moved = transitionGestureState(started.state, {
      gesture: fist.gesture,
      pinchPhase: fist.pinchPhase,
      point: { x: 30, y: 20 },
      timestampMs: 16,
    })
    const released = resolveGestureDrawingMode({
      gesture: "open-hand",
      pinchPhase: "released",
      quality: "reliable",
      activeTool: "pen",
      hasReliablePoint: true,
    })
    const ended = transitionGestureState(moved.state, {
      gesture: released.gesture,
      pinchPhase: released.pinchPhase,
      point: { x: 30, y: 20 },
      timestampMs: 32,
    })

    expect(started.intentions.map(({ type }) => type)).toContain("DRAW_START")
    expect(moved.intentions.map(({ type }) => type)).toContain("DRAW_MOVE")
    expect(ended.intentions.map(({ type }) => type)).toContain("DRAW_END")
  })
})
