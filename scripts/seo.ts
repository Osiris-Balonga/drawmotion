import type { HtmlTagDescriptor, Plugin } from "vite"

export const seoTitle = "DrawMotion — Draw in the air with your webcam"
export const seoDescription =
  "Turn hand gestures into 2D drawings in your browser. Pinch to draw, make a fist to erase, and export PNGs. Camera processing stays on your device."

type SeoEnvironment = {
  SITE_URL?: string
  DEPLOY_ENV?: string
}

export function resolveSeo(environment: SeoEnvironment) {
  const configured = environment.SITE_URL
  let canonical: string | undefined
  if (configured) {
    const url = new URL(configured)
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.hostname === "localhost" ||
      !/^\/(?:[\w-]+\/)*$/.test(url.pathname)
    ) {
      throw new Error(
        "SITE_URL must be an HTTPS site URL with a trailing slash and no credentials, query, or fragment",
      )
    }
    canonical = url.href
  }
  if (environment.DEPLOY_ENV === "production" && !canonical) {
    throw new Error("Production SEO requires SITE_URL")
  }
  const indexable =
    Boolean(canonical) &&
    (!environment.DEPLOY_ENV || environment.DEPLOY_ENV === "production")
  return { canonical, indexable }
}

export function seoTags(environment: SeoEnvironment): HtmlTagDescriptor[] {
  const { canonical, indexable } = resolveSeo(environment)
  const meta = (name: string, content: string): HtmlTagDescriptor => ({
    tag: "meta",
    attrs: { [name.startsWith("og:") ? "property" : "name"]: name, content },
  })
  const tags: HtmlTagDescriptor[] = [
    meta(
      "robots",
      indexable ? "index, follow, max-image-preview:large" : "noindex, follow",
    ),
    meta("og:type", "website"),
    meta("og:site_name", "DrawMotion"),
    meta("og:title", seoTitle),
    meta("og:description", seoDescription),
    meta("og:locale", "en_US"),
    meta("twitter:card", "summary"),
    meta("twitter:title", seoTitle),
    meta("twitter:description", seoDescription),
  ]
  if (canonical) {
    const image = new URL("brand/drawmotion-symbol-b.png", canonical).href
    tags.push(
      { tag: "link", attrs: { rel: "canonical", href: canonical } },
      meta("og:url", canonical),
      meta("og:image", image),
      meta("og:image:type", "image/png"),
      meta(
        "og:image:alt",
        "DrawMotion logo: a pointer leaving a purple stroke",
      ),
      meta("twitter:image", image),
      meta(
        "twitter:image:alt",
        "DrawMotion logo: a pointer leaving a purple stroke",
      ),
      {
        tag: "script",
        attrs: { type: "application/ld+json" },
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "DrawMotion",
          url: canonical,
          description: seoDescription,
          image,
          applicationCategory: "DesignApplication",
          operatingSystem: "Web browser",
          browserRequirements:
            "JavaScript, WebAssembly, and a webcam. Desktop Chrome or Edge recommended.",
          inLanguage: ["en", "fr", "es", "it", "zh-Hans"],
          isAccessibleForFree: true,
        }).replace(/</g, "\\u003c"),
      },
    )
  }
  return tags
}

export function seoPlugin(environment: SeoEnvironment): Plugin {
  const { canonical, indexable } = resolveSeo(environment)
  return {
    name: "drawmotion-seo",
    transformIndexHtml: () => seoTags(environment),
    generateBundle() {
      // robots.txt only applies at an origin's root, not under /repository/.
      // Project sites submit their sitemap directly in Search Console instead.
      if (!canonical || new URL(canonical).pathname === "/") {
        this.emitFile({
          type: "asset",
          fileName: "robots.txt",
          source: `User-agent: *\nAllow: /\n${indexable ? `Sitemap: ${canonical}sitemap.xml\n` : ""}`,
        })
      }
      if (indexable && canonical) {
        this.emitFile({
          type: "asset",
          fileName: "sitemap.xml",
          source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${canonical}</loc></url></urlset>\n`,
        })
      }
    },
  }
}
