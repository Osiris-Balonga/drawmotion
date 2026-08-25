import type { ComponentProps, ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type ToolButtonProps = ComponentProps<typeof Button> & {
  label: string
  shortcut?: string
  children: ReactNode
}

export function ToolButton({
  label,
  shortcut,
  children,
  className,
  ...props
}: ToolButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            className={cn("size-11", className)}
            data-gesture-control=""
            size="icon-lg"
            {...props}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="right">
        <span>{label}</span>
        {shortcut ? (
          <kbd className="bg-background/15 rounded-sm px-1.5 py-0.5 font-mono text-xs">
            {shortcut}
          </kbd>
        ) : null}
      </TooltipContent>
    </Tooltip>
  )
}
