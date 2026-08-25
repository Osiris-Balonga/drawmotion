import { useEffect, useRef, useState, type RefObject } from "react"

import type {
  HandTrackerMetrics,
  HandTrackerPort,
} from "@/infrastructure/mediapipe/hand-tracker-port"
import {
  HandTrackingSession,
  type TrackingQuality,
} from "@/infrastructure/mediapipe/hand-tracking-session"
import { LandmarkOverlayRenderer } from "@/infrastructure/mediapipe/landmark-overlay-renderer"
import { WorkerHandTracker } from "@/infrastructure/mediapipe/worker-hand-tracker"

export type HandTrackingState =
  "idle" | "initializing" | TrackingQuality | "error"

export type HandTrackerFactory = (
  onMetrics: (metrics: HandTrackerMetrics) => void,
) => HandTrackerPort

function createTracker(onMetrics: (metrics: HandTrackerMetrics) => void) {
  return new WorkerHandTracker(undefined, onMetrics)
}

export function useHandTracking(
  enabled: boolean,
  videoRef: RefObject<HTMLVideoElement | null>,
  trackerFactory: HandTrackerFactory = createTracker,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<HandTrackingState>("idle")
  const [metrics, setMetrics] = useState<HandTrackerMetrics | null>(null)

  useEffect(() => {
    if (!enabled) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) {
      queueMicrotask(() => setState("error"))
      return
    }

    let active = true
    const renderer = new LandmarkOverlayRenderer(canvas, video)
    let tracker: HandTrackerPort
    try {
      tracker = trackerFactory((nextMetrics) => {
        if (active && import.meta.env.DEV) {
          setMetrics(nextMetrics)
        }
      })
    } catch {
      queueMicrotask(() => setState("error"))
      return
    }

    const session = new HandTrackingSession(video, tracker, {
      onResult: (result, quality) => {
        renderer.render(result)
        if (active) {
          setState((current) => (current === quality ? current : quality))
        }
      },
      onError: () => {
        if (active) {
          setState("error")
        }
      },
    })

    queueMicrotask(() => {
      if (active) {
        setState("initializing")
        setMetrics(null)
      }
    })
    void session
      .start({
        maxHands: 1,
        minDetectionConfidence: 0.5,
        minPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        modelAssetUrl: new URL(
          "/vision/hand_landmarker.task",
          window.location.origin,
        ).href,
        wasmRootUrl: new URL("/vision/wasm", window.location.origin).href,
      })
      .catch(() => {
        if (active) {
          setState("error")
        }
      })

    return () => {
      active = false
      session.dispose()
      renderer.clear()
    }
  }, [enabled, trackerFactory, videoRef])

  return {
    canvasRef,
    metrics: enabled ? metrics : null,
    state: enabled ? state : "idle",
  }
}
