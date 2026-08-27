import { expect, test, type Locator, type Page } from "@playwright/test"

async function enterWorkspace(page: Page) {
  await page.goto("/")
  await page.getByRole("button", { name: "Passer le tutoriel" }).click()
}

async function openCommands(page: Page, section: string) {
  await page.getByRole("button", { name: "Ouvrir les commandes" }).click()
  const palette = page.getByRole("region", { name: "Commandes gestuelles" })
  await palette.getByRole("button", { name: section, exact: true }).click()
  return palette
}

async function expectInsideViewport(locator: Locator) {
  await expect(locator).toBeVisible()
  await expect
    .poll(async () =>
      locator.evaluate((element) => {
        const rect = element.getBoundingClientRect()
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          rect.left >= 0 &&
          rect.top >= 0 &&
          rect.right <= window.innerWidth &&
          rect.bottom <= window.innerHeight
        )
      }),
    )
    .toBe(true)
}

test("first visit, loaded illustration, saved skip and tutorial replay", async ({
  page,
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/")

  await expect(
    page.getByRole("heading", { name: "DrawMotion", exact: true }),
  ).toBeVisible()
  const title = page.getByRole("heading", {
    name: "Le point violet est votre curseur",
  })
  await expect(title).toBeVisible()
  const illustration = page.locator("figure img")
  await expect(illustration).toBeVisible()
  await expect
    .poll(() =>
      illustration.evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0)

  const camera = page.getByRole("button", { name: "Activer ma caméra" })
  await expectInsideViewport(camera)
  const initialBounds = await camera.boundingBox()
  await expect(camera).toHaveCSS("border-radius", "50%")
  await page.getByRole("button", { name: "Passer le tutoriel" }).click()
  await expect(title).toBeHidden()
  await expect.poll(() => camera.boundingBox()).toEqual(initialBounds)

  await page.reload()
  await expect(title).toBeHidden()
  await page.getByRole("button", { name: "Revoir le tutoriel" }).click()
  await expect(title).toBeVisible()
  expect(errors).toEqual([])
})

test("dock and command palette share stroke, color and eraser settings", async ({
  page,
}) => {
  await enterWorkspace(page)
  const dock = page.getByRole("complementary", { name: "Outils de dessin" })

  await dock.getByRole("button", { name: "Épaisseur 8 pixels" }).click()
  // Real layout is needed for Base UI's range input to become accessible.
  const slider = page
    .getByRole("group", { name: "Épaisseur du trait" })
    .getByRole("slider")
  await slider.focus()
  await page.keyboard.press("ArrowRight")
  await expect(slider).toHaveAttribute("aria-valuenow", "10")
  await page.getByRole("button", { name: "12 px", exact: true }).click()
  await page.keyboard.press("Escape")

  let palette = await openCommands(page, "Trait")
  await expect(
    palette.getByRole("button", { name: "12 pixels", exact: true }),
  ).toHaveAttribute("aria-pressed", "true")
  await palette.getByRole("button", { name: "Pointillé", exact: true }).click()
  await dock.getByRole("button", { name: "Épaisseur 12 pixels" }).click()
  await expect(
    page.getByRole("button", { name: "Pointillé", exact: true }),
  ).toHaveAttribute("aria-pressed", "true")
  await page.keyboard.press("Escape")

  palette = await openCommands(page, "Couleur")
  await palette.getByRole("button", { name: "Vert", exact: true }).click()
  await expect(
    dock.getByRole("button", { name: "Vert", exact: true }),
  ).toHaveAttribute("aria-pressed", "true")

  await dock.getByRole("button", { name: "Gomme", exact: true }).click()
  await dock
    .getByRole("button", { name: "Taille de la gomme 40 pixels" })
    .click()
  await page.getByRole("button", { name: "64 px", exact: true }).click()
  await page.keyboard.press("Escape")
  palette = await openCommands(page, "Gomme")
  await expect(
    palette.getByRole("button", { name: "64 pixels", exact: true }),
  ).toHaveAttribute("aria-pressed", "true")
  await palette.getByRole("button", { name: "96 pixels", exact: true }).click()
  await expect(
    dock.getByRole("button", { name: "Taille de la gomme 96 pixels" }),
  ).toBeVisible()
})

for (const viewport of [
  { width: 782, height: 600 },
  { width: 768, height: 1024 },
  // Layout viewport equivalents of 1440×900 and 1280×800 at 200% browser zoom.
  // Native browser zoom and real touch devices remain manual QA checks.
  { width: 720, height: 450 },
  { width: 640, height: 400 },
]) {
  test(`palette and camera stay usable at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport)
    await enterWorkspace(page)
    const camera = page.getByRole("button", { name: "Activer ma caméra" })
    await expectInsideViewport(camera)
    await expectInsideViewport(
      page.getByRole("button", { name: "Exporter en PNG" }),
    )
    await page.getByRole("button", { name: "Déployer la palette" }).click()
    const color = page.getByRole("button", {
      name: "Couleur personnalisée",
      exact: true,
    })
    await expectInsideViewport(color)
    await color.click()
    await expectInsideViewport(
      page.getByRole("slider", { name: "Teinte et saturation" }),
    )
    await page
      .getByRole("textbox", { name: "HEX", exact: true })
      .fill("#1267AB")
    await page.getByRole("button", { name: "Appliquer #1267AB" }).click()
    await expect(color).toHaveAttribute("aria-pressed", "true")

    await page.getByRole("button", { name: "Réduire la palette" }).click()
    await expect(color).toBeHidden()
    await page.getByRole("button", { name: "Déployer la palette" }).click()
    await color.click()
    await expect(
      page.getByRole("textbox", { name: "HEX", exact: true }),
    ).toHaveValue("#1267AB")
    await expectInsideViewport(page.getByRole("dialog"))
    await expectInsideViewport(camera)
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
    if (viewport.width === 640) {
      await page.getByRole("dialog").evaluate(async (element) => {
        await Promise.all(
          element
            .getAnimations({ subtree: true })
            .map((animation) => animation.finished.catch(() => undefined)),
        )
      })
      await page.screenshot({
        path: testInfo.outputPath("compact-controls.png"),
      })
    }
  })
}
