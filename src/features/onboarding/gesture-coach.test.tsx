import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { createOnboardingState } from "./onboarding-machine"
import { GestureCoach } from "./gesture-coach"

describe("GestureCoach", () => {
  it.each([
    ["cursor", "Le point violet est votre curseur"],
    ["draw", "Pincez pour poser le stylo"],
    ["style", "Donnez un style au prochain trait"],
    ["shapes", "Transformez un geste en forme nette"],
    ["correct", "Corrigez sans recommencer"],
  ] as const)(
    "announces the %s mission without motion-dependent content",
    (step, title) => {
      const state = createOnboardingState(step)
      render(<GestureCoach state={state} onBack={vi.fn()} onSkip={vi.fn()} />)

      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument()
      const mission = ["cursor", "draw", "style", "shapes", "correct"].indexOf(
        step,
      )
      expect(
        screen.getByRole("progressbar", {
          name: `Progression du tutoriel : mission ${mission + 1} sur 5`,
        }),
      ).toBeInTheDocument()
    },
  )

  it("offers keyboard-operable back and skip fallbacks", async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()
    const onSkip = vi.fn()
    render(
      <GestureCoach
        state={createOnboardingState("draw")}
        onBack={onBack}
        onSkip={onSkip}
      />,
    )

    screen.getByRole("button", { name: "Retour" }).focus()
    await user.keyboard("{Enter}")
    screen.getByRole("button", { name: "Passer le tutoriel" }).focus()
    await user.keyboard("{Enter}")

    expect(onBack).toHaveBeenCalledOnce()
    expect(onSkip).toHaveBeenCalledOnce()
  })
})
