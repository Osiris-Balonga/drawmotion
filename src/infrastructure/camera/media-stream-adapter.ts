import type { CameraState } from "@/features/camera/camera-state"

export type CameraFailureState = Extract<
  CameraState,
  "denied" | "missing" | "busy" | "failed"
>

export type CameraDevice = {
  id: string
  label: string
}

type MediaDevicesPort = Pick<MediaDevices, "enumerateDevices" | "getUserMedia">

export class CameraRequestError extends Error {
  readonly state: CameraFailureState

  constructor(state: CameraFailureState, cause?: unknown) {
    super(`Camera request failed: ${state}`, { cause })
    this.name = "CameraRequestError"
    this.state = state
  }
}

function getErrorName(error: unknown): string {
  if (error instanceof DOMException || error instanceof Error) {
    return error.name
  }

  return ""
}

export function classifyCameraError(error: unknown): CameraFailureState {
  switch (getErrorName(error)) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return "denied"
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return "missing"
    case "NotReadableError":
    case "TrackStartError":
      return "busy"
    default:
      return "failed"
  }
}

export class MediaStreamCameraAdapter {
  private stream: MediaStream | null = null

  constructor(private readonly mediaDevices: MediaDevicesPort) {}

  async request(deviceId?: string): Promise<MediaStream> {
    this.stop()

    const video: MediaTrackConstraints = {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: { ideal: "user" },
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    }

    try {
      this.stream = await this.mediaDevices.getUserMedia({
        audio: false,
        video,
      })
      return this.stream
    } catch (error) {
      throw new CameraRequestError(classifyCameraError(error), error)
    }
  }

  async listDevices(): Promise<CameraDevice[]> {
    const devices = await this.mediaDevices.enumerateDevices()
    let cameraNumber = 0

    return devices.flatMap((device) => {
      if (device.kind !== "videoinput") {
        return []
      }

      cameraNumber += 1
      return {
        id: device.deviceId,
        label: device.label || `Caméra ${cameraNumber}`,
      }
    })
  }

  stop(): void {
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
  }
}

export function createBrowserCameraAdapter(): MediaStreamCameraAdapter {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new CameraRequestError("missing")
  }

  return new MediaStreamCameraAdapter(navigator.mediaDevices)
}
