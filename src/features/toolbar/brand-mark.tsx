import type { SVGProps } from "react"

export function DrawMotionMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 40" fill="none" {...props}>
      <path
        d="M5.5 4.75 21.2 19.9l-8.2 1.45-3.65 7.45L5.5 4.75Z"
        className="drawmotion-mark__cursor"
      />
      <circle cx="21.25" cy="22" r="3.75" className="drawmotion-mark__anchor" />
      <path
        d="M24.5 24.25c3.8 2.05 5.5-1.7 8.2-.1 1.55.9 1.1 3.35 3.35 3.9"
        className="drawmotion-mark__stroke"
      />
    </svg>
  )
}
