import { setCacheNameDetails } from "workbox-core/setCacheNameDetails"
import { matchPrecache } from "workbox-precaching/matchPrecache"
import { precacheAndRoute } from "workbox-precaching/precacheAndRoute"
import type { PrecacheEntry } from "workbox-precaching/_types"
import {
  OFFLINE_PROTOCOL,
  OFFLINE_STATUS_REQUEST,
  type OfflineReport,
} from "../infrastructure/pwa/pwa-contract"

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: PrecacheEntry[]
}
declare const __BUILD_ID__: string

const scope = self.registration.scope
// Stable across builds so unchanged models are reused. Never share another app's cache.
setCacheNameDetails({
  prefix: "drawmotion",
  suffix: encodeURIComponent(new URL(scope).pathname),
})
const entries = self.__WB_MANIFEST
precacheAndRoute(entries, {
  cleanURLs: false,
  directoryIndex: "index.html",
  ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],
})

// Workbox removes obsolete revisions on activation. No forced activation, client
// claiming, catch-all navigation fallback, runtime caching or cache-wide deletion.
self.addEventListener("message", (event: ExtendableMessageEvent) => {
  const data: unknown = event.data
  if (
    !data ||
    typeof data !== "object" ||
    !("type" in data) ||
    data.type !== OFFLINE_STATUS_REQUEST ||
    !("protocol" in data) ||
    data.protocol !== OFFLINE_PROTOCOL ||
    !("requestId" in data) ||
    typeof data.requestId !== "string" ||
    data.requestId.length > 128
  )
    return
  const port = event.ports[0]
  const source = event.source
  if (!port || !source || !("id" in source)) return
  const requestId = data.requestId
  event.waitUntil(
    (async () => {
      const client = await self.clients.get(source.id)
      if (!client || !client.url.startsWith(scope)) return
      let missing = 0
      for (const entry of entries) {
        if (!(await matchPrecache(entry.url))) missing++
      }
      port.postMessage({
        protocol: OFFLINE_PROTOCOL,
        requestId,
        buildId: __BUILD_ID__,
        scope,
        complete: missing === 0,
        missing,
      } satisfies OfflineReport)
      port.close()
    })(),
  )
})
