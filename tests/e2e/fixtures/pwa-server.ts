import { createServer } from "node:http"
import { readFile } from "node:fs/promises"
import path from "node:path"

const mime: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".wasm": "application/wasm",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
}

// Test-only loopback server. Failures and A/B switches cannot reach production.
export async function createPwaServer(directory = "dist") {
  let root = path.resolve(directory)
  const manifest = JSON.parse(
    await readFile(path.join(root, "manifest.webmanifest"), "utf8"),
  ) as { scope: string }
  const base = manifest.scope
  let failure: { path: string; mode: "http" | "integrity" } | undefined
  const requests: string[] = []
  const server = createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? "/", "http://localhost")
      requests.push(url.pathname)
      if (!url.pathname.startsWith(base)) {
        response.writeHead(404).end()
        return
      }
      const relative =
        decodeURIComponent(url.pathname.slice(base.length)) || "index.html"
      const file = path.resolve(root, relative)
      if (!file.startsWith(`${root}${path.sep}`)) {
        response.writeHead(404).end()
        return
      }
      if (failure?.path === relative && failure.mode === "http") {
        response.writeHead(503).end()
        return
      }
      try {
        const bytes = await readFile(file)
        response.writeHead(200, {
          "Content-Type":
            mime[path.extname(file)] ?? "application/octet-stream",
          "Cache-Control": "no-cache",
        })
        response.end(
          failure?.path === relative
            ? Buffer.from("invalid deployment bytes")
            : bytes,
        )
      } catch {
        response.writeHead(404).end()
      }
    })().catch(() => {
      response.writeHead(500).end()
    })
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (!address || typeof address === "string")
    throw new Error("No test server address")
  return {
    url: `http://127.0.0.1:${address.port}${base}`,
    requests,
    switchBuild: (directory: string) => {
      root = path.resolve(directory)
    },
    fail: (file?: string, mode: "http" | "integrity" = "http") => {
      failure = file ? { path: file, mode } : undefined
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
        server.closeAllConnections()
      }),
  }
}
