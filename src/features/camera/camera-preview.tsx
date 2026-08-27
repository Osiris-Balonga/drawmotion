import { t } from "@/i18n"

import { forwardRef, useImperativeHandle } from "react"

import {
  Camera,
  CameraOff,
  CircleAlert,
  CircleHelp,
  Eraser,
  LoaderCircle,
  Menu,
  MousePointer2,
  PenLine,
} from "lucide-react"

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
import type { GestureModeFeedback } from "@/features/workspace/gesture-mode-feedback"

type CameraPreviewProps = {
  adapterFactory?: CameraAdapterFactory
  trackerFactory?: HandTrackerFactory
  onGestureFrame?: GestureFrameListener
  calibrating?: boolean
  gestureNotice?: GestureModeFeedback | null
}

export type CameraPreviewHandle = {
  togglePause(): void
}

const trackingContent = {
  idle: { label: t("tracking.paused"), tone: "neutral" },
  initializing: { label: t("tracking.starting"), tone: "neutral" },
  reliable: { label: t("tracking.reliable"), tone: "success" },
  uncertain: { label: t("tracking.uncertain"), tone: "warning" },
  lost: { label: t("tracking.lost"), tone: "neutral" },
  error: { label: t("tracking.error"), tone: "error" },
} as const

const gestureLabels = {
  pinch: t("gesture.pinch"),
  "open-hand": t("gesture.open"),
  fist: t("gesture.fist"),
  menu: t("commands.title"),
  uncertain: t("gesture.uncertain"),
  "tracking-lost": t("gesture.none"),
} as const

const errorContent = {
  denied: {
    title: t("camera.deniedTitle"),
    description: t("camera.deniedDescription"),
    action: t("camera.retry"),
  },
  missing: {
    title: t("camera.missingTitle"),
    description: t("camera.missingDescription"),
    action: t("camera.search"),
  },
  busy: {
    title: t("camera.busyTitle"),
    description: t("camera.busyDescription"),
    action: t("camera.retry"),
  },
  failed: {
    title: t("camera.failedTitle"),
    description: t("camera.failedDescription"),
    action: t("camera.retry"),
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
    gestureNotice = null,
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
        ? t("gesture.pinching")
        : pinchPhase === "active"
          ? t("gesture.active")
          : pinchPhase === "pending-release"
            ? t("gesture.releasing")
            : gesture === "fist"
              ? gestureLabels.fist
              : gesture === "menu"
                ? gestureLabels.menu
                : trackingStatus.label
      : trackingStatus.label

  useImperativeHandle(ref, () => ({
    togglePause() {
      if (state === "ready") stop()
      else if (state === "stopped") void start()
    },
  }))

  return (
    <section aria-label={t("camera.preview")} className="camera-preview">
      <button
        type="button"
        className="camera-preview__viewport"
        aria-label={
          state === "ready"
            ? t("camera.pause")
            : state === "stopped"
              ? t("camera.resume")
              : state === "idle"
                ? t("camera.start")
                : t("camera.preview")
        }
        disabled={!canToggleFromPreview}
        onClick={() => {
          if (state === "ready") stop()
          else void start()
        }}
      >
        <video
          ref={videoRef}
          className="camera-preview__video"
          aria-label={t("camera.video")}
          autoPlay
          muted
          playsInline
          hidden={state !== "ready"}
        />
        <canvas
          ref={canvasRef}
          className="camera-preview__landmarks"
          aria-label={t("camera.landmarks")}
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
      </button>

      {gestureNotice ? (
        <div
          key={`${gestureNotice.kind}-${gestureNotice.label}`}
          className="camera-preview__gesture-toast"
          data-kind={gestureNotice.kind}
          data-persistent={gestureNotice.persistent || undefined}
          role="status"
        >
          {gestureNotice.kind === "pointer" ? (
            <MousePointer2 aria-hidden="true" />
          ) : gestureNotice.kind === "pen" ? (
            <PenLine aria-hidden="true" />
          ) : gestureNotice.kind === "eraser" ? (
            <Eraser aria-hidden="true" />
          ) : gestureNotice.kind === "commands" ? (
            <Menu aria-hidden="true" />
          ) : (
            <CircleHelp aria-hidden="true" />
          )}
          <span>{gestureNotice.label}</span>
        </div>
      ) : null}

      <div className="camera-preview__controls" aria-live="polite">
        {state === "requesting" ? (
          <span className="sr-only">{t("camera.starting")}</span>
        ) : null}

        {state === "ready" ? (
          <>
            <span className="sr-only">{t("camera.active")}</span>
            <span className="sr-only">{visibleTrackingLabel}</span>
            {devices.length > 1 ? (
              <label className="camera-preview__device-field">
                <span>{t("camera.selected")}</span>
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
          <span className="sr-only">{t("camera.paused")}</span>
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
        {state === "ready" && trackingState === "error" ? (
          <div className="camera-preview__error" role="alert">
            <div className="camera-preview__message">
              <CircleAlert aria-hidden="true" />
              <div>
                <p className="font-medium">{t("tracking.errorTitle")}</p>
                <p>{t("tracking.errorDescription")}</p>
              </div>
            </div>
            <Button className="h-11 w-full" onClick={stop}>
              {t("camera.pause")}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  )
})
