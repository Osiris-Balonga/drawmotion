import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react"

import { MonitorUp, Undo2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import type {
  DrawingHistoryAvailability,
  DrawingStyle,
  StrokeAssistanceFeedback,
} from "@/core/drawing/canvas-drawing-controller"
import {
  initialCanvasViewport,
  panCanvasViewport,
  zoomCanvasViewport,
  type CanvasViewport,
} from "@/core/drawing/canvas-viewport"
import type { AssistedPrimitive } from "@/core/drawing/drawing-model"
import type { StrokePattern } from "@/core/drawing/drawing-model"
import type { StrokeAssistanceMode } from "@/core/drawing/stroke-assistance"
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

import { CameraPreview } from "@/features/camera/camera-preview"
import { createPngFilename, downloadPng } from "@/features/export/png-download"
import {
  GestureCoach,
  OnboardingPractice,
} from "@/features/onboarding/gesture-coach"
import {
  createOnboardingState,
  initialOnboardingState,
  observeOnboardingEvent,
  previousOnboardingStep,
  type OnboardingEvent,
  type OnboardingState,
} from "@/features/onboarding/onboarding-machine"
import {
  loadOnboardingProgress,
  resetOnboardingCompletion,
  saveOnboardingProgress,
} from "@/features/onboarding/onboarding-persistence"
import {
  drawingColors,
  type DrawingColor,
  type DrawingTool,
} from "@/features/toolbar/drawing-tools"
import { ToolRail } from "@/features/toolbar/tool-rail"
import { TopBar } from "@/features/toolbar/top-bar"
import { CanvasViewportControls } from "@/features/workspace/canvas-viewport-controls"
import {
  DrawingCanvas,
  type DrawingCanvasHandle,
} from "@/features/workspace/drawing-canvas"
import { GestureCommandPalette } from "@/features/workspace/gesture-command-palette"
import { resolveGestureDrawingMode } from "@/features/workspace/gesture-drawing-mode"
import { canOpenGestureMenu } from "@/features/workspace/gesture-menu-availability"
import {
  resolveGestureModeFeedback,
  type GestureModeFeedback,
} from "@/features/workspace/gesture-mode-feedback"
import { findGesturePaletteControl } from "@/features/workspace/gesture-palette-hit-test"
import { resolveGesturePaletteAction } from "@/features/workspace/gesture-palette-interaction"
import type { HandTrackingResult } from "@/infrastructure/mediapipe/hand-tracker-port"
import type { TrackingQuality } from "@/infrastructure/mediapipe/hand-tracking-session"
import "./workspace.css"

const toolNames: Record<DrawingTool, string> = {
  pointer: "Pointeur",
  pen: "Stylo",
  eraser: "Gomme",
}

const primitiveNames: Record<AssistedPrimitive, string> = {
  line: "Ligne",
  circle: "Cercle",
  ellipse: "Ellipse",
  rectangle: "Rectangle",
}

const emptyHistoryAvailability: DrawingHistoryAvailability = {
  canUndo: false,
  canRedo: false,
  canClear: false,
}

const cursorPracticeTargets = [
  { x: 0.28, y: 0.36 },
  { x: 0.5, y: 0.24 },
  { x: 0.68, y: 0.48 },
] as const

const tutorialStrokeDistance = 120
const gestureMenuPostDrawingGuardMs = 250
const gestureMenuMovementTolerance = 36
const gesturePointerRadius = 6
const gestureNoticeDurationMs = 1650

type GestureMenuHold = {
  startedAt: number
  origin: { x: number; y: number }
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT")
  )
}

