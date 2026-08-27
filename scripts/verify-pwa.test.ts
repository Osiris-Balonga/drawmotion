import { createHash } from "node:crypto"
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { expect, it } from "vitest"

// The CLI is JavaScript so deployment machines need no TS runner.
import { verifyPwa } from "./verify-pwa.mjs"

it("rejects incomplete and mismatched cache inventories", () => {
  mkdirSync(".artifacts/pwa", { recursive: true })
  const root = mkdtempSync(path.resolve(".artifacts/pwa/inventory-"))
  writeFileSync(
    path.join(root, "manifest.webmanifest"),
    JSON.stringify({
      scope: "/drawmotion/",
      id: "/drawmotion/",
      start_url: "/drawmotion/",
      display: "standalone",
    }),
  )
  writeFileSync(path.join(root, "index.html"), "document")
  const entry = {
    integrity: "sha256-wrong",
    revision: "revision",
    url: "index.html",
  }
  expect(() => verifyPwa(root, JSON.stringify([entry]))).toThrow(
    "Integrity mismatch",
  )
  entry.integrity = `sha256-${createHash("sha256")
    .update(readFileSync(path.join(root, "index.html")))
    .digest("base64")}`
  expect(() => verifyPwa(root, JSON.stringify([entry]))).toThrow(
    "Missing offline asset",
  )
  expect(() => verifyPwa(root, JSON.stringify([entry, entry]))).toThrow(
    "Duplicate precache",
  )
  expect(() =>
    verifyPwa(root, JSON.stringify([{ ...entry, url: "../escape" }])),
  ).toThrow("Unsafe cache URL")
})
