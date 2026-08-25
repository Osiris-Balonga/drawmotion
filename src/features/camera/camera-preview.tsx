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

type CameraPreviewProps = {
  adapterFactory?: CameraAdapterFactory
}

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

export function CameraPreview({ adapterFactory }: CameraPreviewProps) {
  const {
    devices,
    selectedDeviceId,
    selectDevice,
    start,
    state,
    stop,
    videoRef,
  } = useCameraLifecycle(adapterFactory)
  const error =
    state === "denied" ||
    state === "missing" ||
    state === "busy" ||
    state === "failed"
      ? errorContent[state]
      : null

  return (
    <section aria-label="Aperçu caméra" className="camera-preview">
      <div className="camera-preview__viewport">
        <video
          ref={videoRef}
          className="camera-preview__video"
          aria-label="Flux vidéo local"
          autoPlay
          muted
          playsInline
          hidden={state !== "ready"}
        />

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
