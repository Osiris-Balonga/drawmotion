import path from "node:path"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { resolveSeo, seoPlugin } from "./scripts/seo.ts"
import { documentCsp } from "./scripts/security-policy.ts"

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
const { canonical } = resolveSeo(process.env)

export default defineConfig({
  // One real route; unknown URLs should stay 404 rather than become soft 404s.
  appType: "mpa",
  base: canonical ? new URL(canonical).pathname : "/",
  plugins: [
    react(),
    tailwindcss(),
    seoPlugin(process.env),
    {
      name: "drawmotion-document-security",
      apply: "build",
      transformIndexHtml: {
        order: "post",
        handler: () => [
          {
            tag: "meta",
            attrs: {
              "http-equiv": "Content-Security-Policy",
              content: documentCsp,
            },
            injectTo: "head-prepend",
          },
        ],
      },
    },
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
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "src"),
    },
  },
})
