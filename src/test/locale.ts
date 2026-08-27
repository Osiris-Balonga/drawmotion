// Pin localized UI assertions independently of the developer's OS language.
Object.defineProperty(navigator, "languages", {
  configurable: true,
  value: ["fr-FR"],
})
Object.defineProperty(navigator, "language", {
  configurable: true,
  value: "fr-FR",
})
