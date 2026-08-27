import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"
import type { DrawingIntention } from "@/core/gestures/drawing-intentions"
import type { DrawingTool } from "@/features/toolbar/drawing-tools"
import {
  createOnboardingState,
  initialOnboardingState,
  observeOnboardingEvent,
  previousOnboardingStep,
  type OnboardingEvent,
  type OnboardingState,
} from "./onboarding-machine"
import {
  resetOnboardingCompletion,
  saveOnboardingProgress,
} from "./onboarding-persistence"

const cursorPracticeTargets = [
  { x: 0.28, y: 0.36 },
  { x: 0.5, y: 0.24 },
  { x: 0.68, y: 0.48 },
] as const

const tutorialStrokeDistance = 120

export function useWorkspaceOnboarding(
  initialState: OnboardingState,
  changeTool: (tool: DrawingTool) => void,
) {
  const [onboardingState, setOnboardingState] = useState(initialState)
  const onboardingStateRef = useRef(initialState)
  const tutorialStrokeRef = useRef<{
    lastPoint: { x: number; y: number } | null
    distance: number
  }>({ lastPoint: null, distance: 0 })
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

  const observePointer = useCallback(
    (
      point: { x: number; y: number } | null,
      reliable: boolean,
      bounds: DOMRect,
    ) => {
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
          reliable &&
          point &&
          targetPoint &&
          Math.hypot(point.x - targetPoint.x, point.y - targetPoint.y) < 52,
        )
        observeOnboarding({ type: "CURSOR_TARGET_OBSERVED", inside })
      }
    },
    [observeOnboarding],
  )
  const observeStroke = useCallback(
    (intentions: DrawingIntention[], erasing: boolean) => {
      for (const intention of intentions) {
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
          !erasing &&
          tutorialStrokeRef.current.distance >= tutorialStrokeDistance
        ) {
          observeOnboarding({ type: "STROKE_COMPLETED" })
          tutorialStrokeRef.current = { lastPoint: null, distance: 0 }
        }
      }
    },
    [observeOnboarding],
  )
  return {
    onboardingState,
    onboardingStateRef,
    observeOnboarding,
    observePointer,
    observeStroke,
    restartOnboarding,
    skipOnboarding,
    goBackOnboarding,
  }
}
