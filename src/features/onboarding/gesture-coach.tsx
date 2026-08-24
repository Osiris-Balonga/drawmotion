import { Hand, Pause, ScanLine } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

const steps = [
  {
    title: "Pincez pour commencer un trait",
    description: "Rapprochez doucement le pouce et l’index.",
    Icon: ScanLine,
  },
  {
    title: "Déplacez la main pour dessiner",
    description: "Gardez le pincement et guidez le curseur sur la toile.",
    Icon: Hand,
  },
  {
    title: "Ouvrez la main pour faire une pause",
    description: "Le trait s’arrête dès que vos doigts se séparent.",
    Icon: Pause,
  },
] as const

type GestureCoachProps = {
  step: number
  onStepChange: (step: number) => void
}

export function GestureCoach({ step, onStepChange }: GestureCoachProps) {
  const current = steps[step] ?? steps[0]
  const progress = ((step + 1) / steps.length) * 100

  return (
    <section className="gesture-coach" aria-labelledby="gesture-title">
      <div className="gesture-coach__icon" aria-hidden="true">
        <current.Icon />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline">Étape {step + 1} sur 3</Badge>
          <span className="text-muted-foreground text-xs">Tutoriel simulé</span>
        </div>
        <h2 id="gesture-title" className="text-base font-semibold">
          {current.title}
        </h2>
        <p className="text-muted-foreground mt-1 max-w-[52ch] text-sm leading-relaxed">
          {current.description}
        </p>
        <Progress
          aria-label={`Progression du tutoriel : étape ${step + 1} sur 3`}
          value={progress}
          className="mt-3 h-1.5"
        />
      </div>
      <Button
        className="h-11"
        variant="secondary"
        onClick={() => onStepChange((step + 1) % steps.length)}
      >
        {step === steps.length - 1 ? "Recommencer" : "Étape suivante"}
      </Button>
    </section>
  )
}
