import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { AppProviders } from "@/app/providers"
import { ToolRail } from "@/features/toolbar/tool-rail"

describe("ToolRail", () => {
  it("exposes real pen, eraser, color and thickness controls", async () => {
    const user = userEvent.setup()
    const onToolChange = vi.fn()
    const onColorChange = vi.fn()
    const onThicknessChange = vi.fn()
    render(
      <AppProviders>
        <ToolRail
          activeTool="pen"
          color="#17171c"
          thickness={8}
          onToolChange={onToolChange}
          onColorChange={onColorChange}
          onThicknessChange={onThicknessChange}
        />
      </AppProviders>,
    )

    expect(screen.getByRole("button", { name: "Stylo" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await user.click(screen.getByRole("button", { name: "Gomme" }))
    expect(onToolChange).toHaveBeenCalledWith("eraser")

    await user.click(screen.getByRole("button", { name: "Violet" }))
    expect(onColorChange).toHaveBeenCalledWith("#7c3aed")
    expect(onToolChange).toHaveBeenLastCalledWith("pen")

    await user.click(screen.getByRole("button", { name: "Épaisseur 8 pixels" }))
    const slider = screen.getByRole("group", {
      name: "Épaisseur du trait",
    })
    expect(slider.querySelector('[data-slot="slider-thumb"]')).not.toBeNull()
    expect(onThicknessChange).not.toHaveBeenCalled()
  })
})
