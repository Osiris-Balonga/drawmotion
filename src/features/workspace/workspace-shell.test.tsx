import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { AppProviders } from "@/app/providers"
import { WorkspaceShell } from "@/features/workspace/workspace-shell"
import { saveOnboardingCompletion } from "@/features/onboarding/onboarding-persistence"

function renderWorkspace() {
  return render(
    <AppProviders>
      <WorkspaceShell />
    </AppProviders>,
  )
}

beforeEach(() => localStorage.clear())

describe("WorkspaceShell", () => {
  it("expose une structure et des états techniques compréhensibles", () => {
    renderWorkspace()

    expect(
      screen.getByRole("heading", { level: 1, name: "DrawMotion" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("region", { name: "Toile de dessin vide" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("region", { name: "Aperçu caméra" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Annuler" })).toBeDisabled()
    expect(
      screen.getByRole("button", { name: "Exporter en PNG" }),
    ).toBeDisabled()
  })

  it("permet de sélectionner un outil au clavier", async () => {
    const user = userEvent.setup()
    saveOnboardingCompletion()
    renderWorkspace()

    const pen = screen.getByRole("button", { name: "Stylo" })
    const eraser = screen.getByRole("button", { name: "Gomme" })

    expect(pen).toHaveAttribute("aria-pressed", "true")
    eraser.focus()
    await user.keyboard("{Enter}")

    expect(eraser).toHaveAttribute("aria-pressed", "true")
    expect(pen).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByText("Gomme sélectionné, 8 pixels")).toBeInTheDocument()
  })

  it("sélectionne les outils par raccourci sauf pendant une saisie", async () => {
    const user = userEvent.setup()
    saveOnboardingCompletion()
    renderWorkspace()

    await user.keyboard("e")
    expect(screen.getByRole("button", { name: "Gomme" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await user.keyboard("p")
    expect(screen.getByRole("button", { name: "Stylo" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )

    const input = document.createElement("input")
    document.body.append(input)
    input.focus()
    await user.keyboard("e")
    expect(screen.getByRole("button", { name: "Stylo" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    input.remove()
  })

  it("présente une première mission qui explique le curseur", () => {
    renderWorkspace()

    expect(
      screen.getByRole("progressbar", {
        name: "Progression du tutoriel : mission 1 sur 5",
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Le point violet est votre curseur",
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Passer le tutoriel" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Pointeur" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  it("permet de passer puis de rejouer le tutoriel", async () => {
    const user = userEvent.setup()
    renderWorkspace()

    await user.click(screen.getByRole("button", { name: "Passer le tutoriel" }))
    expect(
      screen.getByRole("button", { name: "Revoir le tutoriel" }),
    ).toBeInTheDocument()
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Revoir le tutoriel" }))
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Le point violet est votre curseur",
      }),
    ).toBeInTheDocument()
  })

  it("propose un lien d’évitement comme premier arrêt clavier", async () => {
    const user = userEvent.setup()
    renderWorkspace()

    await user.tab()

    expect(screen.getByRole("link", { name: "Aller à la toile" })).toHaveFocus()
  })

  it("laisse choisir une assistance précise après le tutoriel", async () => {
    const user = userEvent.setup()
    saveOnboardingCompletion()
    renderWorkspace()

    const stabilized = screen.getByRole("button", {
      name: /Stabilisé — Réduit les irrégularités/,
    })
    const shapes = screen.getByRole("button", {
      name: /Formes — Régularise les lignes/,
    })
    expect(stabilized).toHaveAttribute("aria-pressed", "true")
    expect(stabilized).toHaveAttribute("data-pressed")

    await user.click(shapes)

    expect(shapes).toHaveAttribute("aria-pressed", "true")
    expect(shapes).toHaveAttribute("data-pressed")
    expect(stabilized).not.toHaveAttribute("data-pressed")
    expect(stabilized).toHaveAttribute("aria-pressed", "false")
  })
})
