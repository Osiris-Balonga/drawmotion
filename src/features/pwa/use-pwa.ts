import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { toast } from "sonner"
import { t } from "@/i18n"
import { PwaClient } from "@/infrastructure/pwa/pwa-client"
import { CLIENT_BUILD_REQUEST } from "@/infrastructure/pwa/pwa-contract"
import { useConnectivity } from "./use-connectivity"

export function usePwa() {
  const notified = useRef(false)
  const [client] = useState(
    () =>
      new PwaClient(
        import.meta.env.PROD &&
          window.isSecureContext &&
          "serviceWorker" in navigator
          ? navigator.serviceWorker
          : undefined,
        new URL(import.meta.env.BASE_URL, window.location.origin).href,
      ),
  )
  const state = useSyncExternalStore(
    client.subscribe,
    client.getSnapshot,
    client.getSnapshot,
  )
  const connection = useConnectivity(client)
  useEffect(() => {
    const identify = (event: MessageEvent<unknown>) => {
      if (
        event.data &&
        typeof event.data === "object" &&
        "type" in event.data &&
        event.data.type === CLIENT_BUILD_REQUEST
      ) {
        event.ports[0]?.postMessage(
          document.querySelector<HTMLMetaElement>(
            'meta[name="drawmotion-build"]',
          )?.content,
        )
      }
    }
    navigator.serviceWorker?.addEventListener("message", identify)
    // Let the initial document render before starting the one-time asset cache.
    const start = () => client.start()
    const timer =
      document.readyState === "complete" ? setTimeout(start, 0) : undefined
    if (document.readyState !== "complete")
      window.addEventListener("load", start, { once: true })
    const visible = () => {
      if (document.visibilityState === "visible") client.onVisible()
    }
    document.addEventListener("visibilitychange", visible)
    return () => {
      document.removeEventListener("visibilitychange", visible)
      navigator.serviceWorker?.removeEventListener("message", identify)
      window.removeEventListener("load", start)
      clearTimeout(timer)
      client.dispose()
    }
  }, [client])
  useEffect(() => {
    if (state.update === "waiting-for-close" && !notified.current) {
      notified.current = true
      toast.message(t("pwa.updateWaiting"), {
        id: "pwa-update",
        duration: 8000,
      })
    }
  }, [state.update])
  return { state, client, connection }
}