export function WorkspaceShell() {
  const [initialState] = useState<OnboardingState>(() => {
    const progress = loadOnboardingProgress()
    return createOnboardingState(progress.currentStep)
  })
  const [activeTool, setActiveTool] = useState<DrawingTool>(() =>
    initialState.step === "cursor" ? "pointer" : "pen",
  )
  const [color, setColor] = useState<DrawingColor>(drawingColors[0].value)
  const [penThickness, setPenThickness] = useState(8)
  const [eraserThickness, setEraserThickness] = useState(40)
  const [strokePattern, setStrokePattern] = useState<StrokePattern>("solid")
  const [viewport, setViewport] = useState<CanvasViewport>(
    initialCanvasViewport,
  )
  const [gesturePaletteAnchor, setGesturePaletteAnchor] = useState<{
    x: number
    y: number
  } | null>(null)
  const [gestureNotice, setGestureNotice] =
    useState<GestureModeFeedback | null>(null)
  const [assistanceMode, setAssistanceMode] =
    useState<StrokeAssistanceMode>("stabilized")
  const [lastAssistance, setLastAssistance] =
    useState<StrokeAssistanceFeedback | null>(null)
  const [historyAvailability, setHistoryAvailability] = useState(
    emptyHistoryAvailability,
  )
  const [onboardingState, setOnboardingState] =
    useState<OnboardingState>(initialState)
  const stageRef = useRef<HTMLElement>(null)
  const drawingRef = useRef<DrawingCanvasHandle>(null)
  const pointerOverlayRef = useRef<HTMLDivElement>(null)
  const pointerFilterRef = useRef(new PointerMotionFilter())
  const viewportRef = useRef(viewport)
  const activeToolRef = useRef(activeTool)
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
  const panSessionRef = useRef<{
    pointerId: number
    x: number
    y: number
  } | null>(null)
  const spacePanRef = useRef(false)
  const gestureStateRef = useRef<GestureMachineState>(
    initialGestureMachineState,
  )
  const onboardingStateRef = useRef<OnboardingState>(initialState)
  const tutorialStrokeRef = useRef<{
    lastPoint: { x: number; y: number } | null
    distance: number
  }>({ lastPoint: null, distance: 0 })
  const activeThickness =
    activeTool === "eraser" ? eraserThickness : penThickness

  const drawingStyle = useMemo<DrawingStyle>(
    () => ({
      tool: activeTool === "eraser" ? "eraser" : "pen",
      color,
      width: activeThickness / 1000,
      pattern: activeTool === "eraser" ? "solid" : strokePattern,
    }),
    [activeThickness, activeTool, color, strokePattern],
  )

  const changeTool = useCallback((tool: DrawingTool) => {
    activeToolRef.current = tool
    setActiveTool(tool)
  }, [])

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
    [changeTool],
  )

  useEffect(
    () => () => {
      if (gestureNoticeTimerRef.current) {
        clearTimeout(gestureNoticeTimerRef.current)
      }
    },
    [],
  )

  const restartOnboarding = useCallback(() => {
    onboardingStateRef.current = initialOnboardingState
    resetOnboardingCompletion()
    setOnboardingState(initialOnboardingState)
    changeTool("pointer")
  }, [changeTool])

  const skipOnboarding = useCallback(() => {
    const complete = createOnboardingState("complete")
    onboardingStateRef.current = complete
    setOnboardingState(complete)
    changeTool("pen")
    saveOnboardingProgress({ status: "skipped", currentStep: "complete" })
  }, [changeTool])

  const goBackOnboarding = useCallback(() => {
    const previous = previousOnboardingStep(onboardingStateRef.current)
    onboardingStateRef.current = previous
    setOnboardingState(previous)
    changeTool(previous.step === "cursor" ? "pointer" : "pen")
    saveOnboardingProgress({
      status: "in_progress",
      currentStep: previous.step,
    })
  }, [changeTool])

  const observeOnboarding = useCallback(
    (event: OnboardingEvent) => {
      const previous = onboardingStateRef.current
      const next = observeOnboardingEvent(previous, event)
      onboardingStateRef.current = next
      const visibleProgressChanged =
        next.step !== previous.step ||
        next.cursorTarget !== previous.cursorTarget ||
        next.colorChanged !== previous.colorChanged ||
        next.thicknessChanged !== previous.thicknessChanged
      if (!visibleProgressChanged) return

      setOnboardingState(next)
      if (previous.step === "cursor" && next.step === "draw") {
        changeTool("pen")
      }
      saveOnboardingProgress({
        status: next.step === "complete" ? "completed" : "in_progress",
        currentStep: next.step,
      })
      if (next.step === "complete") {
        toast.success("Vous êtes prêt à dessiner", {
          description: "Le tutoriel reste accessible depuis la toile.",
        })
      }
    },
    [changeTool],
  )

  const updateViewport = useCallback(
    (update: (current: CanvasViewport) => CanvasViewport) => {
      setViewport((current) => {
        const next = update(current)
        viewportRef.current = next
        return next
      })
    },
    [],
  )

  const zoomAtStageCenter = useCallback(
    (factor: number) => {
      const bounds = stageRef.current?.getBoundingClientRect()
      if (!bounds) return
      updateViewport((current) =>
        zoomCanvasViewport(current, current.zoom * factor, {
          x: bounds.width / 2,
          y: bounds.height / 2,
        }),
      )
    },
    [updateViewport],
  )

  const resetViewport = useCallback(() => {
    viewportRef.current = initialCanvasViewport
    setViewport(initialCanvasViewport)
  }, [])

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
  }, [openGesturePalette])

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
      if (onboardingStateRef.current.step === "cursor") {
        const target =
          cursorPracticeTargets[onboardingStateRef.current.cursorTarget]
        const targetPoint = target
          ? {
              x: bounds.left + target.x * bounds.width,
              y: bounds.top + target.y * bounds.height,
            }
          : null
        const inside = Boolean(
          filtered.reliable &&
          mapped &&
          targetPoint &&
          Math.hypot(mapped.x - targetPoint.x, mapped.y - targetPoint.y) < 52,
        )
        observeOnboarding({ type: "CURSOR_TARGET_OBSERVED", inside })
      }
      if (gesturePaletteOpenRef.current) {
        if (pinchPhase !== "active") {
          gesturePalettePinchConsumedRef.current = false
        }
        const palette = document.querySelector<HTMLElement>(
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
        activeTool,
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
              width: Math.max(0.04, drawingStyle.width),
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
        setLastAssistance(null)
      }
      for (const intention of transition.intentions) {
        if (intention.type === "DRAW_START") {
          tutorialStrokeRef.current = {
            lastPoint: intention.point,
            distance: 0,
          }
        } else if (intention.type === "DRAW_MOVE") {
          const lastPoint = tutorialStrokeRef.current.lastPoint
          if (lastPoint) {
            tutorialStrokeRef.current.distance += Math.hypot(
              intention.point.x - lastPoint.x,
              intention.point.y - lastPoint.y,
            )
          }
          tutorialStrokeRef.current.lastPoint = intention.point
        } else if (
          intention.type === "DRAW_END" &&
          !drawingMode.temporaryEraser &&
          tutorialStrokeRef.current.distance >= tutorialStrokeDistance
        ) {
          observeOnboarding({ type: "STROKE_COMPLETED" })
          tutorialStrokeRef.current = { lastPoint: null, distance: 0 }
        }
      }
      drawingRef.current?.handleIntentions(transition.intentions)
    },
    [
      activeTool,
      clearGesturePaletteHover,
      closeGesturePalette,
      drawingStyle,
      observeOnboarding,
      openGesturePalette,
      publishGestureFeedback,
      updateGesturePointer,
    ],
  )

  const changeAssistanceMode = useCallback((mode: StrokeAssistanceMode) => {
    setAssistanceMode(mode)
    setLastAssistance(null)
  }, [])

  const changeColor = useCallback(
    (nextColor: DrawingColor) => {
      setColor(nextColor)
      if (nextColor === "#238554") {
        observeOnboarding({ type: "COLOR_CHANGED" })
      }
    },
    [observeOnboarding],
  )

  const changeThickness = useCallback(
    (nextThickness: number) => {
      if (activeToolRef.current === "eraser") {
        setEraserThickness(nextThickness)
      } else {
        setPenThickness(nextThickness)
        observeOnboarding({ type: "THICKNESS_CHANGED" })
      }
    },
    [observeOnboarding],
  )

  const handleAssistance = useCallback(
    (feedback: StrokeAssistanceFeedback) => {
      setLastAssistance(feedback)
      if (assistanceMode === "shapes") {
        observeOnboarding({ type: "ASSISTED_SHAPE_CREATED" })
      }
    },
    [assistanceMode, observeOnboarding],
  )

  const revertLastAssistance = useCallback(() => {
    if (!lastAssistance) return
    if (drawingRef.current?.revertAssistance(lastAssistance.strokeId)) {
      setLastAssistance(null)
    }
  }, [lastAssistance])

  const undo = useCallback(() => {
    drawingRef.current?.undo()
    observeOnboarding({ type: "UNDO_USED" })
  }, [observeOnboarding])
  const redo = useCallback(() => drawingRef.current?.redo(), [])
  const clear = useCallback(() => {
    drawingRef.current?.clear()
    setLastAssistance(null)
  }, [])
  const exportPng = useCallback(async () => {
    try {
      const blob = await drawingRef.current?.exportPng()
      if (!blob) throw new Error("Canvas unavailable")
      const filename = createPngFilename()
      downloadPng(blob, filename)
      toast.success("Dessin exporté", { description: filename })
    } catch {
      toast.error("L’export PNG a échoué", {
        description: "Réessayez après avoir terminé votre trait.",
      })
    }
  }, [])

  const handleStageWheel = useCallback(
    (event: ReactWheelEvent<HTMLElement>) => {
      if (
        event.target instanceof Element &&
        event.target.closest("button, select, input, [role='dialog']")
      ) {
        return
      }
      event.preventDefault()
      const bounds = event.currentTarget.getBoundingClientRect()
      if (event.ctrlKey || event.metaKey) {
        const factor = Math.exp(-event.deltaY * 0.002)
        updateViewport((current) =>
          zoomCanvasViewport(current, current.zoom * factor, {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          }),
        )
      } else {
        updateViewport((current) =>
          panCanvasViewport(current, {
            x: -event.deltaX,
            y: -event.deltaY,
          }),
        )
      }
    },
    [updateViewport],
  )

  const handleStagePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const canPan =
        event.button === 1 || (event.button === 0 && spacePanRef.current)
      if (!canPan) return
      if (
        event.target instanceof Element &&
        event.target.closest("button, select, input, [role='dialog']")
      ) {
        return
      }
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      event.currentTarget.setAttribute("data-panning", "")
      panSessionRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      }
    },
    [],
  )

  const handleStagePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const session = panSessionRef.current
      if (!session || session.pointerId !== event.pointerId) return
      const delta = {
        x: event.clientX - session.x,
        y: event.clientY - session.y,
      }
      session.x = event.clientX
      session.y = event.clientY
      updateViewport((current) => panCanvasViewport(current, delta))
    },
    [updateViewport],
  )

  const finishStagePan = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const session = panSessionRef.current
      if (!session || session.pointerId !== event.pointerId) return
      panSessionRef.current = null
      event.currentTarget.removeAttribute("data-panning")
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    },
    [],
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return
      const key = event.key.toLowerCase()
      const withCommand = event.ctrlKey || event.metaKey
      if (withCommand && key === "z") {
        const canApply = event.shiftKey
          ? historyAvailability.canRedo
          : historyAvailability.canUndo
        if (!canApply) return
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (withCommand && key === "y" && historyAvailability.canRedo) {
        event.preventDefault()
        redo()
      } else if (!withCommand && !event.altKey && key === "p") {
        event.preventDefault()
        changeTool("pen")
      } else if (!withCommand && !event.altKey && key === "e") {
        event.preventDefault()
        changeTool("eraser")
      } else if (!withCommand && !event.altKey && key === "m") {
        event.preventDefault()
        if (gesturePaletteOpenRef.current) closeGesturePalette()
        else openGesturePaletteFromDock()
      } else if (
        !withCommand &&
        !event.altKey &&
        (key === "+" || key === "=")
      ) {
        event.preventDefault()
        zoomAtStageCenter(1.2)
      } else if (!withCommand && !event.altKey && key === "-") {
        event.preventDefault()
        zoomAtStageCenter(1 / 1.2)
      } else if (!withCommand && !event.altKey && key === "0") {
        event.preventDefault()
        resetViewport()
      } else if (event.key === "Escape" && gesturePaletteOpenRef.current) {
        event.preventDefault()
        closeGesturePalette()
      } else if (
        !withCommand &&
        !event.altKey &&
        event.code === "Space" &&
        !(event.target instanceof HTMLButtonElement)
      ) {
        event.preventDefault()
        spacePanRef.current = true
        stageRef.current?.setAttribute("data-pan-ready", "")
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return
      spacePanRef.current = false
      stageRef.current?.removeAttribute("data-pan-ready")
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [
    closeGesturePalette,
    changeTool,
    historyAvailability,
    openGesturePaletteFromDock,
    redo,
    resetViewport,
    undo,
    zoomAtStageCenter,
  ])

  return (
    <div
      className="workspace-shell"
      data-gesture-palette-open={gesturePaletteAnchor ? "" : undefined}
      data-onboarding-step={
        onboardingState.step === "complete" ? undefined : onboardingState.step
      }
    >
      <a className="skip-link" href="#drawing-canvas">
        Aller à la toile
      </a>
      <section
        className="mobile-workspace-notice"
        aria-labelledby="mobile-title"
      >
        <MonitorUp aria-hidden="true" />
        <div>
          <h1 id="mobile-title">Un écran plus large est nécessaire</h1>
          <p>
            DrawMotion est conçu pour ordinateur et tablette. Agrandissez la
            fenêtre ou passez la tablette en paysage. Sur téléphone, ouvrez
            cette même adresse sur un ordinateur équipé d’une webcam.
          </p>
        </div>
      </section>
      <TopBar
        {...historyAvailability}
        onUndo={undo}
        onRedo={redo}
        onClear={clear}
        onExport={() => void exportPng()}
      />
      <main className="workspace-main">
        <ToolRail
          activeTool={activeTool}
          color={color}
          thickness={activeThickness}
          strokePattern={strokePattern}
          assistanceMode={assistanceMode}
          onToolChange={changeTool}
          onColorChange={changeColor}
          onThicknessChange={changeThickness}
          onStrokePatternChange={setStrokePattern}
          onAssistanceModeChange={changeAssistanceMode}
          onReplayOnboarding={restartOnboarding}
          onOpenGestureCommands={openGesturePaletteFromDock}
        />

        <section
          ref={stageRef}
          id="drawing-canvas"
          tabIndex={-1}
          aria-label="Toile de dessin vide"
          className="drawing-stage"
          onPointerDown={handleStagePointerDown}
          onPointerMove={handleStagePointerMove}
          onPointerUp={finishStagePan}
          onPointerCancel={finishStagePan}
          onWheel={handleStageWheel}
        >
          <DrawingCanvas
            ref={drawingRef}
            assistanceMode={assistanceMode}
            drawingStyle={drawingStyle}
            renderPointer={false}
            viewport={viewport}
            onAssistance={handleAssistance}
            onHistoryChange={setHistoryAvailability}
          />
          <div className="sr-only" aria-live="polite">
            {toolNames[activeTool]} sélectionné, {activeThickness} pixels
          </div>
          <CameraPreview
            calibrating={onboardingState.step === "cursor"}
            gestureNotice={gestureNotice}
            onGestureFrame={handleGestureFrame}
          />
          <CanvasViewportControls
            zoom={viewport.zoom}
            onZoomIn={() => zoomAtStageCenter(1.2)}
            onZoomOut={() => zoomAtStageCenter(1 / 1.2)}
            onReset={resetViewport}
          />
          {onboardingState.step !== "complete" && !gesturePaletteAnchor ? (
            <OnboardingPractice state={onboardingState} />
          ) : null}
          {onboardingState.step !== "complete" && !gesturePaletteAnchor ? (
            <GestureCoach
              key={onboardingState.step}
              state={onboardingState}
              onBack={goBackOnboarding}
              onSkip={skipOnboarding}
            />
          ) : null}
          {lastAssistance ? (
            <div
              className="shape-assistance-feedback"
              role="status"
              aria-live="polite"
            >
              <span>{primitiveNames[lastAssistance.primitive]} régularisé</span>
              <Button size="sm" variant="ghost" onClick={revertLastAssistance}>
                <Undo2 aria-hidden="true" />
                Garder mon tracé
              </Button>
            </div>
          ) : null}
          {gesturePaletteAnchor ? (
            <GestureCommandPalette
              anchor={gesturePaletteAnchor}
              activeTool={activeTool}
              color={color}
              thickness={activeThickness}
              pattern={strokePattern}
              assistanceMode={assistanceMode}
              onColorChange={(nextColor) => {
                changeColor(nextColor)
                changeTool("pen")
              }}
              onThicknessChange={(nextThickness) => {
                changeThickness(nextThickness)
              }}
              onPatternChange={(nextPattern) => {
                setStrokePattern(nextPattern)
                changeTool("pen")
              }}
              onAssistanceModeChange={changeAssistanceMode}
              onUndo={undo}
              onClose={closeGesturePalette}
            />
          ) : null}
          <div
            ref={pointerOverlayRef}
            aria-hidden="true"
            className="gesture-pointer-overlay"
          >
            <svg viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" />
            </svg>
          </div>
        </section>
      </main>
    </div>
  )
}
