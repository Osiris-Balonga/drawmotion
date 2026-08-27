import { readFile } from "node:fs/promises"
import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import {
  activateCamera,
  aimAt,
  handAt,
  hold,
  inkIn,
  installGestureCamera,
  move,
  pinchButton,
  playHands,
} from "./fixtures/gesture-camera"

test.use({
  launchOptions: {
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  },
})

test.beforeEach(async ({ page }) => {
  await installGestureCamera(page)
  await page.goto("./")
})

test("camera, five tutorial missions, fist eraser, history and downloaded PNG", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000)
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await activateCamera(page)
  for (const point of [
    { x: 0.28, y: 0.36 },
    { x: 0.5, y: 0.24 },
    { x: 0.68, y: 0.48 },
  ]) {
    await aimAt(page, point)
  }
  await expect(
    page.getByRole("heading", { name: "Pincez pour poser le stylo" }),
  ).toBeVisible()

  const start = { x: 0.3, y: 0.4 }
  const end = { x: 0.65, y: 0.4 }
  const middle = { x: 0.48, y: 0.4 }
  await aimAt(page, start)
  await playHands(page, [
    ...hold("pinch", start, 4),
    ...move("pinch", start, end),
    ...hold("open", end),
  ])
  await expect.poll(() => inkIn(page, middle)).toBeGreaterThan(40)
  await expect(
    page.getByRole("heading", {
      name: "Faites le signe paix pour ouvrir les commandes",
    }),
  ).toBeVisible()

  await playHands(page, hold("menu", end, 18))
  const palette = page.getByRole("region", { name: "Commandes gestuelles" })
  await expect(palette).toBeVisible()
  await pinchButton(page, "Couleur")
  await pinchButton(page, "Vert")
  await expect(palette).toBeHidden()
  const dock = page.getByRole("complementary", { name: "Outils de dessin" })
  await expect(
    dock.getByRole("button", { name: "Vert", exact: true }),
  ).toHaveAttribute("aria-pressed", "true")
  // Reopening by button is also supported; selection remains a real pinch.
  await page.getByRole("button", { name: "Ouvrir les commandes" }).click()
  await pinchButton(page, "Trait")
  await pinchButton(page, "12 pixels")
  await expect(
    page.getByRole("heading", { name: "Transformez un geste en forme nette" }),
  ).toBeVisible()

  await playHands(
    page,
    Array.from({ length: 6 }, () => []),
  )
  await dock.getByRole("button", { name: /^Formes/ }).click()
  const circle = Array.from({ length: 41 }, (_, i) => ({
    x: 0.46 + 0.1 * Math.cos((i * Math.PI * 2) / 40),
    y: 0.3 + 0.1 * Math.sin((i * Math.PI * 2) / 40),
  }))
  await aimAt(page, circle[0])
  await playHands(page, [
    ...hold("pinch", circle[0], 4),
    ...circle.map((point) => handAt("pinch", point)),
    ...hold("open", circle.at(-1)!),
  ])
  await expect(
    page.getByRole("heading", { name: "Corrigez sans recommencer" }),
  ).toBeVisible()
  await page.getByRole("button", { name: "Annuler", exact: true }).click()
  await expect(
    page.getByRole("button", { name: "Passer le tutoriel" }),
  ).toBeHidden()
  const inkBeforeReload = await inkIn(page, middle)
  await page.reload()
  await expect(
    page.getByRole("button", { name: "Passer le tutoriel" }),
  ).toBeHidden()

  await expect.poll(() => inkIn(page, middle)).toBe(inkBeforeReload)
  await expect(
    page.getByRole("button", { name: "Exporter en PNG" }),
  ).toBeEnabled()
  await expect(
    page.getByRole("button", { name: "Annuler", exact: true }),
  ).toBeDisabled()
  // Restored strokes remain erasable, while camera access is still explicit.
  await activateCamera(page)
  const originalInk = await inkIn(page, middle)
  expect(originalInk).toBeGreaterThan(40)
  await aimAt(page, { x: middle.x, y: 0.3 })
  await playHands(page, [
    ...move("fist", { x: middle.x, y: 0.3 }, { x: middle.x, y: 0.5 }),
    ...hold("open", { x: middle.x, y: 0.5 }),
  ])
  await expect.poll(() => inkIn(page, middle)).toBe(0)
  await expect.poll(() => inkIn(page, { x: 0.36, y: 0.4 })).toBeGreaterThan(40)
  await page.getByRole("button", { name: "Annuler", exact: true }).click()
  await expect.poll(() => inkIn(page, middle)).toBe(originalInk)
  await page.getByRole("button", { name: "Rétablir", exact: true }).click()
  await expect.poll(() => inkIn(page, middle)).toBe(0)
  await page.reload()
  await expect.poll(() => inkIn(page, middle)).toBe(0)
  await expect.poll(() => inkIn(page, { x: 0.36, y: 0.4 })).toBeGreaterThan(40)

  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("button", { name: "Exporter en PNG" }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^drawmotion-.*\.png$/)
  const path = testInfo.outputPath("gesture-drawing.png")
  await download.saveAs(path)
  const bytes = await readFile(path)
  expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  const raster = await page.evaluate(
    async (bytes) => {
      const bitmap = await createImageBitmap(
        new Blob([new Uint8Array(bytes)], { type: "image/png" }),
      )
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      const context = canvas.getContext("2d")!
      context.drawImage(bitmap, 0, 0)
      const sample = (x: number, y: number) => [
        ...context.getImageData(
          Math.round(x * bitmap.width),
          Math.round(y * bitmap.height),
          1,
          1,
        ).data,
      ]
      const result = {
        width: bitmap.width,
        height: bitmap.height,
        ink: sample(0.36, 0.4),
        erased: sample(0.48, 0.4),
        background: sample(0.1, 0.1),
      }
      bitmap.close()
      return result
    },
    [...bytes],
  )
  expect(raster.width).toBe(1440)
  expect(raster.height).toBe(900)
  expect(raster.ink[0]).toBeLessThan(80)
  expect(raster.ink[3]).toBe(255)
  expect(raster.erased).toEqual([255, 255, 255, 255])
  expect(raster.background).toEqual([255, 255, 255, 255])
  await page.getByRole("button", { name: "Zoomer", exact: true }).click()
  await page.reload()
  await expect(
    page.getByRole("button", { name: "Réinitialiser la vue" }),
  ).toHaveText("120%")
  await page
    .getByRole("button", { name: "Effacer la toile", exact: true })
    .click()
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Effacer la toile", exact: true })
    .click()
  await page.reload()
  await expect(
    page.getByRole("button", { name: "Exporter en PNG" }),
  ).toBeDisabled()
  await expect.poll(() => inkIn(page, { x: 0.36, y: 0.4 })).toBe(0)
  expect(errors).toEqual([])
})

