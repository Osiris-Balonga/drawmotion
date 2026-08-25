import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { AppProviders } from "@/app/providers"
import { TopBar } from "@/features/toolbar/top-bar"

function renderTopBar(overrides: Partial<Parameters<typeof TopBar>[0]> = {}) {
  const props = {
    canUndo: true,
    canRedo: true,
    canClear: true,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onClear: vi.fn(),
    onExport: vi.fn(),
    ...overrides,
  }
  render(
    <AppProviders>
      <TopBar {...props} />
    </AppProviders>,
  )
  return props
}

describe("TopBar", () => {
  it("disables unavailable history actions", () => {
    renderTopBar({ canUndo: false, canRedo: false, canClear: false })

    expect(screen.getByRole("button", { name: "Annuler" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Rétablir" })).toBeDisabled()
    expect(
      screen.getByRole("button", { name: "Effacer la toile" }),
    ).toBeDisabled()
  })

  it("runs history actions and confirms a destructive clear", async () => {
    const user = userEvent.setup()
    const props = renderTopBar()

    await user.click(screen.getByRole("button", { name: "Annuler" }))
    await user.click(screen.getByRole("button", { name: "Rétablir" }))
    expect(props.onUndo).toHaveBeenCalledOnce()
    expect(props.onRedo).toHaveBeenCalledOnce()

    await user.click(screen.getByRole("button", { name: "Effacer la toile" }))
    const dialog = screen.getByRole("alertdialog", {
      name: "Effacer tout le dessin ?",
    })
    const confirm = within(dialog).getByRole("button", {
      name: "Effacer la toile",
    })
    expect(confirm).toHaveAttribute("data-gesture-control")
    expect(props.onClear).not.toHaveBeenCalled()

    await user.click(confirm)
    expect(props.onClear).toHaveBeenCalledOnce()
    expect(dialog).not.toBeInTheDocument()
  })

  it("exports only when the canvas contains a drawing", async () => {
    const user = userEvent.setup()
    const props = renderTopBar()
    const exportButton = screen.getByRole("button", {
      name: "Exporter en PNG",
    })

    expect(exportButton).toHaveAttribute("data-gesture-control")
    await user.click(exportButton)
    expect(props.onExport).toHaveBeenCalledOnce()
  })
})
