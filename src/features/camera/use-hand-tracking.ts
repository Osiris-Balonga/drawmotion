import { useEffect, useRef, useState, type RefObject } from "react"

import {
  classifyGesture,
  type GestureKind,
} from "@/core/gestures/gesture-classifier"
import { PinchDetector } from "@/core/gestures/pinch-detector"
import type {
  HandTrackerMetrics,
  HandTrackerPort,
  HandTrackingResult,
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

export type GestureFrameListener = (
  result: HandTrackingResult,
  gesture: GestureKind,
  quality: TrackingQuality,
  pinchActive: boolean,
) => void

function createTracker(onMetrics: (metrics: HandTrackerMetrics) => void) {
  return new WorkerHandTracker(undefined, onMetrics)
}

export function useHandTracking(
  enabled: boolean,
  videoRef: RefObject<HTMLVideoElement | null>,
  trackerFactory: HandTrackerFactory = createTracker,
  onGestureFrame?: GestureFrameListener,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<HandTrackingState>("idle")
  const [gesture, setGesture] = useState<GestureKind>("tracking-lost")
  const [metrics, setMetrics] = useState<HandTrackerMetrics | null>(null)
  const onGestureFrameRef = useRef(onGestureFrame)

  useEffect(() => {
    onGestureFrameRef.current = onGestureFrame
  }, [onGestureFrame])

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
    let previousGesture: GestureKind = "tracking-lost"
    let ambiguousFrames = 0
    const pinchDetector = new PinchDetector()
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
          const classification = classifyGesture(
            result.hands[0] ?? null,
            previousGesture,
          )
          const pinch = pinchDetector.update(
            result.hands[0] ?? null,
            quality === "reliable",
          )
          if (
            classification.kind === "uncertain" ||
            classification.kind === "tracking-lost"
          ) {
            ambiguousFrames += 1
            if (ambiguousFrames >= 3) previousGesture = classification.kind
          } else {
            ambiguousFrames = 0
            previousGesture = classification.kind
          }
          onGestureFrameRef.current?.(
            result,
            classification.kind,
            quality,
            pinch.active,
          )
          setGesture((current) =>
            current === classification.kind ? current : classification.kind,
          )
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
        setGesture("tracking-lost")
        setMetrics(null)
      }
    })
    void session
      .start({
        delegate: "GPU",
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
    gesture: enabled ? gesture : "tracking-lost",
    metrics: enabled ? metrics : null,
    state: enabled ? state : "idle",
  }
}
