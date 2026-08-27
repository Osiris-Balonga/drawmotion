# ADR 0003: Explicit offline preparation and deferred updates

Status: Accepted

## Context

DrawMotion already runs inference and stores the current drawing on the device.
Its model and WebAssembly runtimes are large, and an unexpected reload can
interrupt a gesture or discard session-only undo history. GitHub Pages serves
the application under `/drawmotion/`, alongside other projects on the same origin.

## Decision

- Use Vite PWA's `injectManifest` integration and Workbox precaching. Keep the
  service worker disabled during development.
- Prepare the complete application only after an explicit user action. Include
  every supported MediaPipe runtime, fonts, tutorial images and license notices.
- Scope registration, routing and cache names to this application. Unknown URLs
  remain 404s. Do not cache camera frames, exports or arbitrary network requests.
- Verify cached resources before reporting readiness. Installation is not proof
  of offline readiness; the first preparation requires closing and reopening.
- Never call `skipWaiting`, claim existing clients or automatically reload.
  Updates activate after all windows using the old version close.
- Preserve the existing local drawing format. Cache maintenance must never erase
  drawings or another project's caches. Persistent storage is a separate,
  optional browser request, not a durability guarantee.
- Installation and camera permissions remain explicit. Browser eviction, private
  browsing and unsupported devices limit offline guarantees.

## Verification and release

Validate the actual production build at both the root and Pages base paths.
Use isolated browser profiles to test cold offline launches, first offline
inference, resource integrity failures and two-window A/B updates. Existing
intercepted-worker tests run with service workers blocked. Real webcam and
physical tablet checks remain a release gate; automated tests do not replace them.

## Consequences

Preparation downloads roughly 50 MB once. An open old-version window can defer
an update indefinitely. A failed preparation or update must leave the drawing
and the previously working version usable. Recovery and rollback are documented
as forward service-worker updates, not deletion of the service worker alone.
