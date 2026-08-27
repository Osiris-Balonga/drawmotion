// @vitest-environment jsdom
import "@/test/setup"

import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AppProviders } from "@/app/providers"
import { canOpenGestureMenu } from "@/features/workspace/gesture-menu-availability"
import { WorkspaceShell } from "@/features/workspace/workspace-shell"
import { saveOnboardingProgress } from "@/features/onboarding/onboarding-persistence"

function renderWorkspace() {
  return render(
    <AppProviders>
      <WorkspaceShell />
    </AppProviders>,
  )
}

beforeEach(() => localStorage.clear())

describe("WorkspaceShell", () => {
  it.each([
    ["cursor", false],
    ["draw", false],
    ["style", true],
    ["shapes", true],
    ["correct", true],
    ["complete", true],
  ] as const)(
    "guards gesture commands during %s onboarding",
    (step, allowed) => {
      expect(canOpenGestureMenu(step)).toBe(allowed)
    },
  )

  it("exposes an understandable structure and technical states", () => {
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

  it("supports selecting a tool with the keyboard", async () => {
    const user = userEvent.setup()
    saveOnboardingProgress({ status: "completed", currentStep: "complete" })
    renderWorkspace()

    const pen = screen.getByRole("button", { name: "Stylo" })
    const eraser = screen.getByRole("button", { name: "Gomme" })

    expect(pen).toHaveAttribute("aria-pressed", "true")
    eraser.focus()
    await user.keyboard("{Enter}")

    expect(eraser).toHaveAttribute("aria-pressed", "true")
    expect(pen).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByText("Outil : Gomme, 40 pixels")).toBeInTheDocument()
  })

  it("selects tools with shortcuts except while typing", async () => {
    const user = userEvent.setup()
    saveOnboardingProgress({ status: "completed", currentStep: "complete" })
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

  it("opens commands with the fallback button and M key", async () => {
    const user = userEvent.setup()
    saveOnboardingProgress({ status: "completed", currentStep: "complete" })
    renderWorkspace()

    await user.click(
      screen.getByRole("button", { name: "Ouvrir les commandes" }),
    )
    expect(
      screen.getByRole("region", { name: "Commandes gestuelles" }),
    ).toBeInTheDocument()

    await user.keyboard("m")
    expect(
      screen.queryByRole("region", { name: "Commandes gestuelles" }),
    ).not.toBeInTheDocument()
    await user.keyboard("m")
    expect(
      screen.getByRole("region", { name: "Commandes gestuelles" }),
    ).toBeInTheDocument()
  })

  it("starts with a mission explaining the pointer", () => {
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

  it("supports skipping and replaying the tutorial", async () => {
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

  it("places the skip link first in the tab order", async () => {
    const user = userEvent.setup()
    renderWorkspace()

    await user.tab()

    expect(screen.getByRole("link", { name: "Aller à la toile" })).toHaveFocus()
  })

  it("supports choosing drawing assistance after the tutorial", async () => {
    const user = userEvent.setup()
    saveOnboardingProgress({ status: "completed", currentStep: "complete" })
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

  it("supports zooming and resetting the canvas", async () => {
    const user = userEvent.setup()
    saveOnboardingProgress({ status: "completed", currentStep: "complete" })
    renderWorkspace()

    expect(
      screen.getByRole("button", { name: "Réinitialiser la vue" }),
    ).toHaveTextContent("100%")
    await user.click(screen.getByRole("button", { name: "Zoomer" }))
    expect(
      screen.getByRole("button", { name: "Réinitialiser la vue" }),
    ).toHaveTextContent("120%")
    await user.click(
      screen.getByRole("button", { name: "Réinitialiser la vue" }),
    )
    expect(
      screen.getByRole("button", { name: "Réinitialiser la vue" }),
    ).toHaveTextContent("100%")
  })

  it("handles wheel zoom and ignores wheel events over controls", () => {
    saveOnboardingProgress({ status: "completed", currentStep: "complete" })
    renderWorkspace()
    const stage = screen.getByRole("region", { name: "Toile de dessin vide" })
    const reset = screen.getByRole("button", { name: "Réinitialiser la vue" })

    fireEvent.wheel(stage, {
      clientX: 400,
      clientY: 300,
      ctrlKey: true,
      deltaY: -100,
    })
    expect(reset).not.toHaveTextContent("100%")
    const zoomedValue = reset.textContent

    fireEvent.wheel(reset, { ctrlKey: true, deltaY: -100 })
    expect(reset).toHaveTextContent(zoomedValue ?? "")

    fireEvent.wheel(stage, { deltaX: 10, deltaY: 20 })
    expect(reset).toHaveTextContent(zoomedValue ?? "")
  })

  it("supports canvas navigation shortcuts", async () => {
    const user = userEvent.setup()
    saveOnboardingProgress({ status: "completed", currentStep: "complete" })
    renderWorkspace()
    const reset = screen.getByRole("button", { name: "Réinitialiser la vue" })

    await user.keyboard("+")
    expect(reset).toHaveTextContent("120%")
    await user.keyboard("-")
    expect(reset).toHaveTextContent("100%")
    await user.keyboard("+")
    await user.keyboard("0")
    expect(reset).toHaveTextContent("100%")
  })

  it("pans with the middle button and Space", () => {
    saveOnboardingProgress({ status: "completed", currentStep: "complete" })
    renderWorkspace()
    const stage = screen.getByRole("region", {
      name: "Toile de dessin vide",
    })
    const releasePointerCapture = vi.fn()
    stage.setPointerCapture = vi.fn()
    stage.hasPointerCapture = vi.fn(() => true)
    stage.releasePointerCapture = releasePointerCapture

    fireEvent.pointerDown(stage, {
      button: 1,
      clientX: 10,
      clientY: 20,
      pointerId: 7,
    })
    expect(stage).toHaveAttribute("data-panning")
    fireEvent.pointerMove(stage, {
      clientX: 30,
      clientY: 45,
      pointerId: 7,
    })
    fireEvent.pointerUp(stage, { pointerId: 7 })
    expect(stage).not.toHaveAttribute("data-panning")
    expect(releasePointerCapture).toHaveBeenCalled()

    fireEvent.keyDown(window, { code: "Space", key: " " })
    expect(stage).toHaveAttribute("data-pan-ready")
    fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 30,
      clientY: 45,
      pointerId: 8,
    })
    expect(stage).toHaveAttribute("data-panning")
    fireEvent.pointerCancel(stage, { pointerId: 8 })
    fireEvent.keyUp(window, { code: "Space", key: " " })
    expect(stage).not.toHaveAttribute("data-pan-ready")
  })
})
