import { useEffect, useState } from "react"
import { toast } from "sonner"
import { t } from "@/i18n"
import type { PwaClient } from "@/infrastructure/pwa/pwa-client"

export type ConnectionState = "checking" | "online" | "offline"

export function useConnectivity(client: PwaClient) {
  const [connection, setConnection] = useState<ConnectionState>("checking")
  useEffect(() => {
    if (client.getSnapshot().offline === "unavailable") return
    let stopped = false
    let current: ConnectionState = "checking"
    let request: AbortController | undefined
    let debounce: ReturnType<typeof setTimeout> | undefined
    let retry: ReturnType<typeof setTimeout> | undefined
    let lastProbe = 0
    const publish = (next: ConnectionState) => {
      if (stopped || current === next) return
      const previous = current
      current = next
      setConnection(next)
      if (next === "offline") {
        const availability = client.getSnapshot().offline
        toast.message(
          t(
            availability === "ready"
              ? "pwa.disconnectedReady"
              : availability === "failed"
                ? "pwa.disconnectedIncomplete"
                : "pwa.disconnected",
          ),
          { id: "pwa-connection", duration: 4500 },
        )
      } else if (previous === "offline") {
        toast.message(t("pwa.reconnected"), {
          id: "pwa-connection",
          duration: 3000,
        })
        client.onVisible(true)
        void client.checkForUpdate(true)
      }
    }
    const probe = async () => {
      if (stopped || document.visibilityState === "hidden") return
      lastProbe = Date.now()
      request?.abort()
      const controller = new AbortController()
      request = controller
      const timeout = setTimeout(() => controller.abort(), 5000)
      let connected = false
      try {
        const response = await fetch(
          new URL("network-check.json", client.scope),
          {
            cache: "no-store",
            signal: controller.signal,
            redirect: "error",
          },
        )
        const payload: unknown = response.ok ? await response.json() : null
        connected =
          !!payload &&
          typeof payload === "object" &&
          "application" in payload &&
          payload.application === "drawmotion"
      } catch {
        /* A local cache hit or navigator.onLine alone is not proof. */
      } finally {
        clearTimeout(timeout)
      }
      if (stopped || request !== controller) return
      publish(connected ? "online" : "offline")
      clearTimeout(retry)
      if (!connected)
        retry = setTimeout(() => {
          void probe()
        }, 60_000)
    }
    const changed = () => {
      request?.abort()
      request = undefined
      clearTimeout(debounce)
      debounce = setTimeout(() => {
        void probe()
      }, 800)
    }
    const visible = () => {
      if (Date.now() - lastProbe > 60_000) void probe()
    }
    window.addEventListener("online", changed)
    window.addEventListener("offline", changed)
    document.addEventListener("visibilitychange", visible)
    void probe()
    return () => {
      stopped = true
      request?.abort()
      clearTimeout(debounce)
      clearTimeout(retry)
      window.removeEventListener("online", changed)
      window.removeEventListener("offline", changed)
      document.removeEventListener("visibilitychange", visible)
    }
  }, [client])
  return connection
}
