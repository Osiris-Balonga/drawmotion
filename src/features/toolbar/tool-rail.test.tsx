import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { AppProviders } from "@/app/providers"
import { ToolRail } from "@/features/toolbar/tool-rail"

function renderToolRail() {
  const props = {
    activeTool: "pen" as const,
    color: "#17171c" as const,
    thickness: 8,
    strokePattern: "solid" as const,
    assistanceMode: "stabilized" as const,
    onToolChange: vi.fn(),
    onColorChange: vi.fn(),
    onThicknessChange: vi.fn(),
    onStrokePatternChange: vi.fn(),
    onAssistanceModeChange: vi.fn(),
    onReplayOnboarding: vi.fn(),
  }
  render(
    <AppProviders>
      <ToolRail {...props} />
    </AppProviders>,
  )
  return props
}

describe("ToolRail", () => {
  it("exposes selected tools and colors", async () => {
    const user = userEvent.setup()
    const props = renderToolRail()

    expect(screen.getByRole("button", { name: "Stylo" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await user.click(screen.getByRole("button", { name: "Gomme" }))
    expect(props.onToolChange).toHaveBeenCalledWith("eraser")

    const black = screen.getByRole("button", { name: "Encre" })
    expect(black).toHaveAttribute("aria-pressed", "true")
    await user.click(screen.getByRole("button", { name: "Violet" }))
    expect(props.onColorChange).toHaveBeenCalledWith("#7c3aed")
    expect(props.onToolChange).toHaveBeenLastCalledWith("pen")
  })

  it("changes precision from the unified dock", async () => {
    const user = userEvent.setup()
    const props = renderToolRail()
    const shapes = screen.getByRole("button", {
      name: /Formes — Régularise les lignes/,
    })

    await user.click(shapes)

    expect(props.onAssistanceModeChange).toHaveBeenCalledWith("shapes")
  })

  it("offers a gesture-accessible thickness popover", async () => {
    const user = userEvent.setup()
    const props = renderToolRail()

    await user.click(screen.getByRole("button", { name: "Épaisseur 8 pixels" }))
    const slider = screen.getByRole("group", {
      name: "Épaisseur du trait",
    })
    expect(slider.querySelector('[data-slot="slider-thumb"]')).not.toBeNull()
    const preset = screen.getByRole("button", { name: "12 px" })
    expect(preset).toHaveAttribute("data-gesture-control")
    await user.click(preset)
    expect(props.onThicknessChange).toHaveBeenCalledWith(12)

    await user.click(screen.getByRole("button", { name: "Pointillé" }))
    expect(props.onStrokePatternChange).toHaveBeenCalledWith("dotted")
  })

  it("keeps tutorial replay inside the unified dock", async () => {
    const user = userEvent.setup()
    const props = renderToolRail()

    await user.click(screen.getByRole("button", { name: "Revoir le tutoriel" }))

    expect(props.onReplayOnboarding).toHaveBeenCalledOnce()
  })

  it("collapses the optional controls without removing them", async () => {
    const user = userEvent.setup()
    renderToolRail()

    await user.click(screen.getByRole("button", { name: "Réduire la palette" }))

    expect(
      screen.getByRole("complementary", { name: "Outils de dessin" }),
    ).toHaveAttribute("data-collapsed", "true")
    expect(document.querySelector(".command-dock__extended")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
    expect(
      screen.getByRole("button", { name: "Déployer la palette" }),
    ).toBeInTheDocument()
  })
})
