import { MousePointer2, Palette, PenLine, Shapes, Undo2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  onboardingSteps,
  type ActiveOnboardingStep,
  type OnboardingState,
} from "@/features/onboarding/onboarding-machine"

const content = {
  cursor: {
    title: "Le point violet est votre curseur",
    description:
      "Déplacez l’index sans pincer et visez les trois repères sur la toile.",
    Icon: MousePointer2,
  },
  draw: {
    title: "Pincez pour poser le stylo",
    description:
      "Gardez le pouce et l’index pincés en bougeant, puis ouvrez-les pour terminer le trait.",
    Icon: PenLine,
  },
  style: {
    title: "Ouvrez les commandes gestuelles",
    description:
      "Gardez la main ouverte et immobile, puis choisissez le vert et une autre épaisseur.",
    Icon: Palette,
  },
  shapes: {
    title: "Transformez un geste en forme nette",
    description:
      "Rouvrez les commandes, activez Formes, puis dessinez un cercle approximatif.",
    Icon: Shapes,
  },
  correct: {
    title: "Corrigez sans recommencer",
    description:
      "Annulez depuis les commandes gestuelles. Pour gommer directement, fermez le poing et déplacez la main.",
    Icon: Undo2,
  },
} as const

type GestureCoachProps = {
  state: OnboardingState
  onBack: () => void
  onSkip: () => void
}

export function GestureCoach({ state, onBack, onSkip }: GestureCoachProps) {
  const step = state.step as ActiveOnboardingStep
  const current = content[step]
  const stepIndex = onboardingSteps.indexOf(step)
  const progress = ((stepIndex + 1) / onboardingSteps.length) * 100

  return (
    <section className="gesture-coach" aria-labelledby="gesture-title">
      <div className="gesture-coach__icon" aria-hidden="true">
        <current.Icon />
      </div>
      <div className="min-w-0 flex-1">
        <h2 id="gesture-title" className="text-base font-semibold">
          {current.title}
        </h2>
        <p className="text-muted-foreground mt-1 max-w-[58ch] text-sm leading-relaxed">
          {current.description}
        </p>
        <Progress
          aria-label={`Progression du tutoriel : mission ${stepIndex + 1} sur ${onboardingSteps.length}`}
          value={progress}
          className="mt-3 h-1.5"
        />
      </div>
      <div className="gesture-coach__actions">
        {stepIndex > 0 ? (
          <Button className="h-10" variant="ghost" onClick={onBack}>
            Retour
          </Button>
        ) : null}
        <Button className="h-10" variant="ghost" onClick={onSkip}>
          Passer le tutoriel
        </Button>
      </div>
    </section>
  )
}

export function OnboardingPractice({ state }: { state: OnboardingState }) {
  if (state.step === "cursor") {
    return (
      <div className="onboarding-cursor-practice" aria-hidden="true">
        {[0, 1, 2].map((target) => (
          <span
            key={target}
            className="onboarding-cursor-target"
            data-active={state.cursorTarget === target || undefined}
            data-complete={state.cursorTarget > target || undefined}
          >
            {state.cursorTarget > target ? "✓" : target + 1}
          </span>
        ))}
      </div>
    )
  }

  if (state.step === "draw") {
    return (
      <div className="onboarding-draw-practice" aria-hidden="true">
        <span className="onboarding-draw-practice__label">Départ</span>
        <svg viewBox="0 0 500 120" preserveAspectRatio="none">
          <path d="M 20 78 C 120 12, 190 112, 290 55 S 415 20, 480 62" />
        </svg>
        <span className="onboarding-draw-practice__end">Arrivée</span>
      </div>
    )
  }

  return null
}
