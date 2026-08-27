import { mkdir, readFile, writeFile } from "node:fs/promises"
import { chromium } from "@playwright/test"

// Deterministic packaging of the approved artwork, not a logo redesign.
// Requires the same Chromium installation used by the browser test suite.
const source = await readFile("public/brand/drawmotion-symbol-b.png")
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  await mkdir("public/pwa", { recursive: true })
  for (const [name, size, scale] of [
    ["icon-192", 192, 1],
    ["icon-512", 512, 1],
    ["maskable-512", 512, 0.7],
    ["apple-touch-icon", 180, 0.9],
  ]) {
    const data = await page.evaluate(
      async ({ source, size, scale }) => {
        const image = new Image()
        image.src = `data:image/png;base64,${source}`
        await image.decode()
        const canvas = document.createElement("canvas")
        canvas.width = canvas.height = size
        const context = canvas.getContext("2d")
        context.fillStyle = "#ffffff"
        context.fillRect(0, 0, size, size)
        context.imageSmoothingQuality = "high"
        const inset = (size * (1 - scale)) / 2
        context.drawImage(image, inset, inset, size * scale, size * scale)
        return canvas.toDataURL("image/png").split(",")[1]
      },
      { source: source.toString("base64"), size, scale },
    )
    await writeFile(`public/pwa/${name}.png`, Buffer.from(data, "base64"))
  }
} finally {
  await browser.close()
}