test("reload retains an unfinished stroke and storage errors preserve drawing and export", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Passer le tutoriel" }).click()
  await activateCamera(page)
  const start = { x: 0.3, y: 0.4 }
  const end = { x: 0.7, y: 0.4 }
  await aimAt(page, start)
  await playHands(page, [
    ...hold("pinch", start, 4),
    ...move("pinch", start, end),
  ])
  // No release event: pagehide must finish the live stroke before navigation.
  await page.reload()
  await expect.poll(() => inkIn(page, { x: 0.5, y: 0.4 })).toBeGreaterThan(40)
  await expect(
    page.getByRole("button", { name: "Activer ma caméra" }),
  ).toBeVisible()
  await page.evaluate(() => {
    const originalSetItem = Storage.prototype.setItem.bind(localStorage)
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === "drawmotion:drawing")
        throw new DOMException("Full", "QuotaExceededError")
      originalSetItem(key, value)
    }
  })
  await page.getByRole("button", { name: "Zoomer", exact: true }).click()
  await expect(
    page.getByText(/Le dessin n’a pas pu être sauvegardé/),
  ).toBeVisible()
  const download = page.waitForEvent("download")
  await page.getByRole("button", { name: "Exporter en PNG" }).click()
  expect((await download).suggestedFilename()).toMatch(/\.png$/)
  // Some privacy settings deny access to the storage property itself.
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Blocked", "SecurityError")
      },
    })
  })
  await page.reload()
  await expect(
    page.getByText(/Le dessin sauvegardé n’a pas pu être restauré/),
  ).toBeVisible()
  await page.getByRole("button", { name: "Passer le tutoriel" }).click()
  await expect(
    page.getByRole("button", { name: "Activer ma caméra" }),
  ).toBeEnabled()
})

