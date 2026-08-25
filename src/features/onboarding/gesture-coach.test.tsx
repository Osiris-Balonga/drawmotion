import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { GestureCoach } from "./gesture-coach"

describe("GestureCoach", () => {
  it.each([
    [0, "Placez votre main dans le cadre"],
    [1, "Pincez pour commencer un trait"],
    [2, "Ouvrez la main pour faire une pause"],
  ] as const)(
    "announces step %s without motion-dependent content",
    (step, title) => {
      render(<GestureCoach step={step} onBack={vi.fn()} onRestart={vi.fn()} />)

      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument()
      expect(
        screen.getByRole("progressbar", {
          name: `Progression du tutoriel : étape ${step + 1} sur 3`,
        }),
      ).toBeInTheDocument()
    },
  )

  it("offers keyboard-operable back and restart fallbacks", async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()
    const onRestart = vi.fn()
    render(<GestureCoach step={1} onBack={onBack} onRestart={onRestart} />)

    screen.getByRole("button", { name: "Retour" }).focus()
    await user.keyboard("{Enter}")
    screen.getByRole("button", { name: "Recommencer" }).focus()
    await user.keyboard("{Enter}")

    expect(onBack).toHaveBeenCalledOnce()
    expect(onRestart).toHaveBeenCalledOnce()
  })
})
