import { t } from "@/i18n"

import { useState } from "react"

import { Download, Redo2, Trash2, Undo2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { DrawMotionMark } from "@/features/toolbar/brand-mark"
import { ToolButton } from "@/features/toolbar/tool-button"

type TopBarProps = {
  canUndo: boolean
  canRedo: boolean
  canClear: boolean
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
  onExport: () => void
}

export function TopBar({
  canUndo,
  canRedo,
  canClear,
  onUndo,
  onRedo,
  onClear,
  onExport,
}: TopBarProps) {
  const [clearOpen, setClearOpen] = useState(false)

  return (
    <header className="workspace-topbar">
      <div className="workspace-topbar__island workspace-topbar__brand">
        <DrawMotionMark aria-hidden="true" className="drawmotion-mark" />
        <div className="min-w-0">
          <h1 className="truncate text-base leading-tight font-semibold">
            DrawMotion
          </h1>
          <p className="text-muted-foreground truncate text-xs">
            {t("app.tagline")}
          </p>
        </div>
      </div>

      <nav
        aria-label={t("history.label")}
        className="workspace-topbar__island workspace-topbar__history"
      >
        <ToolButton
          label={t("history.undo")}
          shortcut="Ctrl Z"
          tooltipSide="bottom"
          variant="ghost"
          disabled={!canUndo}
          data-onboarding-target="undo"
          onClick={onUndo}
        >
          <Undo2 aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label={t("history.redo")}
          shortcut="Ctrl Y"
          tooltipSide="bottom"
          variant="ghost"
          disabled={!canRedo}
          onClick={onRedo}
        >
          <Redo2 aria-hidden="true" />
        </ToolButton>
        <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
          <AlertDialogTrigger
            render={
              <ToolButton
                label={t("history.clear")}
                tooltipSide="bottom"
                variant="ghost"
                disabled={!canClear}
              >
                <Trash2 aria-hidden="true" />
              </ToolButton>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("history.clearTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("history.clearDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("history.keep")}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  onClear()
                  setClearOpen(false)
                }}
              >
                {t("history.clear")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </nav>

      <Button
        aria-label={t("export.action")}
        className="workspace-topbar__export"
        variant="secondary"
        disabled={!canClear}
        onClick={onExport}
      >
        <Download aria-hidden="true" data-icon="inline-start" />
        <span className="workspace-topbar__export-label">
          {t("export.action")}
        </span>
      </Button>
    </header>
  )
}
