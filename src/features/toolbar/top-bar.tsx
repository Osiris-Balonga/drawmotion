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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
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
        <span
          aria-hidden="true"
          className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-lg text-sm font-semibold"
        >
          D
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-base leading-tight font-semibold">
            DrawMotion
          </h1>
          <p className="text-muted-foreground truncate text-xs">
            Toile gestuelle
          </p>
        </div>
      </div>

      <nav
        aria-label="Historique du dessin"
        className="workspace-topbar__island workspace-topbar__history"
      >
        <ToolButton
          label="Annuler"
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
          label="Rétablir"
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
                label="Effacer la toile"
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
              <AlertDialogTitle>Effacer tout le dessin ?</AlertDialogTitle>
              <AlertDialogDescription>
                La toile sera vidée. Vous pourrez encore annuler cette action.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-gesture-control="">
                Conserver le dessin
              </AlertDialogCancel>
              <AlertDialogAction
                data-gesture-control=""
                variant="destructive"
                onClick={() => {
                  onClear()
                  setClearOpen(false)
                }}
              >
                Effacer la toile
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </nav>

      <div className="workspace-topbar__island workspace-topbar__actions">
        <Badge
          variant="outline"
          className="text-muted-foreground hidden lg:flex"
        >
          Démonstration simulée
        </Badge>
        <Separator orientation="vertical" className="h-6" />
        <Button
          className="h-11"
          variant="outline"
          data-gesture-control=""
          disabled={!canClear}
          onClick={onExport}
        >
          <Download aria-hidden="true" data-icon="inline-start" />
          Exporter en PNG
        </Button>
      </div>
    </header>
  )
}
