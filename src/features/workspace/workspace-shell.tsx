import { useState } from "react"

import { CameraPreview } from "@/features/camera/camera-preview"
import { GestureCoach } from "@/features/onboarding/gesture-coach"
import { ToolRail, type DrawingTool } from "@/features/toolbar/tool-rail"
import { TopBar } from "@/features/toolbar/top-bar"

import "./workspace.css"

const toolNames: Record<DrawingTool, string> = {
  pointer: "Pointeur",
  pen: "Stylo",
  eraser: "Gomme",
}

export function WorkspaceShell() {
  const [activeTool, setActiveTool] = useState<DrawingTool>("pen")
  const [coachStep, setCoachStep] = useState(0)

  return (
    <div className="workspace-shell">
      <a className="skip-link" href="#drawing-canvas">
        Aller à la toile
      </a>
      <TopBar />
      <main className="workspace-main">
        <ToolRail activeTool={activeTool} onToolChange={setActiveTool} />

        <section
          id="drawing-canvas"
          tabIndex={-1}
          aria-label="Toile de dessin vide"
          className="drawing-stage"
        >
          <div className="sr-only" aria-live="polite">
            {toolNames[activeTool]} sélectionné — simulation
          </div>
          <CameraPreview />
          <GestureCoach step={coachStep} onStepChange={setCoachStep} />
        </section>
      </main>
    </div>
  )
}
