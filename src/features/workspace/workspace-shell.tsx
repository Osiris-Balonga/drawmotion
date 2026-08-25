import { useCallback, useRef, useState } from "react"

import type { GestureKind } from "@/core/gestures/gesture-classifier"
import {
  initialGestureMachineState,
  transitionGestureState,
  type GestureMachineState,
} from "@/core/gestures/gesture-state-machine"
import { PointerMotionFilter } from "@/core/gestures/pointer-motion-filter"
import { selectGesturePointer } from "@/core/gestures/gesture-pointer"
import {
  COMFORTABLE_CAMERA_REGION,
  mapMirroredCameraPointToCanvas,
} from "@/core/geometry/coordinate-mapping"

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
  const [showRecoveryGuidance, setShowRecoveryGuidance] = useState(false)
  const stageRef = useRef<HTMLElement>(null)
  const drawingRef = useRef<DrawingCanvasHandle>(null)
  const pointerFilterRef = useRef(new PointerMotionFilter())
  const gestureStateRef = useRef<GestureMachineState>(
    initialGestureMachineState,
  )
  const onboardingStateRef = useRef<OnboardingState>(initialState)
  const hesitationFramesRef = useRef(0)

  const restartOnboarding = useCallback(() => {
    onboardingStateRef.current = initialOnboardingState
    resetOnboardingCompletion()
    setOnboardingStep(0)
    setShowRecoveryGuidance(false)
  }, [])

  const goBackOnboarding = useCallback(() => {
    const previous = previousOnboardingStep(onboardingStateRef.current)
    onboardingStateRef.current = previous
    setOnboardingStep(previous.step)
  }, [])

  const handleGestureFrame = useCallback(
    (result: HandTrackingResult, gesture: GestureKind) => {
      const bounds = stageRef.current?.getBoundingClientRect()
      const hand = result.hands[0] ?? null
      const gesturePointer = selectGesturePointer(hand, gesture)
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
      if (onboarding.step === 3) {
        if (gesture === "uncertain" || gesture === "tracking-lost") {
          hesitationFramesRef.current += 1
          if (hesitationFramesRef.current === 30) {
            setShowRecoveryGuidance(true)
          }
        } else {
          hesitationFramesRef.current = 0
          if (showRecoveryGuidance) setShowRecoveryGuidance(false)
        }
      }
      const filtered = pointerFilterRef.current.update(
        gesturePointer,
        result.timestampMs,
        gesture !== "uncertain" && gesture !== "tracking-lost",
      )
      const mapped = filtered.point
        ? mapMirroredCameraPointToCanvas(
            filtered.point,
            bounds,
            COMFORTABLE_CAMERA_REGION,
          )
        : null
      if (onboarding.step < 3) return
      const transition = transitionGestureState(gestureStateRef.current, {
        gesture,
        point: filtered.reliable ? mapped : null,
        timestampMs: result.timestampMs,
      })
      gestureStateRef.current = transition.state
      drawingRef.current?.handleIntentions(transition.intentions)
    },
    [onboardingStep, showRecoveryGuidance],
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
            calibrating={onboardingStep < 3 || showRecoveryGuidance}
            onGestureFrame={handleGestureFrame}
          />
          {onboardingStep < 3 || showRecoveryGuidance ? (
            <GestureCoach
              step={showRecoveryGuidance ? 0 : (onboardingStep as 0 | 1 | 2)}
              onBack={goBackOnboarding}
              onRestart={restartOnboarding}
            />
          ) : null}
          {onboardingStep === 3 && !showRecoveryGuidance ? (
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
