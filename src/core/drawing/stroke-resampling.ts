import type { NormalizedPoint } from "./drawing-model"

export type Point2D = Pick<NormalizedPoint, "x" | "y">

function distance(a: Point2D, b: Point2D) {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

function interpolate(a: Point2D, b: Point2D, ratio: number): Point2D {
  return {
    x: a.x + (b.x - a.x) * ratio,
    y: a.y + (b.y - a.y) * ratio,
  }
}

/**
 * Places samples at a stable arc-length interval while preserving both ends.
 * This prevents camera frame rate variations from changing the rendered curve.
 */
export function resamplePointsByDistance(
  points: readonly Point2D[],
  spacing: number,
): Point2D[] {
  if (!Number.isFinite(spacing) || spacing <= 0) {
    throw new Error("Stroke sample spacing must be greater than zero")
  }
  const first = points[0]
  if (!first) return []
  if (points.length === 1) return [{ ...first }]

  const samples: Point2D[] = [{ ...first }]
  let previous = { ...first }
  let distanceSinceSample = 0

  for (const point of points.slice(1)) {
    let segmentStart = previous
    let segmentLength = distance(segmentStart, point)
    if (segmentLength === 0) continue

    while (distanceSinceSample + segmentLength >= spacing) {
      const remaining = spacing - distanceSinceSample
      const sample = interpolate(segmentStart, point, remaining / segmentLength)
      samples.push(sample)
      segmentStart = sample
      segmentLength = distance(segmentStart, point)
      distanceSinceSample = 0
    }

    distanceSinceSample += segmentLength
    previous = { ...point }
  }

  const last = points.at(-1)
  const sampledLast = samples.at(-1)
  if (last && sampledLast && distance(sampledLast, last) > spacing * 0.1) {
    samples.push({ ...last })
  }
  return samples
}

/** A small endpoint-preserving low-pass pass for the finalized centerline. */
export function smoothPoints(
  points: readonly Point2D[],
  passes = 1,
): Point2D[] {
  if (passes < 1 || points.length < 3)
    return points.map((point) => ({ ...point }))
  let smoothed = points.map((point) => ({ ...point }))

  for (let pass = 0; pass < passes; pass += 1) {
    smoothed = smoothed.map((point, index, current) => {
      const previous = current[index - 1]
      const next = current[index + 1]
      if (!previous || !next) return { ...point }
      return {
        x: (previous.x + point.x * 2 + next.x) / 4,
        y: (previous.y + point.y * 2 + next.y) / 4,
      }
    })
  }
  return smoothed
}
