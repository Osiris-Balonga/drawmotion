import { Button } from "@/components/ui/button"
import { t } from "@/i18n"
import type { UpdateState } from "@/infrastructure/pwa/pwa-client"

const messages = {
  none: "pwa.updatePolicy",
  checking: "pwa.updateChecking",
  downloading: "pwa.updateDownloading",
  "waiting-for-close": "pwa.updateWaiting",
  failed: "pwa.updateFailed",
} as const

export function UpdateStatus({
  state,
  onCheck,
}: {
  state: UpdateState
  onCheck: () => void
}) {
  return (
    <div className="border-border flex flex-col gap-2 border-t pt-3">
      <p
        role="status"
        data-update-state={state}
        className="text-muted-foreground text-xs leading-relaxed"
      >
        {t(messages[state])}
      </p>
      <Button
        variant="secondary"
        disabled={
          state === "checking" ||
          state === "downloading" ||
          state === "waiting-for-close"
        }
        onClick={onCheck}
      >
        {t("pwa.checkUpdate")}
      </Button>
    </div>
  )
}
