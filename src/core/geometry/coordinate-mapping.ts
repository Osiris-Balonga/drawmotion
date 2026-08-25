import type { NormalizedLandmark } from "@/infrastructure/mediapipe/hand-tracker-port"

export type CanvasBounds = {
  left: number
  top: number
  width: number
  height: number
}

export type CanvasPoint = {
  x: number
  y: number
}

function clampUnit(value: number) {
  return Math.min(1, Math.max(0, value))
}

export function mapMirroredCameraPointToCanvas(
  point: Pick<NormalizedLandmark, "x" | "y">,
  bounds: CanvasBounds,
): CanvasPoint {
  return {
    x: bounds.left + (1 - clampUnit(point.x)) * bounds.width,
    y: bounds.top + clampUnit(point.y) * bounds.height,
  }
}
