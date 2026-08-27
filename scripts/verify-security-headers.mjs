import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const target = process.argv[2]
if (!target)
  throw new Error("Usage: pnpm verify:security-headers https://preview.example")
const config = JSON.parse(
  await readFile(new URL("../vercel.json", import.meta.url), "utf8"),
)
for (const path of [
  "/",
  "/vision/hand_landmarker.task",
  "/vision/wasm/vision_wasm_internal.wasm",
]) {
  const response = await fetch(new URL(path, target), {
    method: "HEAD",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  })
  assert.equal(
    response.status,
    200,
    `${path}: expected 200 (check preview protection/authentication)`,
  )
  for (const { key, value } of config.headers[0].headers) {
    assert.equal(response.headers.get(key), value, `${path}: ${key}`)
  }
  console.info(`Headers verified: ${path}`)
}
