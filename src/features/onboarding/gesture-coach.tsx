import { Hand, Pause, ScanLine } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

const steps = [
  {
    title: "Placez votre main dans le cadre",
    description: "Déplacez-la dans la zone violette sans toucher les bords.",
    Icon: Hand,
  },
  {
    title: "Pincez pour commencer un trait",
    description: "Joignez franchement le pouce et l’index.",
    Icon: ScanLine,
  },
  {
    title: "Ouvrez la main pour faire une pause",
    description: "Écartez les doigts pour terminer immédiatement le trait.",
    Icon: Pause,
  },
] as const

type GestureCoachProps = {
  step: 0 | 1 | 2
  onBack: () => void
  onRestart: () => void
}

export function GestureCoach({ step, onBack, onRestart }: GestureCoachProps) {
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
          <span className="text-muted-foreground text-xs">
            Validation en direct
          </span>
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
      <div className="flex gap-2">
        {step > 0 ? (
          <Button className="h-11" variant="ghost" onClick={onBack}>
            Retour
          </Button>
        ) : null}
        <Button className="h-11" variant="secondary" onClick={onRestart}>
          Recommencer
        </Button>
      </div>
    </section>
  )
}
