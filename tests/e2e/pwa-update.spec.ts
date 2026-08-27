import { execFile } from "node:child_process"
import { promisify } from "node:util"
import path from "node:path"
import { readFile } from "node:fs/promises"
import { expect, test, type Page } from "@playwright/test"
import { createPwaServer } from "./fixtures/pwa-server"

const buildB = path.resolve(".artifacts/pwa/build-b")

test.beforeAll(async () => {
  test.setTimeout(120_000)
  await promisify(execFile)(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "build", "--outDir", buildB],
    {
      env: { ...process.env, PWA_BUILD_ID: "pwa-test-build-b" },
      timeout: 110_000,
    },
  )
})

async function menu(page: Page) {
  await page.getByRole("button", { name: "Installation et hors ligne" }).click()
}
async function prepare(page: Page, url: string) {
  await page.goto(url)
  await menu(page)
  await page.getByRole("button", { name: /Préparer hors ligne/ }).click()
  await expect(
    page.locator('[data-offline-state="prepared-reopen"]'),
  ).toBeVisible({ timeout: 60_000 })
  await page.reload()
  await menu(page)
  await expect(page.locator('[data-offline-state="ready"]')).toBeVisible()
}

const draft = JSON.stringify({
  version: 1,
  document: {
    strokes: [
      {
        id: "offline-stroke",
        tool: "pen",
        color: "#7c3aed",
        width: 0.008,
        pattern: "solid",
        points: [
          { x: 0.3, y: 0.4 },
          { x: 0.7, y: 0.6 },
        ],
      },
    ],
  },
  viewport: { zoom: 1, offsetX: 0, offsetY: 0 },
})

test("an update waits for both windows to close, then starts B offline with the saved drawing", async ({
  browser,
}) => {
  test.setTimeout(120_000)
  const server = await createPwaServer()
  const context = await browser.newContext({
    serviceWorkers: "allow",
    locale: "fr-FR",
  })
  try {
    const first = await context.newPage()
    await prepare(first, server.url)
    const a = await first
      .locator('meta[name="drawmotion-build"]')
      .getAttribute("content")
    await first.evaluate(
      (draft) => localStorage.setItem("drawmotion:drawing", draft),
      draft,
    )
    await first.reload()
    await menu(first)
    const oldWorker = context.serviceWorkers()[0]
    const second = await context.newPage()
    await second.goto(server.url)
    const before = await first.evaluate(async () => {
      const names = await caches.keys()
      const cache = await caches.open(
        names.find((name) => name.startsWith("drawmotion-"))!,
      )
      return (await cache.keys()).map((request) => request.url)
    })
    server.switchBuild(buildB)
    const requestStart = server.requests.length
    await first
      .getByRole("button", { name: "Rechercher une mise à jour" })
      .click()
    await expect(
      first.locator('[data-update-state="waiting-for-close"]'),
    ).toBeVisible({ timeout: 60_000 })
    // An existing window pins A even when its sibling refreshes.
    await second.reload()
    expect(
      await second
        .locator('meta[name="drawmotion-build"]')
        .getAttribute("content"),
    ).toBe(a)
    expect(
      server.requests
        .slice(requestStart)
        .some((url) => /\.wasm$|\.task$/.test(url)),
    ).toBe(false)
    const worker = context
      .serviceWorkers()
      .find((worker) => worker !== oldWorker)!
    await first.close()
    await second.close()
    await expect
      .poll(async () =>
        worker
          .evaluate(() => {
            const registration = (
              self as unknown as { registration: ServiceWorkerRegistration }
            ).registration
            return (
              registration.waiting === null &&
              registration.active?.state === "activated"
            )
          })
          .catch(() => false),
      )
      .toBe(true)
    await context.setOffline(true)
    const reopened = await context.newPage()
    await reopened.goto(server.url)
    await expect(
      reopened.locator('meta[name="drawmotion-build"]'),
    ).toHaveAttribute("content", "pwa-test-build-b")
    await menu(reopened)
    await expect(reopened.locator('[data-offline-state="ready"]')).toBeVisible()
    expect(
      await reopened.evaluate(() => localStorage.getItem("drawmotion:drawing")),
    ).toBe(draft)
    const after = await reopened.evaluate(async () => {
      const names = await caches.keys()
      const cache = await caches.open(
        names.find((name) => name.startsWith("drawmotion-"))!,
      )
      return (await cache.keys()).map((request) => request.url)
    })
    expect(after.filter((url) => url.includes("hand_landmarker.task"))).toEqual(
      before.filter((url) => url.includes("hand_landmarker.task")),
    )
    expect(
      before
        .filter((url) => /index\.html\?/.test(url))
        .some((url) => after.includes(url)),
    ).toBe(false)
    await reopened.keyboard.press("Escape")
    await reopened.getByRole("button", { name: "Passer le tutoriel" }).click()
    const download = reopened.waitForEvent("download")
    await reopened.getByRole("button", { name: "Exporter en PNG" }).click()
    const exported = await download
    expect(exported.suggestedFilename()).toMatch(/\.png$/)
    const png = await readFile(await exported.path())
    const coloredPixels = await reopened.evaluate(
      async (bytes) => {
        const bitmap = await createImageBitmap(
          new Blob([new Uint8Array(bytes)], { type: "image/png" }),
        )
        const canvas = document.createElement("canvas")
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        const context = canvas.getContext("2d")!
        context.drawImage(bitmap, 0, 0)
        bitmap.close()
        const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
        let count = 0
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] < 200 && data[i + 1] < 180 && data[i + 2] > 160) count++
        }
        return count
      },
      [...png],
    )
    expect(coloredPixels).toBeGreaterThan(100)
    await reopened
      .getByRole("button", { name: "Effacer la toile", exact: true })
      .click()
    await reopened
      .getByRole("alertdialog")
      .getByRole("button", { name: "Effacer la toile", exact: true })
      .click()
    await reopened.reload()
    await expect(
      reopened.getByRole("button", { name: "Exporter en PNG" }),
    ).toBeDisabled()
  } finally {
    await context.close()
    await server.close()
  }
})

test("an interrupted B download leaves the previous version ready offline", async ({
  browser,
}) => {
  test.setTimeout(120_000)
  const server = await createPwaServer()
  const context = await browser.newContext({
    serviceWorkers: "allow",
    locale: "fr-FR",
  })
  try {
    const page = await context.newPage()
    await prepare(page, server.url)
    const a = await page
      .locator('meta[name="drawmotion-build"]')
      .getAttribute("content")
    server.switchBuild(buildB)
    server.fail("index.html")
    await page
      .getByRole("button", { name: "Rechercher une mise à jour" })
      .click()
    await expect(page.locator('[data-update-state="failed"]')).toBeVisible({
      timeout: 60_000,
    })
    await expect(page.locator('[data-offline-state="ready"]')).toBeVisible()
    await context.setOffline(true)
    await page.reload()
    expect(
      await page
        .locator('meta[name="drawmotion-build"]')
        .getAttribute("content"),
    ).toBe(a)
    await menu(page)
    await expect(page.locator('[data-offline-state="ready"]')).toBeVisible()
  } finally {
    await context.close()
    await server.close()
  }
})
