import { useCallback, useMemo, useRef, useState } from "react"
import { MonitorUp, Undo2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import type {
  DrawingHistoryAvailability,
  DrawingStyle,
  StrokeAssistanceFeedback,
} from "@/core/drawing/canvas-drawing-controller"
import type {
  AssistedPrimitive,
  StrokePattern,
} from "@/core/drawing/drawing-model"
import type { StrokeAssistanceMode } from "@/core/drawing/stroke-assistance"
import { CameraPreview } from "@/features/camera/camera-preview"
import { createPngFilename, downloadPng } from "@/features/export/png-download"
import {
  GestureCoach,
  OnboardingPractice,
} from "@/features/onboarding/gesture-coach"
import {
  createOnboardingState,
  type OnboardingState,
} from "@/features/onboarding/onboarding-machine"
import { loadOnboardingProgress } from "@/features/onboarding/onboarding-persistence"
import { useWorkspaceOnboarding } from "@/features/onboarding/use-workspace-onboarding"
import {
  drawingColors,
  type DrawingColor,
  type DrawingTool,
} from "@/features/toolbar/drawing-tools"
import { ToolRail } from "@/features/toolbar/tool-rail"
import { TopBar } from "@/features/toolbar/top-bar"
import { CanvasViewportControls } from "./canvas-viewport-controls"
import { DrawingCanvas, type DrawingCanvasHandle } from "./drawing-canvas"
import { GestureCommandPalette } from "./gesture-command-palette"
import { useWorkspaceGestures } from "./use-workspace-gestures"
import { useWorkspaceNavigation } from "./use-workspace-navigation"
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
  const [assistanceMode, setAssistanceMode] =
    useState<StrokeAssistanceMode>("stabilized")
  const [lastAssistance, setLastAssistance] =
    useState<StrokeAssistanceFeedback | null>(null)
  const [historyAvailability, setHistoryAvailability] = useState(
    emptyHistoryAvailability,
  )
  const stageRef = useRef<HTMLElement>(null)
  const drawingRef = useRef<DrawingCanvasHandle>(null)
  const activeToolRef = useRef(activeTool)
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

  const onboarding = useWorkspaceOnboarding(initialState, changeTool)
  const {
    onboardingState,
    observeOnboarding,
    restartOnboarding,
    skipOnboarding,
    goBackOnboarding,
  } = onboarding
  const clearAssistance = useCallback(() => setLastAssistance(null), [])
  const {
    gesturePaletteAnchor,
    gestureNotice,
    pointerOverlayRef,
    handleGestureFrame,
    openGesturePaletteFromDock,
    closeGesturePalette,
    isGesturePaletteOpen,
  } = useWorkspaceGestures({
    stageRef,
    drawingRef,
    activeToolRef,
    drawingStyle,
    eraserThickness,
    changeTool,
    onStrokeStart: clearAssistance,
    onboarding,
  })

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

  const {
    viewport,
    zoomAtStageCenter,
    resetViewport,
    handleStagePointerDown,
    handleStagePointerMove,
    finishStagePan,
    handleStageWheel,
  } = useWorkspaceNavigation(stageRef, {
    changeTool,
    historyAvailability,
    undo,
    redo,
    isGesturePaletteOpen,
    closeGesturePalette,
    openGesturePaletteFromDock,
  })

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
              onThicknessChange={changeThickness}
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
