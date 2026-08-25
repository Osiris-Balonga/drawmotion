import type { CanvasBounds } from "@/core/geometry/coordinate-mapping"

import type {
  AssistedPrimitive,
  NormalizedPoint,
  Stroke,
} from "./drawing-model"
import {
  resamplePointsByDistance,
  smoothPoints,
  type Point2D,
} from "./stroke-resampling"

export type StrokeAssistanceMode = "free" | "stabilized" | "shapes"

export type StrokeCorrection = {
  primitive: AssistedPrimitive
  confidence: number
}

export type StrokeAssistanceResult = {
  stroke: Stroke
  correction: StrokeCorrection | null
}

const SAMPLE_SPACING_PX = 3
const MIN_PRIMITIVE_SIZE_PX = 28
const AUTO_CORRECTION_CONFIDENCE = 0.86

type PrimitiveCandidate = StrokeCorrection & {
  points: Point2D[]
}

function clampUnit(value: number) {
  return Math.min(1, Math.max(0, value))
}

function toPixels(points: readonly NormalizedPoint[], bounds: CanvasBounds) {
  return points.map((point) => ({
    x: point.x * bounds.width,
    y: point.y * bounds.height,
  }))
}

function toNormalized(points: readonly Point2D[], bounds: CanvasBounds) {
  return points.map((point) => ({
    x: clampUnit(point.x / Math.max(1, bounds.width)),
    y: clampUnit(point.y / Math.max(1, bounds.height)),
  }))
}

function distance(a: Point2D, b: Point2D) {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

function pathLength(points: readonly Point2D[]) {
  return points.slice(1).reduce((length, point, index) => {
    const previous = points[index]
    return previous ? length + distance(previous, point) : length
  }, 0)
}

function boundsDiagonal(points: readonly Point2D[]) {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  return Math.hypot(
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys),
  )
}

function lineCandidate(points: readonly Point2D[]): PrimitiveCandidate | null {
  const first = points[0]
  const last = points.at(-1)
  if (!first || !last) return null
  const length = pathLength(points)
  const endDistance = distance(first, last)
  if (endDistance < MIN_PRIMITIVE_SIZE_PX || length === 0) return null

  const direction = {
    x: (last.x - first.x) / endDistance,
    y: (last.y - first.y) / endDistance,
  }
  const squaredError = points.reduce((sum, point) => {
    const perpendicular =
      (point.x - first.x) * -direction.y + (point.y - first.y) * direction.x
    return sum + perpendicular * perpendicular
  }, 0)
  const normalizedError =
    Math.sqrt(squaredError / points.length) / Math.max(endDistance, 1)
  const efficiency = endDistance / length
  if (normalizedError > 0.035 || efficiency < 0.88) return null

  const confidence = clampUnit(
    0.55 * (1 - normalizedError / 0.035) + 0.45 * ((efficiency - 0.88) / 0.12),
  )
  return {
    primitive: "line",
    confidence,
    points: [{ ...first }, { ...last }],
  }
}

function signedArea(points: readonly Point2D[]) {
  return points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length]
    return next ? area + point.x * next.y - next.x * point.y : area
  }, 0)
}

