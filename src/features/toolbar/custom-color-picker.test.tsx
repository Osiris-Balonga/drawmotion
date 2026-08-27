import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { AppProviders } from "@/app/providers"
import { CustomColorPicker } from "@/features/toolbar/custom-color-picker"

describe("CustomColorPicker", () => {
  it("applies a precise hexadecimal color", async () => {
    const user = userEvent.setup()
    const onColorChange = vi.fn()
    render(
      <AppProviders>
        <CustomColorPicker color="#17171c" onColorChange={onColorChange} />
      </AppProviders>,
    )

    await user.click(
      screen.getByRole("button", { name: "Couleur personnalisée" }),
    )
    const hex = screen.getByLabelText("HEX")
    await user.clear(hex)
    await user.type(hex, "#12ab34")
    await user.click(screen.getByRole("button", { name: /Appliquer #12AB34/i }))

    expect(onColorChange).toHaveBeenCalledWith("#12AB34")
  })

  it("exposes keyboard-operable hue, saturation, lightness, and RGB controls", async () => {
    const user = userEvent.setup()
    render(
      <AppProviders>
        <CustomColorPicker color="#7c3aed" onColorChange={vi.fn()} />
      </AppProviders>,
    )

    await user.click(
      screen.getByRole("button", { name: "Couleur personnalisée" }),
    )
    const wheel = screen.getByRole("slider", { name: "Teinte et saturation" })
    wheel.focus()
    await user.keyboard("{ArrowRight}{ArrowUp}")

    expect(wheel).toHaveAttribute("aria-valuenow")
    expect(screen.getByLabelText("Luminosité")).toBeInTheDocument()
    expect(screen.getByLabelText("R")).toHaveAttribute("type", "number")
    expect(screen.getByLabelText("G")).toHaveAttribute("type", "number")
    expect(screen.getByLabelText("B")).toHaveAttribute("type", "number")
  })
})