test("fist eraser respects the selected 24px size instead of the old 40px minimum", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Passer le tutoriel" }).click()
  await activateCamera(page)
  const start = { x: 0.3, y: 0.4 }
  const end = { x: 0.7, y: 0.4 }
  await aimAt(page, start)
  await playHands(page, [
    ...hold("pinch", start, 4),
    ...move("pinch", start, end),
    ...hold("open", end),
  ])
  // Freeze fixture input while choosing settings with the mouse.
  await playHands(page, [[], [], [], []])
  await page.getByRole("button", { name: "Gomme", exact: true }).click()
  await page
    .getByRole("button", { name: "Taille de la gomme 40 pixels" })
    .click()
  await page.getByRole("button", { name: "24 px", exact: true }).click()
  await page.keyboard.press("Escape")
  await aimAt(page, { x: 0.5, y: 0.3 })
  await playHands(page, [
    ...move("fist", { x: 0.5, y: 0.3 }, { x: 0.5, y: 0.5 }),
    ...hold("open", { x: 0.5, y: 0.5 }),
  ])
  // At 1440x900, a 24 reference-pixel eraser has radius 10.8px;
  // the old 40px minimum erased up to 18px on either side.
  expect(await inkIn(page, { x: 0.5, y: 0.4 }, 1)).toBe(0)
  expect(await inkIn(page, { x: 0.5 + 14 / 1440, y: 0.4 }, 1)).toBeGreaterThan(
    0,
  )
})

test("tracking loss ends ink and reacquisition never bridges distant strokes", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Passer le tutoriel" }).click()
  await activateCamera(page)
  const left = { x: 0.2, y: 0.35 }
  const firstEnd = { x: 0.4, y: 0.35 }
  const right = { x: 0.6, y: 0.55 }
  const secondEnd = { x: 0.8, y: 0.55 }
  await aimAt(page, left)
  await playHands(page, [
    ...hold("pinch", left, 4),
    ...move("pinch", left, firstEnd),
    ...Array.from({ length: 8 }, () => []),
  ])
  await expect.poll(() => inkIn(page, { x: 0.3, y: 0.35 })).toBeGreaterThan(40)
  await expect(
    page.getByText("Main non détectée", { exact: true }).last(),
  ).toBeAttached()
  await playHands(page, [
    ...hold("pinch", right),
    ...move("pinch", right, secondEnd),
    ...hold("open", secondEnd),
  ])
  await expect.poll(() => inkIn(page, { x: 0.7, y: 0.55 })).toBeGreaterThan(40)
  expect(await inkIn(page, { x: 0.5, y: 0.45 }, 35)).toBe(0)
})