function rectangleCandidate(
  points: readonly Point2D[],
): PrimitiveCandidate | null {
  const first = points[0]
  const last = points.at(-1)
  if (!first || !last || points.length < 12) return null
  const diagonal = boundsDiagonal(points)
  if (
    diagonal < MIN_PRIMITIVE_SIZE_PX ||
    distance(first, last) / diagonal > 0.14
  ) {
    return null
  }

  const center = points.reduce(
    (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
    { x: 0, y: 0 },
  )
  center.x /= points.length
  center.y /= points.length
  const covariance = points.reduce(
    (sum, point) => {
      const x = point.x - center.x
      const y = point.y - center.y
      return { xx: sum.xx + x * x, xy: sum.xy + x * y, yy: sum.yy + y * y }
    },
    { xx: 0, xy: 0, yy: 0 },
  )
  const rotation =
    0.5 * Math.atan2(2 * covariance.xy, covariance.xx - covariance.yy)
  const cosRotation = Math.cos(rotation)
  const sinRotation = Math.sin(rotation)
  const localPoints = points.map((point) => ({
    x: (point.x - center.x) * cosRotation + (point.y - center.y) * sinRotation,
    y: -(point.x - center.x) * sinRotation + (point.y - center.y) * cosRotation,
  }))
  const minX = Math.min(...localPoints.map((point) => point.x))
  const maxX = Math.max(...localPoints.map((point) => point.x))
  const minY = Math.min(...localPoints.map((point) => point.y))
  const maxY = Math.max(...localPoints.map((point) => point.y))
  const width = maxX - minX
  const height = maxY - minY
  if (Math.min(width, height) < MIN_PRIMITIVE_SIZE_PX / 2) return null

  const edgeCounts = [0, 0, 0, 0]
  const meanEdgeError =
    localPoints.reduce((sum, point) => {
      const distances = [
        Math.abs(point.x - minX),
        Math.abs(point.x - maxX),
        Math.abs(point.y - minY),
        Math.abs(point.y - maxY),
      ]
      const edgeDistance = Math.min(...distances)
      const edgeIndex = distances.indexOf(edgeDistance)
      edgeCounts[edgeIndex] = (edgeCounts[edgeIndex] ?? 0) + 1
      return sum + edgeDistance
    }, 0) / points.length
  const normalizedError = meanEdgeError / Math.hypot(width, height)
  const perimeterError = Math.abs(
    pathLength(points) / (2 * (width + height)) - 1,
  )
  const visitsEveryEdge = edgeCounts.every(
    (count) => count / points.length >= 0.08,
  )
  if (normalizedError > 0.028 || perimeterError > 0.22 || !visitsEveryEdge) {
    return null
  }

  const toWorld = (point: Point2D) => ({
    x: center.x + point.x * cosRotation - point.y * sinRotation,
    y: center.y + point.x * sinRotation + point.y * cosRotation,
  })
  const corners = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ].map(toWorld)
  if (signedArea(points) < 0) corners.reverse()
  const startIndex = corners.reduce(
    (bestIndex, corner, index) =>
      distance(corner, first) < distance(corners[bestIndex]!, first)
        ? index
        : bestIndex,
    0,
  )
  const orderedCorners = Array.from(
    { length: 4 },
    (_, index) => corners[(startIndex + index) % corners.length]!,
  )
  orderedCorners.push({ ...orderedCorners[0]! })

  return {
    primitive: "rectangle",
    confidence: clampUnit(1 - normalizedError / 0.25 - perimeterError / 0.8),
    points: orderedCorners,
  }
}

function sampleEllipse(
  center: Point2D,
  radiusX: number,
  radiusY: number,
  rotation: number,
  startPoint: Point2D,
  clockwise: boolean,
) {
  const cosRotation = Math.cos(rotation)
  const sinRotation = Math.sin(rotation)
  const localStartX =
    (startPoint.x - center.x) * cosRotation +
    (startPoint.y - center.y) * sinRotation
  const localStartY =
    -(startPoint.x - center.x) * sinRotation +
    (startPoint.y - center.y) * cosRotation
  const startAngle = Math.atan2(localStartY / radiusY, localStartX / radiusX)
  const direction = clockwise ? 1 : -1
  return Array.from({ length: 65 }, (_, index) => {
    const angle = startAngle + direction * (index / 64) * Math.PI * 2
    const localX = Math.cos(angle) * radiusX
    const localY = Math.sin(angle) * radiusY
    return {
      x: center.x + localX * cosRotation - localY * sinRotation,
      y: center.y + localX * sinRotation + localY * cosRotation,
    }
  })
}

