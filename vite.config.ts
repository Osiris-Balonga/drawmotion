import path from "node:path"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
// Exercise the same policy locally, including Worker and WASM responses.
// Development keeps Vite HMR's own policy; preview uses production headers.
const deployment = JSON.parse(
  readFileSync(path.join(projectRoot, "vercel.json"), "utf8"),
) as {
  headers: { headers: { key: string; value: string }[] }[]
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "drawmotion-license",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "licenses/drawmotion-MIT.txt",
          source: readFileSync(path.join(projectRoot, "LICENSE"), "utf8"),
        })
      },
    },
  ],
  build: {
    license: { fileName: "licenses/bundled.md" },
  },
  preview: {
    headers: Object.fromEntries(
      deployment.headers.flatMap((rule) =>
        rule.headers.map(({ key, value }) => [key, value]),
      ),
    ),
  },
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "src"),
    },
  },
})
