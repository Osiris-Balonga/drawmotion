import type { ActiveOnboardingStep } from "@/features/onboarding/onboarding-machine"

const illustrations = {
  cursor: {
    src: "/onboarding/gesture-cursor.png",
    caption: "Index tendu",
  },
  draw: {
    src: "/onboarding/gesture-pinch.png",
    caption: "Pouce + index",
  },
  style: {
    src: "/onboarding/gesture-menu.png",
    caption: "Signe paix · 0,5 s",
  },
  shapes: {
    src: "/onboarding/gesture-shapes.png",
    caption: "Cercle assisté",
  },
  correct: {
    src: "/onboarding/gesture-correct.png",
    caption: "Poing pour gommer",
  },
} satisfies Record<ActiveOnboardingStep, { src: string; caption: string }>

export function GestureLessonIllustration({
  step,
}: {
  step: ActiveOnboardingStep
}) {
  const illustration = illustrations[step]

  return (
    <figure className="gesture-lesson" data-lesson-step={step}>
      <img aria-hidden="true" alt="" src={illustration.src} />
      <figcaption className="gesture-lesson__caption">
        {illustration.caption}
      </figcaption>
    </figure>
  )
}
