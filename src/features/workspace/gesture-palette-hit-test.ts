type Point = { x: number; y: number }

/**
 * Resolves the closest complete palette control, including a forgiving margin
 * around its card. The hit target is the button rectangle, never one of its
 * icon or label children.
 */
export function findGesturePaletteControl(
  root: ParentNode,
  point: Point,
  magnetism = 44,
) {
  let closest: { element: HTMLButtonElement; distance: number } | null = null

  for (const element of root.querySelectorAll<HTMLButtonElement>(
    "[data-gesture-palette-control]",
  )) {
    if (element.disabled) continue
    const bounds = element.getBoundingClientRect()
    const deltaX = Math.max(bounds.left - point.x, 0, point.x - bounds.right)
    const deltaY = Math.max(bounds.top - point.y, 0, point.y - bounds.bottom)
    const distance = Math.hypot(deltaX, deltaY)

    if (distance <= magnetism && (!closest || distance < closest.distance)) {
      closest = { element, distance }
    }
  }

  return closest?.element ?? null
}
