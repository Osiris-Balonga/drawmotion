import { useCallback, useRef, useState } from "react"

import type { GestureKind } from "@/core/gestures/gesture-classifier"
import {
  initialGestureMachineState,
  transitionGestureState,
  type GestureMachineState,
} from "@/core/gestures/gesture-state-machine"
import { PointerMotionFilter } from "@/core/gestures/pointer-motion-filter"
import { mapMirroredCameraPointToCanvas } from "@/core/geometry/coordinate-mapping"

import { CameraPreview } from "@/features/camera/camera-preview"
import { GestureCoach } from "@/features/onboarding/gesture-coach"
import { ToolRail, type DrawingTool } from "@/features/toolbar/tool-rail"
import { TopBar } from "@/features/toolbar/top-bar"
import {
  DrawingCanvas,
  type DrawingCanvasHandle,
} from "@/features/workspace/drawing-canvas"
import type { HandTrackingResult } from "@/infrastructure/mediapipe/hand-tracker-port"

import "./workspace.css"

const toolNames: Record<DrawingTool, string> = {
  pointer: "Pointeur",
  pen: "Stylo",
  eraser: "Gomme",
}

export function WorkspaceShell() {
  const [activeTool, setActiveTool] = useState<DrawingTool>("pen")
  const [coachStep, setCoachStep] = useState(0)
  const stageRef = useRef<HTMLElement>(null)
  const drawingRef = useRef<DrawingCanvasHandle>(null)
  const pointerFilterRef = useRef(new PointerMotionFilter())
  const gestureStateRef = useRef<GestureMachineState>(
    initialGestureMachineState,
  )

  const handleGestureFrame = useCallback(
    (result: HandTrackingResult, gesture: GestureKind) => {
      const bounds = stageRef.current?.getBoundingClientRect()
      const indexTip = result.hands[0]?.landmarks[8]
      if (!bounds) return
      const mapped = indexTip
        ? mapMirroredCameraPointToCanvas(indexTip, bounds)
        : null
      const filtered = pointerFilterRef.current.update(
        mapped,
        result.timestampMs,
        gesture !== "uncertain" && gesture !== "tracking-lost",
      )
      const transition = transitionGestureState(gestureStateRef.current, {
        gesture,
        point: filtered.reliable ? filtered.point : null,
        timestampMs: result.timestampMs,
      })
      gestureStateRef.current = transition.state
      drawingRef.current?.handleIntentions(transition.intentions)
    },
    [],
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
          <CameraPreview onGestureFrame={handleGestureFrame} />
          <GestureCoach step={coachStep} onStepChange={setCoachStep} />
        </section>
      </main>
    </div>
  )
}
