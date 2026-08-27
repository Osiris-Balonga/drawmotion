import { useEffect, useState, useSyncExternalStore } from "react"
import { PwaClient } from "@/infrastructure/pwa/pwa-client"

export function usePwa() {
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
  return { state, client }
}
