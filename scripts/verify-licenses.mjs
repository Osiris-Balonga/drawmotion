import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

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
console.info(
  `Licence packaging verified: ${entries.length} bundled dependency notices plus static assets.`,
)
