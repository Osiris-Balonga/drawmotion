import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import type { DrawingStyle } from "@/core/drawing/canvas-drawing-controller"
import type { GestureKind } from "@/core/gestures/gesture-classifier"
import {
  initialGestureMachineState,
  transitionGestureState,
  type GestureMachineState,
} from "@/core/gestures/gesture-state-machine"
import { PointerMotionFilter } from "@/core/gestures/pointer-motion-filter"
import { selectGesturePointer } from "@/core/gestures/gesture-pointer"
import type { PinchPhase } from "@/core/gestures/pinch-detector"
import { GESTURE_THRESHOLDS } from "@/core/gestures/gesture-thresholds"
import { mapMirroredCameraPointToCanvas } from "@/core/geometry/coordinate-mapping"
import type { DrawingTool } from "@/features/toolbar/drawing-tools"
import type { useWorkspaceOnboarding } from "@/features/onboarding/use-workspace-onboarding"
import type { HandTrackingResult } from "@/infrastructure/mediapipe/hand-tracker-port"
import type { TrackingQuality } from "@/infrastructure/mediapipe/hand-tracking-session"
import type { DrawingCanvasHandle } from "./drawing-canvas"
import { resolveGestureDrawingMode } from "./gesture-drawing-mode"
import { canOpenGestureMenu } from "./gesture-menu-availability"
import {
  resolveGestureModeFeedback,
  type GestureModeFeedback,
} from "./gesture-mode-feedback"
import { findGesturePaletteControl } from "./gesture-palette-hit-test"
import { resolveGesturePaletteAction } from "./gesture-palette-interaction"

const gestureMenuPostDrawingGuardMs = 250
const gestureMenuMovementTolerance = 36
const gesturePointerRadius = 6
const gestureNoticeDurationMs = 1650

type GestureMenuHold = {
  startedAt: number
  origin: { x: number; y: number }
}

