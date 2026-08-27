import { describe, expect, it, vi } from "vitest"

import { canvasToPngBlob } from "./canvas-png-export"

describe("canvasToPngBlob", () => {
  it("composes ink over a white background at physical resolution", async () => {
    const source = { width: 1600, height: 900 } as HTMLCanvasElement
    const blob = new Blob(["png"], { type: "image/png" })
    const context = {
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: "",
    }
    const output = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
      toBlob: vi.fn((callback: BlobCallback, type?: string) => {
        expect(type).toBe("image/png")
        callback(blob)
      }),
    } as unknown as HTMLCanvasElement

    await expect(canvasToPngBlob(source, () => output)).resolves.toBe(blob)
    expect(output.width).toBe(1600)
    expect(output.height).toBe(900)
    expect(context.fillStyle).toBe("#ffffff")
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 1600, 900)
    expect(context.drawImage).toHaveBeenCalledWith(source, 0, 0)
  })

  it("reports unsupported or failed PNG encoders", async () => {
    const source = { width: 10, height: 10 } as HTMLCanvasElement
    const withoutContext = {
      getContext: () => null,
    } as unknown as HTMLCanvasElement
    await expect(canvasToPngBlob(source, () => withoutContext)).rejects.toThrow(
      "Canvas 2D support",
    )

    const withoutBlob = {
      getContext: () => ({
        drawImage: vi.fn(),
        fillRect: vi.fn(),
        fillStyle: "",
      }),
      toBlob: (callback: BlobCallback) => callback(null),
    } as unknown as HTMLCanvasElement
    await expect(canvasToPngBlob(source, () => withoutBlob)).rejects.toThrow(
      "could not encode",
    )
  })
})
