import { mkdtemp, mkdir } from "node:fs/promises"
import path from "node:path"
import { chromium, expect, test, type Page } from "@playwright/test"
import { createPwaServer } from "./fixtures/pwa-server"

async function openMenu(page: Page) {
  await page.getByRole("button", { name: "Installation et hors ligne" }).click()
}

test("explicit preparation survives a full browser restart and first offline camera inference", async () => {
  test.setTimeout(120_000)
  await mkdir(".artifacts/pwa", { recursive: true })
  const profile = await mkdtemp(path.resolve(".artifacts/pwa/profile-"))
  const server = await createPwaServer()
  const options = {
    locale: "fr-FR",
    serviceWorkers: "allow" as const,
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      "--enable-unsafe-swiftshader",
    ],
  }
  let context = await chromium.launchPersistentContext(profile, options)
  let serverClosed = false
  try {
    let page = context.pages()[0]
    await page.goto(server.url)
    expect(
      await page.evaluate(
        async () => (await navigator.serviceWorker.getRegistrations()).length,
      ),
    ).toBe(0)
    await openMenu(page)
    await page.getByRole("button", { name: /Préparer hors ligne/ }).click()
    await expect(
      page.locator('[data-offline-state="prepared-reopen"]'),
    ).toBeVisible({ timeout: 60_000 })
    expect(server.requests.filter((url) => url.endsWith(".wasm"))).toHaveLength(
      3,
    )
    await context.close()
    await server.close()
    serverClosed = true
    context = await chromium.launchPersistentContext(profile, options)
    await context.setOffline(true)
    page = context.pages()[0]!
    await page.goto(server.url)
    await openMenu(page)
    await expect(page.locator('[data-offline-state="ready"]')).toBeVisible({
      timeout: 10_000,
    })
    await page.keyboard.press("Escape")
    await page.getByRole("button", { name: "Passer le tutoriel" }).click()
    await page.getByRole("button", { name: "Activer ma caméra" }).click()
    await expect(
      page.getByText("Main non détectée", { exact: true }).last(),
    ).toBeAttached({ timeout: 40_000 })
    await page
      .getByRole("button", { name: "Mettre la caméra en pause" })
      .click()
    expect(
      await page.evaluate(() => document.fonts.check('16px "Geist Variable"')),
    ).toBe(true)
    const resources = await page.evaluate(async () => {
      const responses = await Promise.all(
        [
          "onboarding/gesture-menu.png",
          "onboarding/gesture-pinch.png",
          "licenses/service-worker.md",
        ].map((file) => fetch(new URL(file, location.href))),
      )
      return responses.map((response) => response.ok)
    })
    expect(resources).toEqual([true, true, true])
  } finally {
    await context.close()
    if (!serverClosed) await server.close()
  }
})

test("a failed or mixed deployment never reports ready and retry preserves drafts", async ({
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
    await page.goto(server.url)
    await page.evaluate(() => localStorage.setItem("pwa-test-sentinel", "keep"))
    server.fail("vision/hand_landmarker.task", "integrity")
    await openMenu(page)
    await page.getByRole("button", { name: /Préparer hors ligne/ }).click()
    await expect(page.locator('[data-offline-state="failed"]')).toBeVisible({
      timeout: 60_000,
    })
    expect(
      await page.evaluate(() => localStorage.getItem("pwa-test-sentinel")),
    ).toBe("keep")
    server.fail()
    await page.getByRole("button", { name: /Préparer hors ligne/ }).click()
    await expect(
      page.locator('[data-offline-state="prepared-reopen"]'),
    ).toBeVisible({ timeout: 60_000 })
    await page.reload()
    await openMenu(page)
    await expect(page.locator('[data-offline-state="ready"]')).toBeVisible()
    expect(
      (
        await page.request.get(new URL("not-a-route", server.url).href)
      ).status(),
    ).toBe(404)
    await page.evaluate(async () => {
      await (
        await caches.open("unrelated-project")
      ).put("sentinel", new Response("keep"))
      for (const name of await caches.keys()) {
        if (!name.startsWith("drawmotion-")) continue
        const cache = await caches.open(name)
        for (const request of await cache.keys())
          if (request.url.includes("hand_landmarker.task"))
            await cache.delete(request)
      }
    })
    await page.getByRole("button", { name: "Vérifier à nouveau" }).click()
    await expect(page.locator('[data-offline-state="failed"]')).toBeVisible()
    expect(
      await page.evaluate(async () =>
        (await caches.open("unrelated-project"))
          .match("sentinel")
          .then((response) => response?.text()),
      ),
    ).toBe("keep")
  } finally {
    await context.close()
    await server.close()
  }
})
