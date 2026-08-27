import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { gzipSync } from "node:zlib"

export function verifyPwa(
  directory = "dist",
  worker = readFileSync(path.join(directory, "sw.js"), "utf8"),
) {
  const read = (name) => readFileSync(path.join(directory, name))
  const manifest = JSON.parse(read("manifest.webmanifest"))
  const base = manifest.scope
  assert(
    /^\/(?:[\w-]+\/)*$/.test(base),
    "Manifest scope must be an application base path",
  )
  assert.equal(manifest.start_url, base)
  assert.equal(manifest.id, base)
  assert.equal(manifest.display, "standalone")
  const match = worker.match(
    /\[\{(?:"integrity"|"revision"|"url"):[\s\S]*?\}\]/,
  )
  assert(match, "No injected precache manifest")
  const entries = JSON.parse(match[0])
  const urls = new Set(entries.map((entry) => entry.url))
  assert.equal(urls.size, entries.length, "Duplicate precache entries")
  let total = 0
  for (const entry of entries) {
    assert(
      !entry.url.startsWith("/") &&
        !entry.url.includes("..") &&
        !entry.url.includes(":"),
      `Unsafe cache URL: ${entry.url}`,
    )
    assert(
      !/\.map$|^sw\.js$|^docs\/|^tests\//.test(entry.url),
      `Unexpected precache URL: ${entry.url}`,
    )
    const bytes = read(entry.url)
    total += bytes.length
    assert(bytes.length <= 16 * 1024 * 1024, `Oversized asset: ${entry.url}`)
    assert.equal(
      entry.integrity,
      `sha256-${createHash("sha256").update(bytes).digest("base64")}`,
      `Integrity mismatch: ${entry.url}`,
    )
    assert(
      entry.revision || /-[\w-]{8,}\./.test(entry.url),
      `Unversioned asset: ${entry.url}`,
    )
  }
  const files = readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) =>
      path
        .relative(directory, path.join(entry.parentPath, entry.name))
        .replaceAll("\\", "/"),
    )
  const required = files.filter((name) =>
    /^(assets\/.*\.(?:js|css|woff2)|vision\/.*\.(?:js|wasm|task)|(?:brand|onboarding|pwa)\/.*\.png|licenses\/.*|index\.html|manifest\.webmanifest)$/.test(
      name,
    ),
  )
  for (const name of required)
    assert(urls.has(name), `Missing offline asset: ${name}`)
  assert.equal(
    required.filter((name) => /^vision\//.test(name)).length,
    7,
    "All seven MediaPipe assets must ship",
  )
  assert(total <= 60 * 1024 * 1024, "Precache exceeds 60 MiB")
  assert(
    Buffer.byteLength(worker) <= 100 * 1024,
    "Service worker exceeds 100 KiB",
  )
  assert(
    gzipSync(worker).length <= 35 * 1024,
    "Service worker exceeds 35 KiB gzip",
  )
  assert(
    !/\.skipWaiting\(|\.claim\(/.test(worker),
    "Updates must not replace active drawing sessions",
  )
  for (const icon of [
    ...manifest.icons,
    { src: `${base}pwa/apple-touch-icon.png`, sizes: "180x180" },
  ]) {
    assert(icon.src.startsWith(base), "Icon escapes application scope")
    const bytes = read(icon.src.slice(base.length))
    assert.equal(bytes.subarray(1, 4).toString(), "PNG")
    assert.equal(
      `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`,
      icon.sizes,
    )
  }
  assert(
    manifest.icons.some((icon) => icon.purpose === "maskable"),
    "Missing maskable icon",
  )
  const html = read("index.html").toString()
  assert(
    html.replaceAll("&#39;", "'").includes("manifest-src 'self'"),
    "Manifest CSP missing",
  )
  assert(html.includes("drawmotion-build"), "Build identity missing")
  assert(
    html.includes(`${base}manifest.webmanifest`),
    "Manifest URL must respect base path",
  )
  return { entries: entries.length, bytes: total, base }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const result = verifyPwa(process.argv[2] ?? "dist")
  console.info(
    `PWA verified: ${result.entries} integrity-checked assets, ${(result.bytes / 1_000_000).toFixed(2)} MB, scope ${result.base}`,
  )
}
