export const supportedLocales = ["en", "fr", "es", "it", "zh-Hans"] as const
export type Locale = (typeof supportedLocales)[number]

/** Select the first supported browser preference, including regional variants. */
export function resolveLocale(preferences: readonly string[]): Locale {
  for (const preference of preferences) {
    try {
      const language = new Intl.Locale(preference).language
      if (language === "zh") return "zh-Hans"
      if (
        language === "en" ||
        language === "fr" ||
        language === "es" ||
        language === "it"
      ) {
        return language
      }
    } catch {
      // Ignore malformed preferences and continue to the next language.
    }
  }
  return "en"
}
