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
import { GestureCoach } from "@/features/onboarding/gesture-coach"
import {
  initialOnboardingState,
  observeOnboardingGesture,
  previousOnboardingStep,
  type OnboardingState,
  type OnboardingStep,
} from "@/features/onboarding/onboarding-machine"
import {
  loadOnboardingCompletion,
  resetOnboardingCompletion,
  saveOnboardingCompletion,
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
  const [initialState] = useState<OnboardingState>(() =>
    loadOnboardingCompletion()
      ? { step: 3, stableFrames: 0 }
      : initialOnboardingState,
  )
  const [activeTool, setActiveTool] = useState<DrawingTool>("pen")
  const [color, setColor] = useState<DrawingColor>(drawingColors[0].value)
  const [thickness, setThickness] = useState(8)
  const [assistanceMode, setAssistanceMode] =
    useState<StrokeAssistanceMode>("stabilized")
  const [lastAssistance, setLastAssistance] =
    useState<StrokeAssistanceFeedback | null>(null)
  const [historyAvailability, setHistoryAvailability] = useState(
    emptyHistoryAvailability,
  )
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(
    initialState.step,
  )
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
    setOnboardingStep(0)
  }, [])

  const goBackOnboarding = useCallback(() => {
    const previous = previousOnboardingStep(onboardingStateRef.current)
    onboardingStateRef.current = previous
    setOnboardingStep(previous.step)
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
      const onboarding = observeOnboardingGesture(
        onboardingStateRef.current,
        gesture,
      )
      onboardingStateRef.current = onboarding
      if (onboarding.step !== onboardingStep) {
        setOnboardingStep(onboarding.step)
        if (onboarding.step === 3) saveOnboardingCompletion()
      }
      const filtered = pointerFilterRef.current.update(
        gesturePointer,
        result.timestampMs,
        quality === "reliable",
      )
      const mapped = filtered.point
        ? mapMirroredCameraPointToCanvas(filtered.point, bounds)
        : null
      if (onboarding.step < 3) return
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
      drawingRef.current?.handleIntentions(transition.intentions)
    },
    [activeTool, onboardingStep],
  )

  const changeAssistanceMode = useCallback((mode: StrokeAssistanceMode) => {
    setAssistanceMode(mode)
    setLastAssistance(null)
  }, [])

  const revertLastAssistance = useCallback(() => {
    if (!lastAssistance) return
    if (drawingRef.current?.revertAssistance(lastAssistance.strokeId)) {
      setLastAssistance(null)
    }
  }, [lastAssistance])

  const undo = useCallback(() => drawingRef.current?.undo(), [])
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
    <div className="workspace-shell">
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
          onColorChange={setColor}
          onThicknessChange={setThickness}
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
            onAssistance={setLastAssistance}
            onHistoryChange={setHistoryAvailability}
          />
          <div className="sr-only" aria-live="polite">
            {toolNames[activeTool]} sélectionné, {thickness} pixels
          </div>
          <CameraPreview
            ref={cameraRef}
            calibrating={onboardingStep < 3}
            onGestureFrame={handleGestureFrame}
          />
          {onboardingStep < 3 ? (
            <GestureCoach
              step={onboardingStep as 0 | 1 | 2}
              onBack={goBackOnboarding}
              onRestart={restartOnboarding}
            />
          ) : null}
          {onboardingStep === 3 ? (
            <>
              {lastAssistance ? (
                <div
                  className="shape-assistance-feedback"
                  role="status"
                  aria-live="polite"
                >
                  <span>
                    {primitiveNames[lastAssistance.primitive]} régularisé
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={revertLastAssistance}
                  >
                    <Undo2 aria-hidden="true" />
                    Garder mon tracé
                  </Button>
                </div>
              ) : null}
              <Button
                className="gesture-review-action h-10 active:scale-[0.96]"
                variant="secondary"
                onClick={restartOnboarding}
              >
                Revoir les gestes
              </Button>
            </>
          ) : null}
        </section>
      </main>
    </div>
  )
}
