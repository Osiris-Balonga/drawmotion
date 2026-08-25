import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { AppProviders } from "@/app/providers"
import { WorkspaceShell } from "@/features/workspace/workspace-shell"

function renderWorkspace() {
  return render(
    <AppProviders>
      <WorkspaceShell />
    </AppProviders>,
  )
}

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
    expect(
      screen.getByRole("button", { name: "Annuler — bientôt disponible" }),
    ).toBeDisabled()
    expect(
      screen.getByRole("button", { name: "Exporter bientôt" }),
    ).toBeDisabled()
  })

  it("permet de sélectionner un outil au clavier", async () => {
    const user = userEvent.setup()
    renderWorkspace()

    const pen = screen.getByRole("button", { name: "Stylo simulé" })
    const eraser = screen.getByRole("button", { name: "Gomme simulée" })

    expect(pen).toHaveAttribute("aria-pressed", "true")
    eraser.focus()
    await user.keyboard("{Enter}")

    expect(eraser).toHaveAttribute("aria-pressed", "true")
    expect(pen).toHaveAttribute("aria-pressed", "false")
    expect(
      screen.getByText("Gomme sélectionné — simulation"),
    ).toBeInTheDocument()
  })

  it("présente la calibration réelle avant le dessin", () => {
    renderWorkspace()

    expect(
      screen.getByRole("progressbar", {
        name: "Progression du tutoriel : étape 1 sur 3",
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Placez votre main dans le cadre",
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Recommencer" }),
    ).toBeInTheDocument()
  })

  it("propose un lien d’évitement comme premier arrêt clavier", async () => {
    const user = userEvent.setup()
    renderWorkspace()

    await user.tab()

    expect(screen.getByRole("link", { name: "Aller à la toile" })).toHaveFocus()
  })
})
