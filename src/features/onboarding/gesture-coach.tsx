import { t } from "@/i18n"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { GestureLessonIllustration } from "@/features/onboarding/gesture-lesson-illustration"
import {
  onboardingSteps,
  type ActiveOnboardingStep,
  type OnboardingState,
} from "@/features/onboarding/onboarding-machine"

const content = {
  cursor: {
    title: t("tutorial.cursorTitle"),
    description: t("tutorial.cursorDescription"),
  },
  draw: {
    title: t("tutorial.drawTitle"),
    description: t("tutorial.drawDescription"),
  },
  style: {
    title: t("tutorial.styleTitle"),
    description: t("tutorial.styleDescription"),
  },
  shapes: {
    title: t("tutorial.shapesTitle"),
    description: t("tutorial.shapesDescription"),
  },
  correct: {
    title: t("tutorial.correctTitle"),
    description: t("tutorial.correctDescription"),
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
      <GestureLessonIllustration step={step} />
      <div className="min-w-0 flex-1">
        <h2 id="gesture-title" className="text-base font-semibold">
          {current.title}
        </h2>
        <p className="text-muted-foreground mt-1 max-w-[58ch] text-sm leading-relaxed">
          {current.description}
        </p>
        <Progress
          aria-label={t("tutorial.progress", {
            current: stepIndex + 1,
            total: onboardingSteps.length,
          })}
          value={progress}
          className="mt-3 h-1.5"
        />
      </div>
      <div className="gesture-coach__actions">
        {stepIndex > 0 ? (
          <Button className="h-10" variant="ghost" onClick={onBack}>
            {t("tutorial.back")}
          </Button>
        ) : null}
        <Button className="h-10" variant="ghost" onClick={onSkip}>
          {t("tutorial.skip")}
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
        <span className="onboarding-draw-practice__label">
          {t("tutorial.start")}
        </span>
        <svg viewBox="0 0 500 120" preserveAspectRatio="none">
          <path d="M 20 78 C 120 12, 190 112, 290 55 S 415 20, 480 62" />
        </svg>
        <span className="onboarding-draw-practice__end">
          {t("tutorial.finish")}
        </span>
      </div>
    )
  }

  return null
}