function closedPrimitiveCandidate(
  points: readonly Point2D[],
): PrimitiveCandidate | null {
  const first = points[0]
  const last = points.at(-1)
  if (!first || !last || points.length < 12) return null
  const diagonal = boundsDiagonal(points)
  if (diagonal < MIN_PRIMITIVE_SIZE_PX) return null

  const center = points.reduce(
    (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
    { x: 0, y: 0 },
  )
  center.x /= points.length
  center.y /= points.length
  const covariance = points.reduce(
    (sum, point) => {
      const x = point.x - center.x
      const y = point.y - center.y
      return { xx: sum.xx + x * x, xy: sum.xy + x * y, yy: sum.yy + y * y }
    },
    { xx: 0, xy: 0, yy: 0 },
  )
  covariance.xx /= points.length
  covariance.xy /= points.length
  covariance.yy /= points.length
  const rotation =
    0.5 * Math.atan2(2 * covariance.xy, covariance.xx - covariance.yy)
  const trace = covariance.xx + covariance.yy
  const delta = Math.hypot(covariance.xx - covariance.yy, 2 * covariance.xy)
  const radiusX = Math.sqrt(Math.max(1, trace + delta))
  const radiusY = Math.sqrt(Math.max(1, trace - delta))
  const majorRadius = Math.max(radiusX, radiusY)
  const minorRadius = Math.min(radiusX, radiusY)
  if (minorRadius < MIN_PRIMITIVE_SIZE_PX / 4) return null

  const cosRotation = Math.cos(rotation)
  const sinRotation = Math.sin(rotation)
  const radialError =
    points.reduce((sum, point) => {
      const localX =
        (point.x - center.x) * cosRotation + (point.y - center.y) * sinRotation
      const localY =
        -(point.x - center.x) * sinRotation + (point.y - center.y) * cosRotation
      const radius = Math.hypot(localX / radiusX, localY / radiusY)
      return sum + Math.abs(radius - 1)
    }, 0) / points.length
  const closure = distance(first, last) / majorRadius
  const h = ((majorRadius - minorRadius) / (majorRadius + minorRadius)) ** 2
  const circumference =
    Math.PI *
    (majorRadius + minorRadius) *
    (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))
  const coverageError = Math.abs(pathLength(points) / circumference - 1)
  if (closure > 0.32 || radialError > 0.13 || coverageError > 0.3) return null

  const confidence = clampUnit(
    1 - closure / 1.2 - radialError / 0.8 - coverageError / 1.2,
  )
  const axisRatio = majorRadius / minorRadius
  const primitive: AssistedPrimitive = axisRatio < 1.16 ? "circle" : "ellipse"
  const circleRadius = (radiusX + radiusY) / 2
  const fittedRadiusX = primitive === "circle" ? circleRadius : radiusX
  const fittedRadiusY = primitive === "circle" ? circleRadius : radiusY
  return {
    primitive,
    confidence,
    points: sampleEllipse(
      center,
      fittedRadiusX,
      fittedRadiusY,
      primitive === "circle" ? 0 : rotation,
      first,
      signedArea(points) > 0,
    ),
  }
}

function prepareCenterline(
  points: readonly NormalizedPoint[],
  bounds: CanvasBounds,
  mode: StrokeAssistanceMode,
) {
  const sampled = resamplePointsByDistance(
    toPixels(points, bounds),
    SAMPLE_SPACING_PX,
  )
  return mode === "free" ? sampled : smoothPoints(sampled, 2)
}

export function assistStroke(
  stroke: Stroke,
  bounds: CanvasBounds,
  mode: StrokeAssistanceMode,
): StrokeAssistanceResult {
  if (stroke.points.length < 2 || stroke.tool === "eraser") {
    return { stroke, correction: null }
  }
  const centerline = prepareCenterline(stroke.points, bounds, mode)
  const stabilized = { ...stroke, points: toNormalized(centerline, bounds) }
  if (mode !== "shapes") return { stroke: stabilized, correction: null }

  const candidates = [
    lineCandidate(centerline),
    rectangleCandidate(centerline),
    closedPrimitiveCandidate(centerline),
  ].filter((candidate): candidate is PrimitiveCandidate => candidate !== null)
  const candidate = candidates.sort((a, b) => b.confidence - a.confidence)[0]
  if (!candidate || candidate.confidence < AUTO_CORRECTION_CONFIDENCE) {
    return { stroke: stabilized, correction: null }
  }

  const correction: StrokeCorrection = {
    primitive: candidate.primitive,
    confidence: candidate.confidence,
  }
  return {
    correction,
    stroke: {
      ...stroke,
      points: toNormalized(candidate.points, bounds),
      assistance: {
        ...correction,
        originalPoints: stroke.points.map((point) => ({ ...point })),
      },
    },
  }
}
