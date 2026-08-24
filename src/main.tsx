import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { App } from "@/app/App"
import "@/styles/globals.css"

const root = document.getElementById("root")

if (!root) {
  throw new Error("Le conteneur racine de DrawMotion est introuvable.")
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
