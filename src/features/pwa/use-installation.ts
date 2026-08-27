import { useEffect, useState } from "react"

type InstallPrompt = Event & {
  prompt: () => Promise<{ outcome: "accepted" | "dismissed" }>
}
type StorageState = "idle" | "requesting" | "granted" | "denied" | "unavailable"

export function useInstallation() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
  const [standalone, setStandalone] = useState(
    () =>
      Boolean(window.matchMedia?.("(display-mode: standalone)").matches) ||
      ("standalone" in navigator && navigator.standalone === true),
  )
  const [storage, setStorage] = useState<StorageState>(() =>
    typeof navigator.storage?.persist === "function" ? "idle" : "unavailable",
  )
  useEffect(() => {
    let mounted = true
    const offer = (event: Event) => {
      if (!("prompt" in event) || typeof event.prompt !== "function") return
      event.preventDefault()
      setPrompt(event as InstallPrompt)
    }
    const installed = () => {
      setStandalone(true)
      setPrompt(null)
    }
    const media = window.matchMedia?.("(display-mode: standalone)")
    const changed = () => setStandalone(Boolean(media?.matches))
    window.addEventListener("beforeinstallprompt", offer)
    window.addEventListener("appinstalled", installed)
    media?.addEventListener("change", changed)
    void navigator.storage
      ?.persisted?.()
      .then((persisted) => {
        if (mounted && persisted) setStorage("granted")
      })
      .catch(() => {
        /* Storage denial is non-fatal. */
      })
    return () => {
      mounted = false
      window.removeEventListener("beforeinstallprompt", offer)
      window.removeEventListener("appinstalled", installed)
      media?.removeEventListener("change", changed)
    }
  }, [])

  const install = () => {
    if (!prompt) return
    // Invoke synchronously from the click: downloading first loses user activation.
    void prompt.prompt().catch(() => undefined)
    setPrompt(null)
  }
  const persist = async () => {
    if (
      storage === "requesting" ||
      storage === "granted" ||
      storage === "unavailable"
    )
      return
    setStorage("requesting")
    try {
      setStorage((await navigator.storage.persist()) ? "granted" : "denied")
    } catch {
      setStorage("denied")
    }
  }
  return { canPrompt: prompt !== null, standalone, storage, install, persist }
}
