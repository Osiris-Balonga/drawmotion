import { useCallback, useEffect, useReducer, useRef, useState } from "react"

import {
  transitionCameraState,
  type CameraEvent,
} from "@/features/camera/camera-state"
import {
  CameraRequestError,
  createBrowserCameraAdapter,
  type CameraDevice,
  type MediaStreamCameraAdapter,
} from "@/infrastructure/camera/media-stream-adapter"

export type CameraAdapter = Pick<
  MediaStreamCameraAdapter,
  "listDevices" | "request" | "stop"
>

export type CameraAdapterFactory = () => CameraAdapter

const failureEvents = {
  denied: "DENIED",
  missing: "MISSING",
  busy: "BUSY",
  failed: "FAIL",
} as const satisfies Record<CameraRequestError["state"], CameraEvent["type"]>

export function useCameraLifecycle(
  adapterFactory: CameraAdapterFactory = createBrowserCameraAdapter,
) {
  const [state, dispatch] = useReducer(transitionCameraState, "idle")
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [devices, setDevices] = useState<CameraDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState("")
  const adapterRef = useRef<CameraAdapter | null>(null)
  const requestIdRef = useRef(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  const getAdapter = useCallback(() => {
    adapterRef.current ??= adapterFactory()
    return adapterRef.current
  }, [adapterFactory])

  const stop = useCallback(() => {
    requestIdRef.current += 1
    adapterRef.current?.stop()
    setStream(null)
    dispatch({ type: "STOP" })
  }, [])

  const start = useCallback(
    async (deviceId = selectedDeviceId) => {
      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId
      dispatch({ type: "REQUEST" })

      try {
        const adapter = getAdapter()
        const nextStream = await adapter.request(deviceId || undefined)

        if (requestId !== requestIdRef.current) {
          adapter.stop()
          return
        }

        setStream(nextStream)
        dispatch({ type: "READY" })

        const availableDevices = await adapter.listDevices()
        if (requestId === requestIdRef.current) {
          setDevices(availableDevices)
          const activeDeviceId = nextStream
            .getVideoTracks()[0]
            ?.getSettings().deviceId
          setSelectedDeviceId(
            activeDeviceId || deviceId || availableDevices[0]?.id || "",
          )
        }
      } catch (error) {
        const failure =
          error instanceof CameraRequestError ? error.state : "failed"
        dispatch({ type: failureEvents[failure] })
      }
    },
    [getAdapter, selectedDeviceId],
  )

  const selectDevice = useCallback(
    (deviceId: string) => {
      setSelectedDeviceId(deviceId)
      void start(deviceId)
    },
    [start],
  )

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        stop()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [stop])

  useEffect(
    () => () => {
      requestIdRef.current += 1
      adapterRef.current?.stop()
    },
    [],
  )

  return {
    devices,
    selectedDeviceId,
    selectDevice,
    start,
    state,
    stop,
    videoRef,
  }
}
