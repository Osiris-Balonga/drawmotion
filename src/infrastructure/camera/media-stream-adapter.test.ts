import { describe, expect, it, vi } from "vitest"

import {
  classifyCameraError,
  MediaStreamCameraAdapter,
} from "@/infrastructure/camera/media-stream-adapter"

function createMediaStream() {
  const stop = vi.fn()
  const track = { stop } as unknown as MediaStreamTrack
  const stream = {
    getTracks: () => [track],
  } as unknown as MediaStream

  return { stop, stream }
}

describe("MediaStreamCameraAdapter", () => {
  it("requests video without audio using privacy-conscious defaults", async () => {
    const { stream } = createMediaStream()
    const getUserMedia = vi.fn(() => Promise.resolve(stream))
    const adapter = new MediaStreamCameraAdapter({
      enumerateDevices: vi.fn(() => Promise.resolve([])),
      getUserMedia,
    })

    await adapter.request()

    expect(getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: {
        facingMode: { ideal: "user" },
        height: { ideal: 720 },
        width: { ideal: 1280 },
      },
    })
  })

  it("targets the selected device and stops the previous stream", async () => {
    const first = createMediaStream()
    const second = createMediaStream()
    const getUserMedia = vi
      .fn()
      .mockResolvedValueOnce(first.stream)
      .mockResolvedValueOnce(second.stream)
    const adapter = new MediaStreamCameraAdapter({
      enumerateDevices: vi.fn(() => Promise.resolve([])),
      getUserMedia,
    })

    await adapter.request()
    await adapter.request("back")

    expect(first.stop).toHaveBeenCalledOnce()
    expect(getUserMedia).toHaveBeenLastCalledWith({
      audio: false,
      video: {
        deviceId: { exact: "back" },
        facingMode: { ideal: "user" },
        height: { ideal: 720 },
        width: { ideal: 1280 },
      },
    })
  })

  it("returns only cameras and supplies labels when the browser hides them", async () => {
    const { stream } = createMediaStream()
    const adapter = new MediaStreamCameraAdapter({
      enumerateDevices: vi.fn(() =>
        Promise.resolve([
          { deviceId: "front", kind: "videoinput", label: "FaceTime" },
          { deviceId: "microphone", kind: "audioinput", label: "Micro" },
          { deviceId: "back", kind: "videoinput", label: "" },
        ] as MediaDeviceInfo[]),
      ),
      getUserMedia: vi.fn(() => Promise.resolve(stream)),
    })

    await expect(adapter.listDevices()).resolves.toEqual([
      { id: "front", label: "FaceTime" },
      { id: "back", label: "Caméra 2" },
    ])
  })

  it.each([
    ["NotAllowedError", "denied"],
    ["SecurityError", "denied"],
    ["NotFoundError", "missing"],
    ["OverconstrainedError", "missing"],
    ["NotReadableError", "busy"],
    ["TrackStartError", "busy"],
    ["UnknownError", "failed"],
  ] as const)("classifies %s as %s", (name, expected) => {
    expect(classifyCameraError(new DOMException("camera", name))).toBe(expected)
  })

  it("exposes a stable domain error when getUserMedia rejects", async () => {
    const source = new DOMException("blocked", "NotAllowedError")
    const adapter = new MediaStreamCameraAdapter({
      enumerateDevices: vi.fn(() => Promise.resolve([])),
      getUserMedia: vi.fn(() => Promise.reject(source)),
    })

    await expect(adapter.request()).rejects.toMatchObject({
      cause: source,
      name: "CameraRequestError",
      state: "denied",
    })
  })
})
