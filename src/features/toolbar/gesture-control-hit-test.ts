import type { CanvasPoint } from "@/core/geometry/coordinate-mapping"

export function findGestureControlAtPoint(
  point: CanvasPoint,
  documentRoot: Pick<Document, "elementFromPoint"> = document,
) {
  const element = documentRoot.elementFromPoint(point.x, point.y)
  const control = element?.closest<HTMLElement>("[data-gesture-control]")
  if (
    !control ||
    control.getAttribute("aria-disabled") === "true" ||
    (control instanceof HTMLButtonElement && control.disabled)
  ) {
    return null
  }
  return control
}
