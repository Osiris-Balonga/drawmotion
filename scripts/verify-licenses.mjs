import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"

// Checks packaging, not legal compatibility. Review provenance in docs/THIRD_PARTY.md.
const bundled = readFileSync("dist/licenses/bundled.md", "utf8")
const entries = bundled.split(/^## /m).slice(1)
assert(entries.length > 0, "No bundled dependency notices were generated")
for (const entry of entries) {
  const [heading, ...body] = entry.split("\n")
  assert(
    /permission|redistribution|apache license/i.test(body.join("\n")),
    `Missing licence text for ${heading}; inspect the package before distribution`,
  )
}

for (const file of [
  "mediapipe-Apache-2.0.txt",
  "geist-OFL.txt",
  "shadcn-MIT.txt",
  "tailwindcss-MIT.txt",
  "tw-animate-css-MIT.txt",
  "README.md",
]) {
  assert.equal(
    readFileSync(`dist/licenses/${file}`, "utf8"),
    readFileSync(`public/licenses/${file}`, "utf8"),
    `Distribution notice differs from source: ${file}`,
  )
}
assert.equal(
  readFileSync("dist/licenses/drawmotion-MIT.txt", "utf8"),
  readFileSync("LICENSE", "utf8"),
  "The distribution must retain DrawMotion's licence",
)
const workerNotices = readFileSync("dist/licenses/service-worker.md", "utf8")
const require = createRequire(import.meta.url)
const workerRequire = createRequire(
  require.resolve("workbox-precaching/package.json"),
)
for (const name of [
  "workbox-core",
  "workbox-precaching",
  "workbox-routing",
  "workbox-strategies",
]) {
  const directory = path.dirname(workerRequire.resolve(`${name}/package.json`))
  assert(
    workerNotices.includes(
      `## ${name}\n\n${readFileSync(path.join(directory, "LICENSE"), "utf8")}`,
    ),
    `Missing full worker licence: ${name}`,
  )
}
console.info(
  `Licence packaging verified: ${entries.length} bundled dependency notices plus static assets.`,
)
