import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { GestureCommandPalette } from "./gesture-command-palette"

function renderPalette(
  overrides: Partial<Parameters<typeof GestureCommandPalette>[0]> = {},
) {
  const props = {
    anchor: { x: 400, y: 300 },
    color: "#17171c" as const,
    thickness: 8,
    pattern: "solid" as const,
    assistanceMode: "stabilized" as const,
    onColorChange: vi.fn(),
    onThicknessChange: vi.fn(),
    onPatternChange: vi.fn(),
    onAssistanceModeChange: vi.fn(),
    onUndo: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  }
  render(<GestureCommandPalette {...props} />)
  return props
}

describe("GestureCommandPalette", () => {
  it("keeps the first level limited to four large commands", () => {
    renderPalette()

    expect(
      screen.getByRole("region", { name: "Commandes gestuelles" }),
    ).toBeInTheDocument()
    for (const name of ["Couleur", "Trait", "Précision", "Annuler"]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute(
        "data-gesture-palette-control",
      )
    }
  })

  it("selects a color from a subpage and closes", async () => {
    const user = userEvent.setup()
    const props = renderPalette()

    await user.click(screen.getByRole("button", { name: "Couleur" }))
    await user.click(screen.getByRole("button", { name: "Vert" }))

    expect(props.onColorChange).toHaveBeenCalledWith("#238554")
    expect(props.onClose).toHaveBeenCalledOnce()
  })

  it("offers thickness and line patterns without using the desktop dock", async () => {
    const user = userEvent.setup()
    const props = renderPalette()

    await user.click(screen.getByRole("button", { name: "Trait" }))
    await user.click(screen.getByRole("button", { name: "Pointillé" }))

    expect(props.onPatternChange).toHaveBeenCalledWith("dotted")
    expect(props.onClose).toHaveBeenCalledOnce()
  })

  it("changes thickness and returns to the root page", async () => {
    const user = userEvent.setup()
    const props = renderPalette({ thickness: 20 })

    await user.click(screen.getByRole("button", { name: "Trait" }))
    expect(screen.getByRole("button", { name: "20 pixels" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await user.click(
      screen.getByRole("button", { name: "Retour aux commandes" }),
    )
    await user.click(screen.getByRole("button", { name: "Trait" }))
    await user.click(screen.getByRole("button", { name: "10 pixels" }))

    expect(props.onThicknessChange).toHaveBeenCalledWith(10)
    expect(props.onClose).toHaveBeenCalledOnce()
  })

  it("changes precision and exposes the active choice", async () => {
    const user = userEvent.setup()
    const props = renderPalette({ assistanceMode: "shapes" })

    await user.click(screen.getByRole("button", { name: "Précision" }))
    expect(screen.getByRole("button", { name: "Formes" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await user.click(screen.getByRole("button", { name: "Libre" }))

    expect(props.onAssistanceModeChange).toHaveBeenCalledWith("free")
  })

  it("undoes or closes from the root level", async () => {
    const user = userEvent.setup()
    const undoProps = renderPalette()

    await user.click(screen.getByRole("button", { name: "Annuler" }))
    expect(undoProps.onUndo).toHaveBeenCalledOnce()
    expect(undoProps.onClose).toHaveBeenCalledOnce()

    cleanup()
    const closeProps = renderPalette()
    await user.click(
      screen.getByRole("button", { name: "Fermer les commandes" }),
    )
    expect(closeProps.onClose).toHaveBeenCalledOnce()
  })
})
