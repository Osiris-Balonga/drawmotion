import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

const assets = {
  "public/vision/hand_landmarker.task":
    "fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1",
  "public/vision/wasm/vision_wasm_internal.js":
    "e170ee67dd4e16c1a6fcd8840a206687e5a59b22c20e4a902bc445b095454d73",
  "public/vision/wasm/vision_wasm_internal.wasm":
    "8da277a733926eacd0474b8704b36742d6ec3231c57a860c5b889dff8f1df886",
  "public/vision/wasm/vision_wasm_module_internal.js":
    "da8934057f147b622e82cfb4c0dbd85461c598e268588b5a8ba9ca963a8ff82d",
  "public/vision/wasm/vision_wasm_module_internal.wasm":
    "2dabd8e23c60984628beb7bb338764c81a08e6837145273f59578684b5d53c1b",
  "public/vision/wasm/vision_wasm_nosimd_internal.js":
    "e81d715a3d42cc3373602eb2f7aff795d164934db680e32496b65dab537f9658",
  "public/vision/wasm/vision_wasm_nosimd_internal.wasm":
    "a28483cd42e74e855bf5ebdb6b40d9b66a5b49e35e95020bc97669e6822a3192",
}

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url))
const failures = []

for (const [relativePath, expectedHash] of Object.entries(assets)) {
  try {
    const contents = await readFile(
      new URL(relativePath, `file:///${repositoryRoot}`),
    )
    const actualHash = createHash("sha256").update(contents).digest("hex")

    if (actualHash !== expectedHash) {
      failures.push(
        `${relativePath}: expected ${expectedHash}, received ${actualHash}`,
      )
    }
  } catch (error) {
    failures.push(
      `${relativePath}: ${error instanceof Error ? error.message : "unreadable asset"}`,
    )
  }
}

if (failures.length > 0) {
  console.error(`Vision asset verification failed:\n${failures.join("\n")}`)
  process.exitCode = 1
} else {
  console.log(`Verified ${Object.keys(assets).length} MediaPipe assets.`)
}
