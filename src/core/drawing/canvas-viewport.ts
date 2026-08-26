export type CanvasViewport = {
  zoom: number
  offsetX: number
  offsetY: number
}

export type ViewportPoint = {
  x: number
  y: number
}

export const MIN_CANVAS_ZOOM = 0.25
export const MAX_CANVAS_ZOOM = 3
export const initialCanvasViewport: CanvasViewport = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
}

export function clampCanvasZoom(zoom: number) {
  return Math.min(MAX_CANVAS_ZOOM, Math.max(MIN_CANVAS_ZOOM, zoom))
}

export function zoomCanvasViewport(
  viewport: CanvasViewport,
  requestedZoom: number,
  anchor: ViewportPoint,
): CanvasViewport {
  const zoom = clampCanvasZoom(requestedZoom)
  const worldX = (anchor.x - viewport.offsetX) / viewport.zoom
  const worldY = (anchor.y - viewport.offsetY) / viewport.zoom

  return {
    zoom,
    offsetX: anchor.x - worldX * zoom,
    offsetY: anchor.y - worldY * zoom,
  }
}

export function panCanvasViewport(
  viewport: CanvasViewport,
  delta: ViewportPoint,
): CanvasViewport {
  return {
    ...viewport,
    offsetX: viewport.offsetX + delta.x,
    offsetY: viewport.offsetY + delta.y,
  }
}
