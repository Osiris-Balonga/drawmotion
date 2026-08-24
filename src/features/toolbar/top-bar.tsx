import { Download, Redo2, Undo2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ToolButton } from "@/features/toolbar/tool-button"

export function TopBar() {
  return (
    <header className="border-border bg-background flex h-16 items-center border-b px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
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
        className="flex items-center gap-1"
      >
        <ToolButton
          label="Annuler — bientôt disponible"
          shortcut="Ctrl Z"
          variant="ghost"
          disabled
        >
          <Undo2 aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="Rétablir — bientôt disponible"
          shortcut="Ctrl Y"
          variant="ghost"
          disabled
        >
          <Redo2 aria-hidden="true" />
        </ToolButton>
      </nav>

      <div className="flex flex-1 items-center justify-end gap-3">
        <Badge
          variant="outline"
          className="text-muted-foreground hidden lg:flex"
        >
          Démonstration simulée
        </Badge>
        <Separator orientation="vertical" className="h-6" />
        <Button className="h-11" variant="outline" disabled>
          <Download aria-hidden="true" data-icon="inline-start" />
          Exporter bientôt
        </Button>
      </div>
    </header>
  )
}