type GestureInteractionOptions = {
  stageRef: RefObject<HTMLElement | null>
  drawingRef: RefObject<DrawingCanvasHandle | null>
  activeToolRef: RefObject<DrawingTool>
  drawingStyle: DrawingStyle
  eraserThickness: number
  changeTool: (tool: DrawingTool) => void
  onStrokeStart: () => void
  onboarding: ReturnType<typeof useWorkspaceOnboarding>
}
export function useWorkspaceGestures({
  stageRef,
  drawingRef,
  activeToolRef,
  drawingStyle,
  eraserThickness,
  changeTool,
  onStrokeStart,
  onboarding,
}: GestureInteractionOptions) {
  const {
    onboardingStateRef,
    observeOnboarding,
    observePointer,
    observeStroke,
  } = onboarding
  const [gesturePaletteAnchor, setGesturePaletteAnchor] = useState<{
    x: number
    y: number
  } | null>(null)
  const [gestureNotice, setGestureNotice] =
    useState<GestureModeFeedback | null>(null)

  const pointerOverlayRef = useRef<HTMLDivElement>(null)
  const pointerFilterRef = useRef(new PointerMotionFilter())
  const gesturePaletteOpenRef = useRef(false)
  const gesturePaletteHoverRef = useRef<HTMLButtonElement | null>(null)
  const gesturePalettePinchConsumedRef = useRef(false)
  const gestureMenuHoldRef = useRef<GestureMenuHold | null>(null)
  const lastDrawingGestureAtRef = useRef(Number.NEGATIVE_INFINITY)
  const lastGestureFeedbackRef = useRef<GestureModeFeedback["kind"] | null>(
    null,
  )
  const gestureNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )

  const gestureStateRef = useRef<GestureMachineState>(
    initialGestureMachineState,
  )
  const publishGestureFeedback = useCallback(
    (notice: GestureModeFeedback) => {
      const gestureTool =
        notice.kind === "pointer" ||
        notice.kind === "pen" ||
        notice.kind === "eraser"
          ? notice.kind
          : null
      if (gestureTool && activeToolRef.current !== gestureTool) {
        changeTool(gestureTool)
      }

      if (lastGestureFeedbackRef.current === notice.kind) return
      lastGestureFeedbackRef.current = notice.kind
      if (gestureNoticeTimerRef.current) {
        clearTimeout(gestureNoticeTimerRef.current)
        gestureNoticeTimerRef.current = null
      }
      setGestureNotice(notice)
      if (!notice.persistent) {
        gestureNoticeTimerRef.current = setTimeout(() => {
          setGestureNotice(null)
          gestureNoticeTimerRef.current = null
        }, gestureNoticeDurationMs)
      }
    },
    [activeToolRef, changeTool],
  )

  useEffect(
    () => () => {
      if (gestureNoticeTimerRef.current) {
        clearTimeout(gestureNoticeTimerRef.current)
      }
    },
    [],
  )

  const clearGesturePaletteHover = useCallback(() => {
    gesturePaletteHoverRef.current?.removeAttribute("data-gesture-hover")
    gesturePaletteHoverRef.current = null
  }, [])

  const closeGesturePalette = useCallback(() => {
    clearGesturePaletteHover()
    gesturePaletteOpenRef.current = false
    gesturePalettePinchConsumedRef.current = false
    setGesturePaletteAnchor(null)
  }, [clearGesturePaletteHover])

  const openGesturePalette = useCallback(
    (point: { x: number; y: number }, bounds: DOMRect) => {
      const halfWidth = 10.5 * 16
      const topGuard = 8.5 * 16
      const bottomGuard = 13 * 16
      const anchor = {
        x: Math.min(
          bounds.width - halfWidth,
          Math.max(halfWidth, point.x - bounds.left),
        ),
        y: Math.min(
          bounds.height - bottomGuard,
          Math.max(topGuard, point.y - bounds.top),
        ),
      }
      gesturePaletteOpenRef.current = true
      gesturePalettePinchConsumedRef.current = false
      gestureMenuHoldRef.current = null
      setGesturePaletteAnchor(anchor)
      observeOnboarding({ type: "COMMAND_PALETTE_OPENED" })
    },
    [observeOnboarding],
  )

  const openGesturePaletteFromDock = useCallback(() => {
    const bounds = stageRef.current?.getBoundingClientRect()
    if (!bounds) return
    openGesturePalette(
      {
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
      },
      bounds,
    )
  }, [openGesturePalette, stageRef])

  const updateGesturePointer = useCallback(
    (
      point: { x: number; y: number } | null,
      bounds: DOMRect,
      reliable: boolean,
      drawing: boolean,
      dwellProgress = 0,
    ) => {
      const pointer = pointerOverlayRef.current
      if (!pointer || !point || !reliable) {
        pointer?.removeAttribute("data-visible")
        return
      }
      pointer.style.transform = `translate3d(${point.x - bounds.left - gesturePointerRadius}px, ${point.y - bounds.top - gesturePointerRadius}px, 0)`
      pointer.style.setProperty(
        "--gesture-dwell-offset",
        `${50.3 * (1 - dwellProgress)}`,
      )
      pointer.toggleAttribute("data-drawing", drawing)
      pointer.setAttribute("data-visible", "")
    },
    [],
  )

  const handleGestureFrame = useCallback(
    (
      result: HandTrackingResult,
      gesture: GestureKind,
      quality: TrackingQuality,
      pinchPhase: PinchPhase,
    ) => {
      const bounds = stageRef.current?.getBoundingClientRect()
      const hand = result.hands[0] ?? null
      const gesturePointer = selectGesturePointer(hand)
      if (!bounds) return
      const filtered = pointerFilterRef.current.update(
        gesturePointer,
        result.timestampMs,
        quality === "reliable",
      )
      const mapped = filtered.point
        ? mapMirroredCameraPointToCanvas(filtered.point, bounds)
        : null
      publishGestureFeedback(
        resolveGestureModeFeedback(gesture, quality, pinchPhase),
      )
      if (pinchPhase !== "released" || gesture === "fist") {
        lastDrawingGestureAtRef.current = result.timestampMs
      }
      observePointer(mapped, filtered.reliable, bounds)
      if (gesturePaletteOpenRef.current) {
        if (pinchPhase !== "active") {
          gesturePalettePinchConsumedRef.current = false
        }
        const palette = stageRef.current?.querySelector<HTMLElement>(
          ".gesture-command-palette",
        )
        const control =
          mapped && filtered.reliable && palette
            ? findGesturePaletteControl(palette, mapped)
            : null
        if (control !== gesturePaletteHoverRef.current) {
          clearGesturePaletteHover()
          control?.setAttribute("data-gesture-hover", "")
          gesturePaletteHoverRef.current = control
        }
        updateGesturePointer(
          mapped,
          bounds,
          filtered.reliable,
          pinchPhase === "active",
        )
        drawingRef.current?.handleIntentions([
          { version: 1, type: "PAUSE", timestampMs: result.timestampMs },
        ])
        const paletteAction = resolveGesturePaletteAction(
          gesture,
          pinchPhase,
          control !== null && !gesturePalettePinchConsumedRef.current,
        )
        if (paletteAction === "select") {
          gesturePalettePinchConsumedRef.current = true
          control?.click()
        } else if (paletteAction === "close") closeGesturePalette()
        return
      }

      clearGesturePaletteHover()
      let dwellProgress = 0
      const canPrepareGestureMenu =
        gesture === "menu" &&
        pinchPhase === "released" &&
        filtered.reliable &&
        mapped &&
        canOpenGestureMenu(onboardingStateRef.current.step) &&
        gestureStateRef.current.mode !== "drawing" &&
        result.timestampMs - lastDrawingGestureAtRef.current >=
          gestureMenuPostDrawingGuardMs
      if (canPrepareGestureMenu) {
        const hold = gestureMenuHoldRef.current
        const moved = hold
          ? Math.hypot(mapped.x - hold.origin.x, mapped.y - hold.origin.y)
          : 0
        if (!hold || moved > gestureMenuMovementTolerance) {
          gestureMenuHoldRef.current = {
            startedAt: result.timestampMs,
            origin: mapped,
          }
        } else {
          dwellProgress = Math.min(
            1,
            (result.timestampMs - hold.startedAt) /
              GESTURE_THRESHOLDS.menuPoseHoldMs,
          )
          if (dwellProgress >= 1) {
            openGesturePalette(mapped, bounds)
            updateGesturePointer(mapped, bounds, true, false, 0)
            drawingRef.current?.handleIntentions([
              { version: 1, type: "PAUSE", timestampMs: result.timestampMs },
            ])
            return
          }
        }
      } else {
        gestureMenuHoldRef.current = null
      }

      const drawingMode = resolveGestureDrawingMode({
        gesture,
        pinchPhase,
        quality,
        hasReliablePoint: filtered.reliable && mapped !== null,
      })
      updateGesturePointer(
        mapped,
        bounds,
        filtered.reliable,
        drawingMode.temporaryEraser || drawingMode.pinchPhase === "active",
        dwellProgress,
      )
      drawingRef.current?.setStyle(
        drawingMode.temporaryEraser
          ? {
              ...drawingStyle,
              tool: "eraser",
              pattern: "solid",
              width: eraserThickness / 1000,
            }
          : drawingStyle,
      )
      const transition = transitionGestureState(gestureStateRef.current, {
        gesture: drawingMode.gesture,
        point: filtered.reliable ? mapped : null,
        timestampMs: result.timestampMs,
        continuous: !filtered.discontinuity,
        pinchPhase: drawingMode.pinchPhase,
      })
      gestureStateRef.current = transition.state
      if (
        transition.intentions.some(
          (intention) => intention.type === "DRAW_START",
        )
      ) {
        onStrokeStart()
      }
      observeStroke(transition.intentions, drawingMode.temporaryEraser)
      drawingRef.current?.handleIntentions(transition.intentions)
    },
    [
      clearGesturePaletteHover,
      closeGesturePalette,
      drawingStyle,
      eraserThickness,
      observePointer,
      observeStroke,
      onStrokeStart,
      onboardingStateRef,
      drawingRef,
      stageRef,
      openGesturePalette,
      publishGestureFeedback,
      updateGesturePointer,
    ],
  )

  const isGesturePaletteOpen = useCallback(
    () => gesturePaletteOpenRef.current,
    [],
  )
  return {
    gesturePaletteAnchor,
    gestureNotice,
    pointerOverlayRef,
    handleGestureFrame,
    openGesturePaletteFromDock,
    closeGesturePalette,
    isGesturePaletteOpen,
  }
}
