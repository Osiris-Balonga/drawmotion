import type { HTMLAttributes } from "react"

export function DrawMotionMark(props: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span {...props}>
      <img
        aria-hidden="true"
        alt=""
        src={`${import.meta.env.BASE_URL}brand/drawmotion-symbol-b.png`}
        width="64"
        height="64"
      />
    </span>
  )
}
