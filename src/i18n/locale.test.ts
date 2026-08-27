import { describe, expect, it } from "vitest"

import { catalogs, createTranslator } from "@/i18n"
import { en, type MessageKey } from "@/i18n/en"
import { resolveLocale } from "@/i18n/locale"

describe("browser language selection", () => {
  it.each([
    [["fr-CA", "en-US"], "fr"],
    [["es-MX"], "es"],
    [["it-CH"], "it"],
    [["en-GB"], "en"],
    [["zh-CN"], "zh-Hans"],
    [["zh-Hant-TW"], "zh-Hans"],
    [["pt-BR", "it-IT", "en"], "it"],
    [["not_a_tag", "fr"], "fr"],
    [["ja-JP"], "en"],
    [[], "en"],
  ] as const)("resolves %j to %s", (preferences, expected) => {
    expect(resolveLocale(preferences)).toBe(expected)
  })

  it("keeps every catalog complete with matching interpolation parameters", () => {
    const keys = Object.keys(en) as MessageKey[]
    const parameters = (text: string) =>
      [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()
    for (const messages of Object.values(catalogs)) {
      expect(Object.keys(messages).sort()).toEqual([...keys].sort())
      for (const key of keys) {
        expect(messages[key].trim(), key).not.toBe("")
        expect(parameters(messages[key]), key).toEqual(parameters(en[key]))
      }
    }
  })

  it("interpolates complete sentences and formats numeric values by locale", () => {
    expect(
      createTranslator("es")("tutorial.progress", { current: 2, total: 5 }),
    ).toBe("Progreso del tutorial: misión 2 de 5")
    expect(createTranslator("it")("tools.pixels", { count: 12.5 })).toBe(
      "12,5 pixel",
    )
    expect(createTranslator("zh-Hans")("camera.device", { number: 2 })).toBe(
      "摄像头 2",
    )
  })
})
