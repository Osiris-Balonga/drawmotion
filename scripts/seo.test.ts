import { describe, expect, it } from "vitest"
import { resolveSeo, seoTags, seoTitle } from "./seo"

describe("deployment SEO", () => {
  it("supports a stable site URL at the origin or a project subpath", () => {
    expect(
      resolveSeo({
        DEPLOY_ENV: "production",
        SITE_URL: "https://draw.example/",
      }),
    ).toEqual({ canonical: "https://draw.example/", indexable: true })
    expect(
      resolveSeo({
        SITE_URL: "https://owner.github.io/drawmotion/",
      }).canonical,
    ).toBe("https://owner.github.io/drawmotion/")
  })
  it("keeps previews and unconfigured builds out of search", () => {
    expect(resolveSeo({}).indexable).toBe(false)
    expect(
      resolveSeo({ DEPLOY_ENV: "preview", SITE_URL: "https://draw.example" })
        .indexable,
    ).toBe(false)
    expect(seoTags({}).some((tag) => tag.attrs?.rel === "canonical")).toBe(
      false,
    )
  })
  it("rejects missing production origins and malformed public URLs", () => {
    expect(() => resolveSeo({ DEPLOY_ENV: "production" })).toThrow()
    for (const SITE_URL of [
      "http://draw.example",
      "https://user:pass@draw.example",
      "https://draw.example/path",
      "https://draw.example/?draft=1",
      "https://localhost",
      "not a URL",
    ]) {
      expect(() => resolveSeo({ SITE_URL })).toThrow()
    }
  })
  it("emits canonical, social and factual structured data into initial HTML", () => {
    const tags = seoTags({ SITE_URL: "https://draw.example/" })
    expect(
      tags.find((tag) => tag.attrs?.property === "og:title")?.attrs?.content,
    ).toBe(seoTitle)
    expect(
      tags.find((tag) => tag.attrs?.property === "og:image")?.attrs?.content,
    ).toBe("https://draw.example/brand/drawmotion-symbol-b.png")
    const schema: unknown = JSON.parse(
      tags.find((tag) => tag.attrs?.type === "application/ld+json")!
        .children as string,
    )
    expect(schema).toMatchObject({
      "@type": "WebApplication",
      url: "https://draw.example/",
      inLanguage: ["en", "fr", "es", "it", "zh-Hans"],
    })
    expect(schema).not.toHaveProperty("aggregateRating")
  })
})
