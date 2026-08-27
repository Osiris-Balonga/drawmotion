import { setCacheNameDetails } from "workbox-core/setCacheNameDetails"
import { matchPrecache } from "workbox-precaching/matchPrecache"
import { precacheAndRoute } from "workbox-precaching/precacheAndRoute"
import type { PrecacheEntry } from "workbox-precaching/_types"
import { getCacheKeyForURL } from "workbox-precaching/getCacheKeyForURL"
import { cacheNames } from "workbox-core/cacheNames"
import { clientsMatchBuild } from "../infrastructure/pwa/initial-control"
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

// Updates still wait for old controlled windows to close: never skipWaiting.
// On first use, matching documents can go offline without a reload ceremony.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      if (await clientsMatchBuild(clients, scope, __BUILD_ID__))
        await self.clients.claim()
    })(),
  )
})

// Workbox removes obsolete revisions on activation. Repairs below only restore
// missing entries from this worker's immutable, integrity-checked inventory.
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
      let canRepair = "repair" in data && data.repair === true
      for (const entry of entries) {
        if (await matchPrecache(entry.url)) continue
        if (canRepair && entry.integrity) {
          try {
            const key = getCacheKeyForURL(entry.url)
            const response = await fetch(new URL(entry.url, scope), {
              integrity: entry.integrity,
              cache: "reload",
              signal: AbortSignal.timeout(10_000),
            })
            if (key && response.ok) {
              await (await caches.open(cacheNames.precache)).put(key, response)
              continue
            }
          } catch {
            /* Keep reporting incomplete; retry after connectivity returns. */
          }
          canRepair = false
        }
        missing++
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
