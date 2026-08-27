import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Locator, type Page } from "@playwright/test"

test("small touch screens get a readable compatibility message", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("./")
  await expect(
    page.getByRole("heading", { name: "Un écran plus large est nécessaire" }),
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Activer ma caméra" }),
  ).toBeHidden()
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze()
  expect(results.violations).toEqual([])
})

async function tabTo(page: Page, locator: Locator) {
  // Exercise the browser's actual tab order instead of programmatic focus.
  for (let index = 0; index < 40; index++) {
    await page.keyboard.press("Tab")
    if (await locator.evaluate((element) => element === document.activeElement))
      return
  }
  throw new Error(
    `Control is unreachable by Tab: ${await locator.ariaSnapshot()}`,
  )
}

test("WCAG checks on onboarding, stroke settings, custom color and commands", async ({
  page,
}, testInfo) => {
  // Four full-page axe scans, including open popovers, share this journey.
  test.setTimeout(60_000)
  await page.goto("./")
  const scan = async (state: string) =>
    test.step(`axe: ${state}`, async () => {
      // Measure settled colors, not the translucent middle of a popover entrance.
      await page.evaluate(async () => {
        await Promise.all(
          document
            .getAnimations()
            .filter(
              (animation) =>
                animation.effect?.getTiming().iterations !== Infinity,
            )
            .map((animation) => animation.finished.catch(() => undefined)),
        )
      })
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
      await testInfo.attach(`accessibility-${state}`, {
        body: JSON.stringify(results, null, 2),
        contentType: "application/json",
      })
      expect(results.violations).toEqual([])
    })
  await scan("onboarding")
  await page.getByRole("button", { name: "Passer le tutoriel" }).click()
  await page.getByRole("button", { name: "Épaisseur 8 pixels" }).click()
  await scan("stroke")
  await page.keyboard.press("Escape")
  await page
    .getByRole("button", { name: "Couleur personnalisée", exact: true })
    .click()
  await scan("color")
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: "Ouvrir les commandes" }).click()
  await scan("commands")
})

test("keyboard opens, changes and closes stroke settings with restored focus", async ({
  page,
}) => {
  await page.goto("./")
  const skip = page.getByRole("button", { name: "Passer le tutoriel" })
  await tabTo(page, skip)
  await page.keyboard.press("Enter")
  const trigger = page.getByRole("button", { name: "Épaisseur 8 pixels" })
  await tabTo(page, trigger)
  await expect(trigger).toBeFocused()
  await page.keyboard.press("Enter")
  await tabTo(page, page.getByRole("button", { name: "Continu", exact: true }))
  // Base UI toggle groups use one Tab stop, then arrow-key navigation.
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("ArrowRight")
  const option = page.getByRole("button", { name: "Pointillé", exact: true })
  await expect(option).toBeFocused()
  await page.keyboard.press("Space")
  await expect(option).toHaveAttribute("aria-pressed", "true")
  await page.keyboard.press("Escape")
  await expect(option).toBeHidden()
  await expect(trigger).toBeFocused()
})
