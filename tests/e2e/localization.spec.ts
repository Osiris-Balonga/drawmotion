import { expect, test } from "@playwright/test"

const languages = [
  {
    browser: "fr-CA",
    lang: "fr",
    title: "Le point violet est votre curseur",
    camera: "Activer ma caméra",
    skip: "Passer le tutoriel",
    expand: "Déployer la palette",
    color: "Couleur personnalisée",
    apply: "Appliquer #12AB34",
    wheel: "Teinte et saturation",
    commands: "Commandes gestuelles",
    open: "Ouvrir les commandes",
    stroke: "Trait",
    dashed: "Tirets",
    denied: "Accès caméra refusé",
  },
  {
    browser: "en-GB",
    lang: "en",
    title: "The purple dot is your pointer",
    camera: "Enable camera",
    skip: "Skip tutorial",
    expand: "Expand palette",
    color: "Custom color",
    apply: "Apply #12AB34",
    wheel: "Hue and saturation",
    commands: "Gesture commands",
    open: "Open commands",
    stroke: "Stroke",
    dashed: "Dashed",
    denied: "Camera access denied",
  },
  {
    browser: "es-MX",
    lang: "es",
    title: "El punto violeta es tu cursor",
    camera: "Activar cámara",
    skip: "Saltar tutorial",
    expand: "Desplegar paleta",
    color: "Color personalizado",
    apply: "Aplicar #12AB34",
    wheel: "Tono y saturación",
    commands: "Comandos gestuales",
    open: "Abrir comandos",
    stroke: "Trazo",
    dashed: "Guiones",
    denied: "Acceso a la cámara denegado",
  },
  {
    browser: "it-IT",
    lang: "it",
    title: "Il punto viola è il tuo cursore",
    camera: "Attiva webcam",
    skip: "Salta tutorial",
    expand: "Espandi tavolozza",
    color: "Colore personalizzato",
    apply: "Applica #12AB34",
    wheel: "Tonalità e saturazione",
    commands: "Comandi gestuali",
    open: "Apri comandi",
    stroke: "Tratto",
    dashed: "Tratteggiato",
    denied: "Accesso alla webcam negato",
  },
  {
    browser: "zh-CN",
    lang: "zh-Hans",
    title: "紫色圆点就是你的指针",
    camera: "启用摄像头",
    skip: "跳过教程",
    expand: "展开工具栏",
    color: "自定义颜色",
    apply: "应用 #12AB34",
    wheel: "色相和饱和度",
    commands: "手势操作",
    open: "打开操作面板",
    stroke: "笔画",
    dashed: "虚线",
    denied: "摄像头访问被拒绝",
  },
] as const

for (const language of languages) {
  test.describe(language.browser, () => {
    test.use({
      locale: language.browser,
      viewport: { width: 782, height: 600 },
    })

    test("localizes first visit, settings and camera errors from the browser language", async ({
      page,
    }, testInfo) => {
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      // Deterministic denial; never request the user's physical camera.
      await page.addInitScript(() => {
        navigator.mediaDevices.getUserMedia = () =>
          Promise.reject(new DOMException("Denied for test", "NotAllowedError"))
      })
      await page.goto("/")
      await expect(page.locator("html")).toHaveAttribute("lang", language.lang)
      await expect(
        page.getByRole("heading", { name: language.title }),
      ).toBeVisible()
      await expect(
        page.getByRole("button", { name: language.camera, exact: true }),
      ).toBeVisible()
      await page.screenshot({ path: testInfo.outputPath("tutorial.png") })
      await page
        .getByRole("button", { name: language.skip, exact: true })
        .click()
      await page
        .getByRole("button", { name: language.expand, exact: true })
        .click()
      await page
        .getByRole("button", { name: language.color, exact: true })
        .click()
      await expect(
        page.getByRole("slider", { name: language.wheel }),
      ).toBeVisible()
      await page.getByLabel("HEX", { exact: true }).fill("#12AB34")
      await page
        .getByRole("button", { name: language.apply, exact: true })
        .click()
      await expect(
        page.getByRole("button", { name: language.color, exact: true }),
      ).toHaveAttribute("aria-pressed", "true")
      await page
        .getByRole("button", { name: language.open, exact: true })
        .click()
      const palette = page.getByRole("region", { name: language.commands })
      await palette
        .getByRole("button", { name: language.stroke, exact: true })
        .click()
      await page.screenshot({ path: testInfo.outputPath("stroke-options.png") })
      await palette
        .getByRole("button", { name: language.dashed, exact: true })
        .click()
      await expect(palette).toBeHidden()
      await page
        .getByRole("button", { name: language.camera, exact: true })
        .click()
      await expect(
        page.getByText(language.denied, { exact: true }),
      ).toBeVisible()
      const errorPanel = await page
        .locator(".camera-preview__error")
        .boundingBox()
      const camera = await page
        .locator(".camera-preview__viewport")
        .boundingBox()
      expect(errorPanel).not.toBeNull()
      expect(camera).not.toBeNull()
      expect(errorPanel!.x).toBeGreaterThanOrEqual(0)
      expect(errorPanel!.x + errorPanel!.width).toBeLessThanOrEqual(782)
      expect(
        Math.abs(errorPanel!.x + errorPanel!.width - camera!.x - camera!.width),
      ).toBeLessThanOrEqual(1)
      await page.screenshot({
        path: testInfo.outputPath("settings-and-error.png"),
      })
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true)
      expect(errors).toEqual([])
    })
  })
}
