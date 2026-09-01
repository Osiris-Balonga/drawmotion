import type { CSSProperties } from "react"

const pieces = Array.from({ length: 28 }, (_, index) => ({
  delay: (index % 7) * 35,
  drift: ((index * 37) % 240) - 120,
  left: 12 + ((index * 29) % 76),
  rotation: 180 + ((index * 47) % 360),
  tone: index % 5,
}))

type ConfettiStyle = CSSProperties & {
  "--confetti-delay": string
  "--confetti-drift": string
  "--confetti-left": string
  "--confetti-rotation": string
}

export function TutorialCompletionCelebration({ run }: { run: number }) {
  if (run === 0) return null

  return (
    <div
      key={run}
      aria-hidden="true"
      className="tutorial-completion-celebration"
      data-celebration-run={run}
    >
      {pieces.map((piece, index) => (
        <span
          key={index}
          data-tone={piece.tone}
          style={
            {
              "--confetti-delay": `${piece.delay}ms`,
              "--confetti-drift": `${piece.drift}px`,
              "--confetti-left": `${piece.left}%`,
              "--confetti-rotation": `${piece.rotation}deg`,
            } as ConfettiStyle
          }
        />
      ))}
    </div>
  )
}
