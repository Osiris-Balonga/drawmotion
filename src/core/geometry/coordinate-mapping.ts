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

export type CameraMappingRegion = {
  left: number
  right: number
  top: number
  bottom: number
}

const FULL_CAMERA_REGION: CameraMappingRegion = {
  left: 0,
  right: 1,
  top: 0,
  bottom: 1,
}

function clampUnit(value: number) {
  return Math.min(1, Math.max(0, value))
}

export function mapMirroredCameraPointToCanvas(
  point: Pick<NormalizedLandmark, "x" | "y">,
  bounds: CanvasBounds,
  region: CameraMappingRegion = FULL_CAMERA_REGION,
): CanvasPoint {
  const normalizedX = clampUnit(
    (point.x - region.left) / (region.right - region.left),
  )
  const normalizedY = clampUnit(
    (point.y - region.top) / (region.bottom - region.top),
  )
  return {
    x: bounds.left + (1 - normalizedX) * bounds.width,
    y: bounds.top + normalizedY * bounds.height,
  }
}
