import assert from "node:assert/strict"
import { readFile, readdir } from "node:fs/promises"
import { gzipSync } from "node:zlib"

const assets = new URL("../dist/assets/", import.meta.url)
const totals = { javascript: 0, javascriptGzip: 0, css: 0 }
for (const name of await readdir(assets)) {
  if (!/\.(js|css)$/.test(name)) continue
  const bytes = await readFile(new URL(name, assets))
  const gzip = gzipSync(bytes).length
  console.info(
    `${name}: ${(bytes.length / 1024).toFixed(1)} KiB; gzip ${(gzip / 1024).toFixed(1)} KiB`,
  )
  if (name.endsWith(".js")) {
    assert(
      !bytes.includes("[DrawMotion vision]"),
      "Development diagnostics leaked into the production bundle",
    )
    totals.javascript += bytes.length
    totals.javascriptGzip += gzip
  } else totals.css += bytes.length
}
assert(
  totals.javascript > 0 && totals.css > 0,
  "Build missing: run pnpm build first",
)
// Includes the lazy MediaPipe Worker, excludes separately verified model/WASM files.
assert(
  totals.javascript <= 800 * 1024,
  "JavaScript exceeds the 800 KiB raw budget",
)
assert(
  totals.javascriptGzip <= 250 * 1024,
  "JavaScript exceeds the 250 KiB gzip budget",
)
assert(totals.css <= 100 * 1024, "CSS exceeds the 100 KiB raw budget")
console.info("Bundle budgets passed", totals)
