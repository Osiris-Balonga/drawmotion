// Workbox's Node-side build types reference this worker-only event, but loading
// lib.webworker alongside the E2E DOM library creates conflicting globals.
// Only the standard event extension used by those build types is needed here.
interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void
}
