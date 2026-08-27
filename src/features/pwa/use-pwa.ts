import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { toast } from "sonner"
import { t } from "@/i18n"
import { PwaClient } from "@/infrastructure/pwa/pwa-client"

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
  useEffect(() => {
    client.start()
    const visible = () => {
      if (document.visibilityState === "visible") client.onVisible()
    }
    document.addEventListener("visibilitychange", visible)
    return () => {
      document.removeEventListener("visibilitychange", visible)
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
  return { state, client }
}
