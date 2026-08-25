import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { CameraPreview } from "@/features/camera/camera-preview"
import type { CameraAdapter } from "@/features/camera/use-camera-lifecycle"
import { CameraRequestError } from "@/infrastructure/camera/media-stream-adapter"

function createStream(deviceId = "front") {
  const stop = vi.fn()
  const track = {
    getSettings: () => ({ deviceId }),
    stop,
  } as unknown as MediaStreamTrack
  const stream = {
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as MediaStream

  return { stop, stream }
}

function createAdapter(overrides: Partial<CameraAdapter> = {}) {
  const activeStream = createStream()
  const adapter: CameraAdapter = {
    listDevices: vi.fn(() =>
      Promise.resolve([{ id: "front", label: "Caméra avant" }]),
    ),
    request: vi.fn(() => Promise.resolve(activeStream.stream)),
    stop: vi.fn(),
    ...overrides,
  }

  return { activeStream, adapter }
}

describe("CameraPreview", () => {
  it("keeps one stable circular preview while showing calibration guidance", () => {
    const { adapter } = createAdapter()

    render(<CameraPreview adapterFactory={() => adapter} calibrating />)

    const preview = screen.getByRole("region", { name: "Aperçu caméra" })
    expect(preview).toHaveClass("camera-preview")
    expect(preview).not.toHaveClass("camera-preview--calibrating")
    expect(
      preview.querySelector(".camera-preview__calibration-guide"),
    ).toBeInTheDocument()
  })

  it("keeps permission behind the circular camera control", () => {
    const { adapter } = createAdapter()

    render(<CameraPreview adapterFactory={() => adapter} />)

    expect(screen.queryByText(/La vidéo reste sur cet appareil/)).toBeNull()
    expect(
      screen.getByRole("button", { name: "Activer ma caméra" }),
    ).toBeInTheDocument()
    expect(adapter.request).not.toHaveBeenCalled()
  })

  it("shows the local stream and lets the user pause it", async () => {
    const user = userEvent.setup()
    const { adapter } = createAdapter()

    render(<CameraPreview adapterFactory={() => adapter} />)
    await user.click(screen.getByRole("button", { name: "Activer ma caméra" }))

    expect(await screen.findByText("Caméra active")).toBeInTheDocument()
    expect(screen.getByLabelText("Flux vidéo local")).not.toHaveAttribute(
      "hidden",
    )

    await user.click(
      screen.getByRole("button", { name: "Mettre la caméra en pause" }),
    )

    expect(adapter.stop).toHaveBeenCalledOnce()
    expect(screen.getByText("Caméra en pause")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Reprendre la caméra" }),
    ).toBeInTheDocument()
  })

  it.each([
    ["denied", "Accès caméra refusé", "Réessayer"],
    ["missing", "Aucune caméra détectée", "Rechercher une caméra"],
    ["busy", "Caméra déjà utilisée", "Réessayer"],
    ["failed", "Impossible de démarrer la caméra", "Réessayer"],
  ] as const)(
    "renders an actionable %s recovery state",
    async (failure, title, action) => {
      const user = userEvent.setup()
      const { adapter } = createAdapter({
        request: vi.fn(() => Promise.reject(new CameraRequestError(failure))),
      })

      render(<CameraPreview adapterFactory={() => adapter} />)
      await user.click(
        screen.getByRole("button", { name: "Activer ma caméra" }),
      )

      expect(await screen.findByText(title)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: action })).toBeInTheDocument()
    },
  )

  it("recovers after a busy camera becomes available", async () => {
    const user = userEvent.setup()
    const { adapter, activeStream } = createAdapter()
    vi.mocked(adapter.request)
      .mockRejectedValueOnce(new CameraRequestError("busy"))
      .mockResolvedValueOnce(activeStream.stream)

    render(<CameraPreview adapterFactory={() => adapter} />)
    await user.click(screen.getByRole("button", { name: "Activer ma caméra" }))
    await user.click(await screen.findByRole("button", { name: "Réessayer" }))

    expect(await screen.findByText("Caméra active")).toBeInTheDocument()
    expect(adapter.request).toHaveBeenCalledTimes(2)
  })

  it("switches between available cameras", async () => {
    const user = userEvent.setup()
    const front = createStream("front")
    const back = createStream("back")
    const { adapter } = createAdapter({
      listDevices: vi.fn(() =>
        Promise.resolve([
          { id: "front", label: "Caméra avant" },
          { id: "back", label: "Caméra arrière" },
        ]),
      ),
      request: vi
        .fn<CameraAdapter["request"]>()
        .mockResolvedValueOnce(front.stream)
        .mockResolvedValueOnce(back.stream),
    })

    render(<CameraPreview adapterFactory={() => adapter} />)
    await user.click(screen.getByRole("button", { name: "Activer ma caméra" }))
    const selector = await screen.findByRole("combobox", {
      name: "Caméra utilisée",
    })
    await user.selectOptions(selector, "back")

    await waitFor(() =>
      expect(adapter.request).toHaveBeenLastCalledWith("back"),
    )
    expect(await screen.findByText("Caméra active")).toBeInTheDocument()
  })

  it("stops the stream when the page becomes hidden", async () => {
    const user = userEvent.setup()
    const { adapter } = createAdapter()

    render(<CameraPreview adapterFactory={() => adapter} />)
    await user.click(screen.getByRole("button", { name: "Activer ma caméra" }))
    await screen.findByText("Caméra active")

    const visibility = vi
      .spyOn(document, "visibilityState", "get")
      .mockReturnValue("hidden")
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"))
    })

    expect(adapter.stop).toHaveBeenCalledOnce()
    expect(await screen.findByText("Caméra en pause")).toBeInTheDocument()
    visibility.mockRestore()
  })

  it("stops the stream when the preview unmounts", async () => {
    const user = userEvent.setup()
    const { adapter } = createAdapter()
    const view = render(<CameraPreview adapterFactory={() => adapter} />)
    await user.click(screen.getByRole("button", { name: "Activer ma caméra" }))
    await screen.findByText("Caméra active")

    view.unmount()

    expect(adapter.stop).toHaveBeenCalledOnce()
  })
})
