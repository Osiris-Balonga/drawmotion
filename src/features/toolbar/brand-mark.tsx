import type { HTMLAttributes } from "react"

export function DrawMotionMark(props: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span {...props}>
      <img
        aria-hidden="true"
        alt=""
        src="/brand/drawmotion-symbol-b.png"
        width="64"
        height="64"
      />
    </span>
  )
}
