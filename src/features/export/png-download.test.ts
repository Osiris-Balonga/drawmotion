import { describe, expect, it, vi } from "vitest"

import { createPngFilename, downloadPng } from "./png-download"

describe("PNG download", () => {
  it("creates the contractual timestamped filename", () => {
    expect(createPngFilename(new Date(2026, 7, 25, 9, 4, 7))).toBe(
      "drawmotion-2026-08-25-090407.png",
    )
  })

  it("downloads an object URL and releases it", async () => {
    const blob = new Blob(["png"], { type: "image/png" })
    const createObjectURL = vi.fn(() => "blob:drawmotion")
    const revokeObjectURL = vi.fn()
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined)

    downloadPng(blob, "drawing.png", document, {
      createObjectURL,
      revokeObjectURL,
    })

    expect(createObjectURL).toHaveBeenCalledWith(blob)
    const anchor = click.mock.instances[0] as HTMLAnchorElement | undefined
    expect(anchor?.download).toBe("drawing.png")
    expect(anchor?.href).toBe("blob:drawmotion")
    expect(document.body.contains(anchor ?? null)).toBe(false)
    await Promise.resolve()
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:drawmotion")
    click.mockRestore()
  })
})
