import {
  Camera,
  CameraOff,
  CircleAlert,
  LoaderCircle,
  ShieldCheck,
  Video,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  useCameraLifecycle,
  type CameraAdapterFactory,
} from "@/features/camera/use-camera-lifecycle"
import {
  useHandTracking,
  type HandTrackerFactory,
} from "@/features/camera/use-hand-tracking"
import type { GestureKind } from "@/core/gestures/gesture-classifier"
import type { HandTrackingResult } from "@/infrastructure/mediapipe/hand-tracker-port"
import { cn } from "@/lib/utils"

type CameraPreviewProps = {
  adapterFactory?: CameraAdapterFactory
  trackerFactory?: HandTrackerFactory
  onGestureFrame?: (result: HandTrackingResult, gesture: GestureKind) => void
  calibrating?: boolean
}

const trackingContent = {
  idle: { label: "Suivi en pause", className: "" },
  initializing: { label: "Analyse de la main…", className: "" },
  reliable: { label: "Suivi fiable", className: "camera-preview__status" },
  uncertain: {
    label: "Suivi hésitant",
    className: "camera-preview__tracking--uncertain",
  },
  lost: { label: "Main non détectée", className: "" },
  error: {
    label: "Suivi indisponible",
    className: "camera-preview__tracking--error",
  },
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

export function CameraPreview({
  adapterFactory,
  trackerFactory,
  onGestureFrame,
  calibrating = false,
}: CameraPreviewProps) {
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
    metrics,
    state: trackingState,
  } = useHandTracking(
    state === "ready",
    videoRef,
    trackerFactory,
    onGestureFrame,
    calibrating ? "contain" : "cover",
  )
  const trackingStatus = trackingContent[trackingState]
  const error =
    state === "denied" ||
    state === "missing" ||
    state === "busy" ||
    state === "failed"
      ? errorContent[state]
      : null

  return (
    <section
      aria-label="Aperçu caméra"
      className={cn(
        "camera-preview",
        calibrating && "camera-preview--calibrating",
      )}
    >
      <div className="camera-preview__viewport">
        <video
          ref={videoRef}
          className={`camera-preview__video${calibrating ? "camera-preview__video--contain" : ""}`}
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
      </div>

      <div className="camera-preview__controls" aria-live="polite">
        {state === "idle" ? (
          <>
            <div className="camera-preview__message">
              <ShieldCheck aria-hidden="true" />
              <p>
                La vidéo reste sur cet appareil et n’est jamais enregistrée.
              </p>
            </div>
            <Button className="h-11 w-full" onClick={() => void start()}>
              <Video aria-hidden="true" data-icon="inline-start" />
              Activer ma caméra
            </Button>
          </>
        ) : null}

        {state === "requesting" ? (
          <Badge variant="secondary">Activation de la caméra…</Badge>
        ) : null}

        {state === "ready" ? (
          <>
            <Badge className="camera-preview__status">
              <span aria-hidden="true" className="camera-preview__status-dot" />
              Caméra active
            </Badge>
            <Badge variant="secondary" className={trackingStatus.className}>
              <span aria-hidden="true" className="camera-preview__status-dot" />
              {trackingStatus.label}
            </Badge>
            {import.meta.env.DEV ? (
              <Badge
                variant="outline"
                className="camera-preview__gesture"
                aria-label="Geste détecté"
              >
                Geste · {gestureLabels[gesture]}
              </Badge>
            ) : null}
            {import.meta.env.DEV && metrics ? (
              <span className="camera-preview__metrics">
                {Math.round(metrics.inferenceMs)} ms · {metrics.droppedFrames}{" "}
                frame{metrics.droppedFrames === 1 ? "" : "s"} ignorée
                {metrics.droppedFrames === 1 ? "" : "s"}
              </span>
            ) : null}
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
            <Button variant="ghost" size="sm" onClick={stop}>
              Mettre la caméra en pause
            </Button>
          </>
        ) : null}

        {state === "stopped" ? (
          <>
            <Badge variant="secondary">Caméra en pause</Badge>
            <Button className="h-11" onClick={() => void start()}>
              Reprendre la caméra
            </Button>
          </>
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
}
