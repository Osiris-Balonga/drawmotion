import { Eraser, MousePointer2, PenLine, Shapes, Undo2 } from "lucide-react"

import type { ActiveOnboardingStep } from "@/features/onboarding/onboarding-machine"

export function GestureLessonIllustration({
  step,
}: {
  step: ActiveOnboardingStep
}) {
  return (
    <div aria-hidden="true" className="gesture-lesson" data-lesson-step={step}>
      {step === "cursor" ? (
        <>
          <span className="gesture-lesson__pointer-motion">
            <MousePointer2 className="gesture-lesson__pointer" />
          </span>
          <span className="gesture-lesson__motion-line" />
          <span className="gesture-lesson__target gesture-lesson__target--one" />
          <span className="gesture-lesson__target gesture-lesson__target--two" />
          <span className="gesture-lesson__caption">Déplacer l’index</span>
        </>
      ) : null}

      {step === "draw" ? (
        <>
          <span className="gesture-lesson__finger gesture-lesson__finger--thumb" />
          <span className="gesture-lesson__finger gesture-lesson__finger--index" />
          <span className="gesture-lesson__pinch-point" />
          <PenLine className="gesture-lesson__pen" />
          <span className="gesture-lesson__caption">
            Pincer · tracer · ouvrir
          </span>
        </>
      ) : null}

      {step === "style" ? (
        <>
          <span className="gesture-lesson__v">V</span>
          <span className="gesture-lesson__hold-ring" />
          <span className="gesture-lesson__caption">Maintenir 0,5 s</span>
        </>
      ) : null}

      {step === "shapes" ? (
        <>
          <span className="gesture-lesson__rough-shape" />
          <Shapes className="gesture-lesson__shape-icon" />
          <span className="gesture-lesson__clean-shape" />
          <span className="gesture-lesson__caption">Forme assistée</span>
        </>
      ) : null}

      {step === "correct" ? (
        <>
          <span className="gesture-lesson__fist">●</span>
          <Eraser className="gesture-lesson__eraser" />
          <span className="gesture-lesson__or">ou</span>
          <Undo2 className="gesture-lesson__undo" />
          <span className="gesture-lesson__caption">Poing pour gommer</span>
        </>
      ) : null}
    </div>
  )
}
