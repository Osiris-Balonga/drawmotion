import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { App } from "@/app/App"
import { AppProviders } from "@/app/providers"
import { applyDocumentLocale } from "@/i18n"
import "@/styles/globals.css"

const root = document.getElementById("root")

if (!root) {
  throw new Error("DrawMotion's root element is missing.")
}

applyDocumentLocale()

createRoot(root).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
