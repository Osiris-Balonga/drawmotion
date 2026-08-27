import assert from "node:assert/strict"
import { JSDOM } from "jsdom"
import { documentCsp } from "./security-policy.ts"

const target = process.argv[2]
if (!target)
  throw new Error(
    "Usage: pnpm verify:deployment https://owner.github.io/repository/",
  )
const base = new URL(target)
assert.ok(
  base.pathname.endsWith("/"),
  "Pass the site URL with a trailing slash",
)
assert.ok(
  base.protocol === "https:" || base.hostname === "127.0.0.1",
  "HTTPS is required outside localhost",
)
const response = await fetch(base, {
  redirect: "error",
  signal: AbortSignal.timeout(20_000),
})
assert.equal(
  response.status,
  200,
  "The deployed index must load without authentication",
)
const dom = new JSDOM(await response.text())
const document = dom.window.document
assert.equal(
  document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content,
  documentCsp,
)
assert.equal(
  document.querySelector('meta[name="referrer"]')?.content,
  "no-referrer",
)
const canonical = document.querySelector('link[rel="canonical"]')?.href
if (base.protocol === "https:") {
  assert.equal(canonical, base.href, "Canonical must match the deployed site")
  assert.ok(
    !document.querySelector('meta[name="robots"]')?.content.includes("noindex"),
    "Production must be indexable",
  )
  const sitemap = await fetch(new URL("sitemap.xml", base))
  assert.equal(sitemap.status, 200)
  assert.ok((await sitemap.text()).includes(`<loc>${base.href}</loc>`))
}
const assets = [
  "vision/hand_landmarker.task",
  "vision/wasm/vision_wasm_internal.wasm",
  ...[
    ...document.querySelectorAll(
      'script[src],link[rel="stylesheet"],link[rel="icon"]',
    ),
  ].map(
    (element) => element.getAttribute("src") || element.getAttribute("href"),
  ),
]
for (const path of assets) {
  const url = new URL(path, base)
  assert.equal(url.origin, base.origin)
  assert.ok(
    url.pathname.startsWith(base.pathname),
    "Asset must stay within the deployment base path",
  )
  const asset = await fetch(url, {
    method: "HEAD",
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  })
  assert.equal(asset.status, 200, `${url.pathname}: expected 200`)
  if (url.pathname.endsWith(".wasm"))
    assert.ok(asset.headers.get("content-type")?.includes("application/wasm"))
  console.info(`Asset verified: ${url.pathname}`)
}
dom.window.close()
console.info(
  "Deployment HTML, document CSP, assets, and SEO verified. This does not validate physical webcam input or Worker response headers.",
)