test("denied camera explains recovery and a retry starts a real video stream", async ({
  page,
}) => {
  await page.evaluate(() => {
    const nativeGetUserMedia = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    )
    let denied = false
    navigator.mediaDevices.getUserMedia = (constraints) => {
      if (!denied) {
        denied = true
        return Promise.reject(
          new DOMException("Permission denied", "NotAllowedError"),
        )
      }
      return nativeGetUserMedia(constraints)
    }
  })
  await page.getByRole("button", { name: "Activer ma caméra" }).click()
  await expect(
    page.getByText("Accès caméra refusé", { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Exporter en PNG" }),
  ).toBeDisabled()
  await page.getByRole("button", { name: "Réessayer", exact: true }).click()
  await expect(
    page.getByLabel("Mettre la caméra en pause", { exact: true }),
  ).toBeEnabled()
  await expect(page.getByLabel("Flux vidéo local")).toBeVisible()
  await page.getByLabel("Mettre la caméra en pause", { exact: true }).click()
  await expect(
    page.getByRole("button", { name: "Reprendre la caméra" }),
  ).toBeVisible()
})

test("lost-hand notice stays legible below the camera across tablet and desktop sizes", async ({
  page,
}, testInfo) => {
  await page.getByRole("button", { name: "Passer le tutoriel" }).click()
  await activateCamera(page)
  const camera = page.getByRole("button", { name: "Mettre la caméra en pause" })
  for (const viewport of [
    { width: 860, height: 594 },
    { width: 782, height: 600 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport)
    await aimAt(page, { x: 0.5, y: 0.3 })
    const cameraBefore = await camera.boundingBox()
    await playHands(page, [[], [], [], []])
    const notice = page
      .getByRole("status")
      .filter({ hasText: "Main non détectée" })
    await expect(notice).toBeVisible()
    const geometry = await notice.evaluate((element) => {
      const label = element.querySelector("span")!
      const range = document.createRange()
      range.selectNodeContents(label)
      const rect = element.getBoundingClientRect()
      const camera = document
        .querySelector(".camera-preview__viewport")!
        .getBoundingClientRect()
      const icon = element.querySelector("svg")!.getBoundingClientRect()
      return {
        lines: range.getClientRects().length,
        rightOffset: Math.abs(rect.right - camera.right),
        gap: rect.top - camera.bottom,
        inside: rect.left >= 0 && rect.right <= innerWidth,
        iconWidth: icon.width,
      }
    })
    expect(
      geometry.lines,
      `${viewport.width}px: keep the short notice on one line`,
    ).toBe(1)
    expect(geometry.rightOffset).toBeLessThan(1)
    expect(geometry.gap).toBeGreaterThanOrEqual(8)
    expect(geometry.inside).toBe(true)
    expect(geometry.iconWidth).toBeGreaterThan(15)
    expect(await camera.boundingBox()).toEqual(cameraBefore)
    if (viewport.width === 860) {
      await testInfo.attach("camera-notice-tablet", {
        body: await page.screenshot(),
        contentType: "image/png",
      })
    }
  }
})

test("reduced motion keeps mode feedback visible; unavailable inference explains recovery", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.getByRole("button", { name: "Passer le tutoriel" }).click()
  await activateCamera(page)
  await aimAt(page, { x: 0.4, y: 0.4 })
  await playHands(page, hold("pinch", { x: 0.4, y: 0.4 }, 4))
  const toast = page.locator('.camera-preview__gesture-toast[data-kind="pen"]')
  await expect(toast).toHaveCSS("animation-name", "none")
  await expect(toast).toHaveCSS("opacity", "1")
  await page
    .getByRole("button", { name: "Mettre la caméra en pause", exact: true })
    .click()
  await page.route(/\/assets\/hand-tracking\.worker-[^/]+\.js$/, (route) =>
    route.abort(),
  )
  await page.getByRole("button", { name: "Reprendre la caméra" }).click()
  await expect(page.getByRole("alert")).toContainText(
    "Le suivi de la main est indisponible",
  )
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze()
  expect(accessibility.violations).toEqual([])
  await page
    .getByRole("alert")
    .getByRole("button", { name: "Mettre la caméra en pause" })
    .click()
  await expect(
    page.getByRole("button", { name: "Reprendre la caméra" }),
  ).toBeEnabled()
})
