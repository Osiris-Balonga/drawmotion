import { ChevronDown, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { t } from "@/i18n"
import { usePwa } from "./use-pwa"
import { useInstallation } from "./use-installation"
import { UpdateStatus } from "./update-status"

const statusMessages = {
  unavailable: "pwa.unavailable",
  idle: "pwa.preparing",
  preparing: "pwa.preparing",
  "prepared-reopen": "pwa.reopen",
  verifying: "pwa.preparing",
  ready: "pwa.ready",
  failed: "pwa.failed",
} as const

export function PwaMenu() {
  const { state, client, connection } = usePwa()
  const installation = useInstallation()
  const disconnected = connection === "offline"
  const transition =
    "absolute inset-0 m-auto size-4 transition-[opacity,scale,filter] duration-200 ease-out motion-reduce:transition-none"
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={t("pwa.menu")} />
        }
      >
        <span className="relative size-4" aria-hidden="true">
          <ChevronDown
            className={`${transition} ${disconnected ? "scale-25 opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-none"}`}
          />
          <WifiOff
            className={`${transition} ${disconnected ? "scale-100 opacity-100 blur-none" : "scale-25 opacity-0 blur-[4px]"}`}
          />
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={12}
        className="w-72 max-w-[calc(100vw-2rem)] gap-3 p-4"
      >
        <PopoverTitle>{t("pwa.title")}</PopoverTitle>
        <PopoverDescription>{t("pwa.local")}</PopoverDescription>
        <div
          role="status"
          aria-live="polite"
          className="text-sm leading-relaxed"
          data-offline-state={state.offline}
          data-connection-state={connection}
        >
          {disconnected && (
            <p className="mb-1 flex items-center gap-2 font-medium">
              <WifiOff className="size-4" aria-hidden="true" />
              {t("pwa.disconnected")}
            </p>
          )}
          <p>{t(statusMessages[state.offline])}</p>
        </div>
        {installation.standalone ? (
          <p className="text-muted-foreground text-xs">{t("pwa.installed")}</p>
        ) : installation.canPrompt ? (
          <Button variant="secondary" onClick={installation.install}>
            {t("pwa.install")}
          </Button>
        ) : (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {t("pwa.installHelp")}
          </p>
        )}
        <details className="border-border border-t pt-2">
          <summary className="text-muted-foreground cursor-pointer py-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-2">
            {t("pwa.details")}
          </summary>
          <div className="flex flex-col gap-3 pt-2 text-xs leading-relaxed">
            <p>{t("pwa.description")}</p>
            {state.buildId && (
              <UpdateStatus
                state={state.update}
                onCheck={() => {
                  void client.checkForUpdate(true)
                }}
              />
            )}
            {installation.storage !== "unavailable" && (
              <>
                <Button
                  variant="ghost"
                  disabled={
                    installation.storage === "granted" ||
                    installation.storage === "requesting"
                  }
                  onClick={() => {
                    void installation.persist()
                  }}
                  className="h-auto min-h-10 whitespace-normal"
                >
                  {t(
                    installation.storage === "granted"
                      ? "pwa.storageGranted"
                      : "pwa.persist",
                  )}
                </Button>
                {installation.storage === "denied" && (
                  <p role="status">{t("pwa.storageDenied")}</p>
                )}
              </>
            )}
            <p className="text-muted-foreground">{t("pwa.limits")}</p>
          </div>
        </details>
      </PopoverContent>
    </Popover>
  )
}
