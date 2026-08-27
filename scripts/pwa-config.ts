import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { VitePWA } from "vite-plugin-pwa"
import type { Plugin } from "vite"

const require = createRequire(import.meta.url)
export const buildId =
  process.env.PWA_BUILD_ID ||
  process.env.GITHUB_SHA ||
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim()

export function pwaPlugins(base: string): Plugin[] {
  let outputDirectory = "dist"
  const manifest = {
    id: base,
    start_url: base,
    scope: base,
    name: "DrawMotion",
    short_name: "DrawMotion",
    description:
      "Draw in the air with your webcam. Private, on-device gesture drawing.",
    lang: "en",
    display: "standalone",
    theme_color: "#1b1b23",
    background_color: "#ffffff",
    icons: [
      {
        src: `${base}pwa/icon-192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${base}pwa/icon-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${base}pwa/maskable-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
  return [
    {
      name: "drawmotion-offline-metadata",
      apply: "build",
      configResolved(config) {
        outputDirectory = path.resolve(config.root, config.build.outDir)
      },
      transformIndexHtml: () => [
        {
          tag: "link",
          attrs: { rel: "manifest", href: `${base}manifest.webmanifest` },
          injectTo: "head",
        },
        {
          tag: "meta",
          attrs: { name: "drawmotion-build", content: buildId },
          injectTo: "head",
        },
        {
          tag: "link",
          attrs: {
            rel: "apple-touch-icon",
            href: `${base}pwa/apple-touch-icon.png`,
          },
          injectTo: "head",
        },
      ],
      generateBundle() {
        // Deliberately not precached: connectivity probes must reach the server.
        this.emitFile({
          type: "asset",
          fileName: "network-check.json",
          source: JSON.stringify({ application: "drawmotion" }),
        })
        this.emitFile({
          type: "asset",
          fileName: "manifest.webmanifest",
          source: JSON.stringify(manifest),
        })
        const workerRequire = createRequire(
          require.resolve("workbox-precaching/package.json"),
        )
        const notices = [
          "workbox-core",
          "workbox-precaching",
          "workbox-routing",
          "workbox-strategies",
        ]
          .map((name) => {
            const directory = path.dirname(
              workerRequire.resolve(`${name}/package.json`),
            )
            return `## ${name}\n\n${readFileSync(path.join(directory, "LICENSE"), "utf8")}`
          })
          .join("\n\n")
        this.emitFile({
          type: "asset",
          fileName: "licenses/service-worker.md",
          source: notices,
        })
      },
    },
    ...VitePWA({
      strategies: "injectManifest",
      srcDir: "src/workers",
      filename: "sw.ts",
      injectRegister: false,
      scope: base,
      base,
      includeManifestIcons: false,
      devOptions: { enabled: false },
      // Emit it above so it passes through the same integrity transform as every
      // resource. The plugin's implicit entry is appended after that transform.
      manifest: false,
      injectManifest: {
        maximumFileSizeToCacheInBytes: 16 * 1024 * 1024,
        globPatterns: [
          "index.html",
          "assets/**/*.{js,css,woff2}",
          "vision/**/*.{task,js,wasm}",
          "brand/*.png",
          "onboarding/*.png",
          "pwa/*.png",
          "licenses/*",
          "manifest.webmanifest",
        ],
        globIgnores: ["**/*.map"],
        manifestTransforms: [
          (entries) => ({
            manifest: entries.map((entry) => ({
              ...entry,
              integrity: `sha256-${createHash("sha256")
                .update(readFileSync(path.join(outputDirectory, entry.url)))
                .digest("base64")}`,
            })),
            warnings: [],
          }),
        ],
      },
    }),
  ]
}
