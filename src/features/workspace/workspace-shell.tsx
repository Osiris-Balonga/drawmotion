import { useCallback, useRef, useState } from "react"

import type { GestureKind } from "@/core/gestures/gesture-classifier"
import {
  initialGestureMachineState,
  transitionGestureState,
  type GestureMachineState,
} from "@/core/gestures/gesture-state-machine"
import { PointerMotionFilter } from "@/core/gestures/pointer-motion-filter"
import { selectGesturePointer } from "@/core/gestures/gesture-pointer"
import { mapMirroredCameraPointToCanvas } from "@/core/geometry/coordinate-mapping"

import { CameraPreview } from "@/features/camera/camera-preview"
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
import { ToolRail, type DrawingTool } from "@/features/toolbar/tool-rail"
import { TopBar } from "@/features/toolbar/top-bar"
import {
  DrawingCanvas,
  type DrawingCanvasHandle,
} from "@/features/workspace/drawing-canvas"
import type { HandTrackingResult } from "@/infrastructure/mediapipe/hand-tracker-port"
import type { TrackingQuality } from "@/infrastructure/mediapipe/hand-tracking-session"
import { Button } from "@/components/ui/button"

import "./workspace.css"

const toolNames: Record<DrawingTool, string> = {
  pointer: "Pointeur",
  pen: "Stylo",
  eraser: "Gomme",
}

export function WorkspaceShell() {
  const [initialState] = useState<OnboardingState>(() =>
    loadOnboardingCompletion()
      ? { step: 3, stableFrames: 0 }
      : initialOnboardingState,
  )
  const [activeTool, setActiveTool] = useState<DrawingTool>("pen")
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(
    initialState.step,
  )
  const stageRef = useRef<HTMLElement>(null)
  const drawingRef = useRef<DrawingCanvasHandle>(null)
  const pointerFilterRef = useRef(new PointerMotionFilter())
  const gestureStateRef = useRef<GestureMachineState>(
    initialGestureMachineState,
  )
  const onboardingStateRef = useRef<OnboardingState>(initialState)

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
      pinchActive: boolean,
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
      const drawingGesture: GestureKind = pinchActive
        ? "pinch"
        : quality === "lost"
          ? "tracking-lost"
          : quality === "uncertain"
            ? "uncertain"
            : gesture === "fist"
              ? "fist"
              : "open-hand"
      const transition = transitionGestureState(gestureStateRef.current, {
        gesture: drawingGesture,
        point: filtered.reliable ? mapped : null,
        timestampMs: result.timestampMs,
        continuous: !filtered.discontinuity,
      })
      gestureStateRef.current = transition.state
      drawingRef.current?.handleIntentions(transition.intentions)
    },
    [onboardingStep],
  )

  return (
    <div className="workspace-shell">
      <a className="skip-link" href="#drawing-canvas">
        Aller à la toile
      </a>
      <TopBar />
      <main className="workspace-main">
        <ToolRail activeTool={activeTool} onToolChange={setActiveTool} />

        <section
          ref={stageRef}
          id="drawing-canvas"
          tabIndex={-1}
          aria-label="Toile de dessin vide"
          className="drawing-stage"
        >
          <DrawingCanvas ref={drawingRef} />
          <div className="sr-only" aria-live="polite">
            {toolNames[activeTool]} sélectionné — simulation
          </div>
          <CameraPreview
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
            <Button
              className="gesture-review-action h-10 active:scale-[0.96]"
              variant="secondary"
              onClick={restartOnboarding}
            >
              Revoir les gestes
            </Button>
          ) : null}
        </section>
      </main>
    </div>
  )
}
