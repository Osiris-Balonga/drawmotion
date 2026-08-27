import { en, type MessageKey, type Messages } from "./en"
import { es } from "./es"
import { fr } from "./fr"
import { it } from "./it"
import { zh } from "./zh"
import { resolveLocale, type Locale } from "./locale"

export const catalogs: Record<Locale, Messages> = {
  en,
  es,
  fr,
  it,
  "zh-Hans": zh,
}

type ParametersIn<Text extends string> =
  Text extends `${string}{${infer Name}}${infer Rest}`
    ? Name | ParametersIn<Rest>
    : never
type TranslationArgs<Key extends MessageKey> = [
  ParametersIn<(typeof en)[Key]>,
] extends [never]
  ? []
  : [Record<ParametersIn<(typeof en)[Key]>, string | number>]

export function createTranslator(selectedLocale: Locale) {
  const numbers = new Intl.NumberFormat(selectedLocale)
  return function translate<Key extends MessageKey>(
    key: Key,
    ...args: TranslationArgs<Key>
  ): string {
    const values: Record<string, string | number> = args[0] ?? {}
    return catalogs[selectedLocale][key].replace(
      /\{(\w+)\}/g,
      (_, name: string) => {
        const value = values[name]
        if (value === undefined)
          throw new Error(`Missing translation parameter: ${key}.${name}`)
        return typeof value === "number" ? numbers.format(value) : value
      },
    )
  }
}

// A page-load decision: no storage, geolocation, or camera lifecycle changes.
export const locale = resolveLocale(
  typeof navigator === "undefined"
    ? []
    : navigator.languages?.length
      ? navigator.languages
      : [navigator.language],
)
export const t = createTranslator(locale)

export function applyDocumentLocale() {
  document.documentElement.lang = locale
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute("content", t("app.description"))
}
