import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { createOnboardingState } from "./onboarding-machine"
import { GestureCoach, OnboardingPractice } from "./gesture-coach"

describe("GestureCoach", () => {
  it.each([
    ["cursor", "Le point violet est votre curseur", "Index tendu"],
    ["draw", "Pincez pour poser le stylo", "Pouce + index"],
    [
      "style",
      "Faites le signe paix pour ouvrir les commandes",
      "Signe paix · 0,5 s",
    ],
    ["shapes", "Transformez un geste en forme nette", "Cercle assisté"],
    ["correct", "Corrigez sans recommencer", "Poing pour gommer"],
  ] as const)(
    "announces the %s mission without motion-dependent content",
    (step, title, caption) => {
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
      expect(screen.getByText(caption)).toBeInTheDocument()
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

  it("shows completed and active cursor targets", () => {
    const state = {
      ...createOnboardingState("cursor"),
      cursorTarget: 1,
    }
    const { container } = render(<OnboardingPractice state={state} />)

    expect(container.querySelector('[data-complete="true"]')).toHaveTextContent(
      "✓",
    )
    expect(container.querySelector('[data-active="true"]')).toHaveTextContent(
      "2",
    )
  })

  it("shows the drawing route only during the drawing mission", () => {
    const { rerender } = render(
      <OnboardingPractice state={createOnboardingState("draw")} />,
    )
    expect(screen.getByText("Départ")).toBeInTheDocument()
    expect(screen.getByText("Arrivée")).toBeInTheDocument()

    rerender(<OnboardingPractice state={createOnboardingState("style")} />)
    expect(screen.queryByText("Départ")).not.toBeInTheDocument()
  })
})
