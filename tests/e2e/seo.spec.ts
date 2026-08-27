import { expect, test } from "@playwright/test"

test.describe("search and link previews", () => {
  test.use({ javaScriptEnabled: false })

  test("serves metadata and a usable explanation without executing the app", async ({
    page,
    request,
  }) => {
    const response = await page.goto("./")
    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle(
      "DrawMotion — Draw in the air with your webcam",
    )
    await expect(
      page.getByRole("heading", {
        name: "DrawMotion — Draw in the air",
        exact: true,
      }),
    ).toBeVisible()
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      await page.title(),
    )
    await expect(
      page.locator('meta[property="og:description"]'),
    ).toHaveAttribute(
      "content",
      (await page.locator('meta[name="description"]').getAttribute("content"))!,
    )
    const atRoot = new URL(page.url()).pathname === "/"
    const robots = await request.get("./robots.txt")
    expect(robots.status()).toBe(atRoot ? 200 : 404)
    if (atRoot) expect(await robots.text()).toContain("User-agent: *")
    const canonical = page.locator('link[rel="canonical"]')
    if (await canonical.count()) {
      const url = (await canonical.getAttribute("href"))!
      expect(url).toMatch(/^https:\/\//)
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
        "content",
        url,
      )
      const data: unknown = JSON.parse(
        (await page
          .locator('script[type="application/ld+json"]')
          .textContent())!,
      )
      expect(data).toMatchObject({ url, "@type": "WebApplication" })
      const imagePath = new URL(
        (await page
          .locator('meta[property="og:image"]')
          .getAttribute("content"))!,
      ).pathname
      const image = await request.get(imagePath)
      expect(image.status()).toBe(200)
      expect(image.headers()["content-type"]).toContain("image/png")
      if (
        !(
          await page.locator('meta[name="robots"]').getAttribute("content")
        )?.includes("noindex")
      ) {
        const sitemap = await request.get("./sitemap.xml")
        expect(sitemap.status()).toBe(200)
        expect(await sitemap.text()).toContain(`<loc>${url}</loc>`)
        if (atRoot)
          expect(await robots.text()).toContain(`Sitemap: ${url}sitemap.xml`)
      }
    } else {
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        "noindex, follow",
      )
    }
    expect((await request.get("./this-page-does-not-exist")).status()).toBe(404)
  })
})
