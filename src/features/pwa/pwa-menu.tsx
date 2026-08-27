import { ChevronDown, CloudCheck } from "lucide-react"
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

const statusMessages = {
  unavailable: "pwa.unavailable",
  idle: "pwa.idle",
  preparing: "pwa.preparing",
  "prepared-reopen": "pwa.reopen",
  verifying: "pwa.verifying",
  ready: "pwa.ready",
  failed: "pwa.failed",
} as const

export function PwaMenu() {
  const { state, client } = usePwa()
  const busy = state.offline === "preparing" || state.offline === "verifying"
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={t("pwa.menu")} />
        }
      >
        {state.offline === "ready" ? (
          <CloudCheck aria-hidden="true" />
        ) : (
          <ChevronDown aria-hidden="true" />
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={12}
        className="w-80 max-w-[calc(100vw-2rem)] gap-4 p-4"
      >
        <PopoverTitle>{t("pwa.title")}</PopoverTitle>
        <PopoverDescription>{t("pwa.description")}</PopoverDescription>
        <p
          role="status"
          aria-live="polite"
          data-offline-state={state.offline}
          className="text-sm leading-relaxed"
        >
          {t(statusMessages[state.offline])}
        </p>
        {(state.offline === "idle" || state.offline === "failed" || busy) && (
          <Button
            disabled={busy}
            onClick={() => {
              void client.prepare()
            }}
            className="h-auto min-h-10 whitespace-normal"
          >
            {t("pwa.prepare")}
          </Button>
        )}
        {state.offline === "ready" && (
          <Button
            variant="secondary"
            onClick={() => {
              void client.verify()
            }}
          >
            {t("pwa.retry")}
          </Button>
        )}
        <p className="text-muted-foreground text-xs leading-relaxed">
          {t("pwa.limits")}
        </p>
      </PopoverContent>
    </Popover>
  )
}
