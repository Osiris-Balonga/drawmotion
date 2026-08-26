import { forwardRef, useImperativeHandle } from "react"

import { Camera, CameraOff, CircleAlert, LoaderCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  useCameraLifecycle,
  type CameraAdapterFactory,
} from "@/features/camera/use-camera-lifecycle"
import {
  useHandTracking,
  type GestureFrameListener,
  type HandTrackerFactory,
} from "@/features/camera/use-hand-tracking"

type CameraPreviewProps = {
  adapterFactory?: CameraAdapterFactory
  trackerFactory?: HandTrackerFactory
  onGestureFrame?: GestureFrameListener
  calibrating?: boolean
}

export type CameraPreviewHandle = {
  togglePause(): void
}

const trackingContent = {
  idle: { label: "Suivi en pause", tone: "neutral" },
  initializing: { label: "Analyse de la main…", tone: "neutral" },
  reliable: { label: "Main détectée", tone: "success" },
  uncertain: { label: "Suivi hésitant", tone: "warning" },
  lost: { label: "Main non détectée", tone: "neutral" },
  error: { label: "Suivi indisponible", tone: "error" },
} as const

const gestureLabels = {
  pinch: "Pincement",
  "open-hand": "Main ouverte",
  fist: "Poing",
  uncertain: "Geste incertain",
  "tracking-lost": "Aucun geste",
} as const

const errorContent = {
  denied: {
    title: "Accès caméra refusé",
    description:
      "Autorisez la caméra dans les réglages du navigateur, puis réessayez.",
    action: "Réessayer",
  },
  missing: {
    title: "Aucune caméra détectée",
    description: "Branchez une caméra, puis lancez une nouvelle recherche.",
    action: "Rechercher une caméra",
  },
  busy: {
    title: "Caméra déjà utilisée",
    description: "Fermez l’application qui utilise la caméra, puis réessayez.",
    action: "Réessayer",
  },
  failed: {
    title: "Impossible de démarrer la caméra",
    description: "Vérifiez votre caméra ou rechargez la page, puis réessayez.",
    action: "Réessayer",
  },
} as const

export const CameraPreview = forwardRef<
  CameraPreviewHandle,
  CameraPreviewProps
>(function CameraPreview(
  {
    adapterFactory,
    trackerFactory,
    onGestureFrame,
    calibrating = false,
  }: CameraPreviewProps,
  ref,
) {
  const {
    devices,
    selectedDeviceId,
    selectDevice,
    start,
    state,
    stop,
    videoRef,
  } = useCameraLifecycle(adapterFactory)
  const {
    canvasRef,
    gesture,
    pinchPhase,
    state: trackingState,
  } = useHandTracking(
    state === "ready",
    videoRef,
    trackerFactory,
    onGestureFrame,
  )
  const trackingStatus = trackingContent[trackingState]
  const error =
    state === "denied" ||
    state === "missing" ||
    state === "busy" ||
    state === "failed"
      ? errorContent[state]
      : null
  const canToggleFromPreview =
    state === "idle" || state === "stopped" || state === "ready"
  const visibleTrackingLabel =
    trackingState === "reliable"
      ? pinchPhase === "pending-entry"
        ? "Pincement…"
        : pinchPhase === "active"
          ? "Pincement actif"
          : pinchPhase === "pending-release"
            ? "Relâchement…"
            : gesture === "fist"
              ? gestureLabels.fist
              : trackingStatus.label
      : trackingStatus.label

  useImperativeHandle(ref, () => ({
    togglePause() {
      if (state === "ready") stop()
      else if (state === "stopped") void start()
    },
  }))

  return (
    <section aria-label="Aperçu caméra" className="camera-preview">
      <button
        type="button"
        className="camera-preview__viewport"
        aria-label={
          state === "ready"
            ? "Mettre la caméra en pause"
            : state === "stopped"
              ? "Reprendre la caméra"
              : state === "idle"
                ? "Activer ma caméra"
                : "Aperçu caméra"
        }
        disabled={!canToggleFromPreview}
        data-tracking-tone={state === "ready" ? trackingStatus.tone : undefined}
        onClick={() => {
          if (state === "ready") stop()
          else void start()
        }}
      >
        <video
          ref={videoRef}
          className="camera-preview__video"
          aria-label="Flux vidéo local"
          autoPlay
          muted
          playsInline
          hidden={state !== "ready"}
        />
        <canvas
          ref={canvasRef}
          className="camera-preview__landmarks"
          aria-label="Repères de la main détectée"
          hidden={state !== "ready"}
        />
        {calibrating ? (
          <div
            className="camera-preview__calibration-guide"
            aria-hidden="true"
          />
        ) : null}

        {state === "requesting" ? (
          <LoaderCircle aria-hidden="true" className="camera-preview__loader" />
        ) : null}

        {state === "idle" || state === "stopped" ? (
          <Camera
            aria-hidden="true"
            className="text-muted-foreground size-12"
          />
        ) : null}

        {error ? (
          <CameraOff aria-hidden="true" className="text-warning size-12" />
        ) : null}

        {state === "ready" ? (
          <span
            aria-hidden="true"
            className="camera-preview__live-indicator"
            data-tone={trackingStatus.tone}
          />
        ) : null}
      </button>

      <div className="camera-preview__controls" aria-live="polite">
        {state === "requesting" ? (
          <span className="sr-only">Activation de la caméra…</span>
        ) : null}

        {state === "ready" ? (
          <>
            <span className="sr-only">Caméra active</span>
            <span className="sr-only">{visibleTrackingLabel}</span>
            {devices.length > 1 ? (
              <label className="camera-preview__device-field">
                <span>Caméra utilisée</span>
                <select
                  value={selectedDeviceId}
                  onChange={(event) => selectDevice(event.target.value)}
                >
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </>
        ) : null}

        {state === "stopped" ? (
          <span className="sr-only">Caméra en pause</span>
        ) : null}

        {error ? (
          <div className="camera-preview__error">
            <div className="camera-preview__message">
              <CircleAlert aria-hidden="true" />
              <div>
                <p className="font-medium">{error.title}</p>
                <p>{error.description}</p>
              </div>
            </div>
            <Button className="h-11 w-full" onClick={() => void start()}>
              {error.action}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  )
})
