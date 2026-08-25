import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Undo2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import type {
  DrawingHistoryAvailability,
  DrawingStyle,
  StrokeAssistanceFeedback,
} from "@/core/drawing/canvas-drawing-controller"
import type { AssistedPrimitive } from "@/core/drawing/drawing-model"
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
import { mapMirroredCameraPointToCanvas } from "@/core/geometry/coordinate-mapping"

import {
  CameraPreview,
  type CameraPreviewHandle,
} from "@/features/camera/camera-preview"
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
import { findGestureControlAtPoint } from "@/features/toolbar/gesture-control-hit-test"
import {
  drawingColors,
  type DrawingColor,
  type DrawingTool,
} from "@/features/toolbar/drawing-tools"
import { ToolRail } from "@/features/toolbar/tool-rail"
import { TopBar } from "@/features/toolbar/top-bar"
import {
  DrawingCanvas,
  type DrawingCanvasHandle,
} from "@/features/workspace/drawing-canvas"
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
  const [thickness, setThickness] = useState(8)
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
  const cameraRef = useRef<CameraPreviewHandle>(null)
  const pointerFilterRef = useRef(new PointerMotionFilter())
  const gestureStateRef = useRef<GestureMachineState>(
    initialGestureMachineState,
  )
  const onboardingStateRef = useRef<OnboardingState>(initialState)
  const previousPinchPhaseRef = useRef<PinchPhase>("released")
  const gestureControlActiveRef = useRef(false)
  const tutorialStrokeRef = useRef<{
    lastPoint: { x: number; y: number } | null
    distance: number
  }>({ lastPoint: null, distance: 0 })

  const drawingStyle = useMemo<DrawingStyle>(
    () => ({
      tool: activeTool === "eraser" ? "eraser" : "pen",
      color,
      width: thickness / 1000,
    }),
    [activeTool, color, thickness],
  )

  const restartOnboarding = useCallback(() => {
    onboardingStateRef.current = initialOnboardingState
    resetOnboardingCompletion()
    setOnboardingState(initialOnboardingState)
    setActiveTool("pointer")
  }, [])

  const skipOnboarding = useCallback(() => {
    const complete = createOnboardingState("complete")
    onboardingStateRef.current = complete
    setOnboardingState(complete)
    setActiveTool("pen")
    saveOnboardingProgress({ status: "skipped", currentStep: "complete" })
  }, [])

  const goBackOnboarding = useCallback(() => {
    const previous = previousOnboardingStep(onboardingStateRef.current)
    onboardingStateRef.current = previous
    setOnboardingState(previous)
    setActiveTool(previous.step === "cursor" ? "pointer" : "pen")
    saveOnboardingProgress({
      status: "in_progress",
      currentStep: previous.step,
    })
  }, [])

  const observeOnboarding = useCallback((event: OnboardingEvent) => {
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
      setActiveTool("pen")
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
  }, [])

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
      const pinchBecameActive =
        pinchPhase === "active" && previousPinchPhaseRef.current !== "active"
      previousPinchPhaseRef.current = pinchPhase
      if (
        mapped &&
        filtered.reliable &&
        pinchBecameActive &&
        !gestureControlActiveRef.current
      ) {
        const control = findGestureControlAtPoint(mapped)
        if (control) {
          control.click()
          gestureControlActiveRef.current = true
        }
      }
      if (gestureControlActiveRef.current) {
        drawingRef.current?.handleIntentions([
          ...(mapped
            ? ([
                {
                  version: 1,
                  type: "POINTER_MOVE",
                  point: mapped,
                  timestampMs: result.timestampMs,
                },
              ] as const)
            : []),
          { version: 1, type: "PAUSE", timestampMs: result.timestampMs },
        ])
        if (pinchPhase === "released") gestureControlActiveRef.current = false
        return
      }
      const drawingGesture: GestureKind =
        quality === "lost"
          ? "tracking-lost"
          : quality === "uncertain"
            ? "uncertain"
            : activeTool === "pointer"
              ? "open-hand"
              : pinchPhase !== "released"
                ? "pinch"
                : gesture === "fist"
                  ? "fist"
                  : "open-hand"
      const transition = transitionGestureState(gestureStateRef.current, {
        gesture: drawingGesture,
        point: filtered.reliable ? mapped : null,
        timestampMs: result.timestampMs,
        continuous: !filtered.discontinuity,
        pinchPhase,
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
          tutorialStrokeRef.current.distance >= tutorialStrokeDistance
        ) {
          observeOnboarding({ type: "STROKE_COMPLETED" })
          tutorialStrokeRef.current = { lastPoint: null, distance: 0 }
        }
      }
      drawingRef.current?.handleIntentions(transition.intentions)
    },
    [activeTool, observeOnboarding],
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
      setThickness(nextThickness)
      observeOnboarding({ type: "THICKNESS_CHANGED" })
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
        setActiveTool("pen")
      } else if (!withCommand && !event.altKey && key === "e") {
        event.preventDefault()
        setActiveTool("eraser")
      } else if (
        !withCommand &&
        !event.altKey &&
        event.code === "Space" &&
        !(event.target instanceof HTMLButtonElement)
      ) {
        event.preventDefault()
        cameraRef.current?.togglePause()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [historyAvailability, redo, undo])

  return (
    <div
      className="workspace-shell"
      data-onboarding-step={
        onboardingState.step === "complete" ? undefined : onboardingState.step
      }
    >
      <a className="skip-link" href="#drawing-canvas">
        Aller à la toile
      </a>
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
          thickness={thickness}
          assistanceMode={assistanceMode}
          onToolChange={setActiveTool}
          onColorChange={changeColor}
          onThicknessChange={changeThickness}
          onAssistanceModeChange={changeAssistanceMode}
        />

        <section
          ref={stageRef}
          id="drawing-canvas"
          tabIndex={-1}
          aria-label="Toile de dessin vide"
          className="drawing-stage"
        >
          <DrawingCanvas
            ref={drawingRef}
            assistanceMode={assistanceMode}
            drawingStyle={drawingStyle}
            onAssistance={handleAssistance}
            onHistoryChange={setHistoryAvailability}
          />
          <div className="sr-only" aria-live="polite">
            {toolNames[activeTool]} sélectionné, {thickness} pixels
          </div>
          <CameraPreview
            ref={cameraRef}
            calibrating={onboardingState.step === "cursor"}
            onGestureFrame={handleGestureFrame}
          />
          {onboardingState.step !== "complete" ? (
            <OnboardingPractice state={onboardingState} />
          ) : null}
          {onboardingState.step !== "complete" ? (
            <GestureCoach
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
          {onboardingState.step === "complete" ? (
            <Button
              className="gesture-review-action h-10 active:scale-[0.96]"
              variant="secondary"
              onClick={restartOnboarding}
            >
              Revoir le tutoriel
            </Button>
          ) : null}
        </section>
      </main>
    </div>
  )
}
