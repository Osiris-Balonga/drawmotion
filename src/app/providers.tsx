import type { PropsWithChildren } from "react"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <TooltipProvider delay={300} closeDelay={100} timeout={400}>
      {children}
      <Toaster position="bottom-right" />
    </TooltipProvider>
  )
}
