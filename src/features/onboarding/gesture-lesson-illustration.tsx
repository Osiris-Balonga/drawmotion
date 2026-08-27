import { t } from "@/i18n"

import type { ActiveOnboardingStep } from "@/features/onboarding/onboarding-machine"

const illustrations = {
  cursor: {
    src: "/onboarding/gesture-cursor.png",
    caption: t("tutorial.indexCaption"),
  },
  draw: {
    src: "/onboarding/gesture-pinch.png",
    caption: t("tutorial.pinchCaption"),
  },
  style: {
    src: "/onboarding/gesture-menu.png",
    caption: t("tutorial.peaceCaption"),
  },
  shapes: {
    src: "/onboarding/gesture-shapes.png",
    caption: t("tutorial.shapeCaption"),
  },
  correct: {
    src: "/onboarding/gesture-correct.png",
    caption: t("tutorial.fistCaption"),
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
      <img
        aria-hidden="true"
        alt=""
        src={`${import.meta.env.BASE_URL}${illustration.src.slice(1)}`}
      />
      <figcaption className="gesture-lesson__caption">
        {illustration.caption}
      </figcaption>
    </figure>
  )
}
