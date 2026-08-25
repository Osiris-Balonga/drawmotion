import type { HandTrackingResult } from "@/infrastructure/mediapipe/hand-tracker-port"

const HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
] as const

export class LandmarkOverlayRenderer {
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly video: HTMLVideoElement,
  ) {}

  render(result: HandTrackingResult): void {
    const context = this.resizeAndGetContext()
    if (!context) {
      return
    }

    context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    const hand = result.hands[0]
    if (!hand) {
      return
    }

    const points = hand.landmarks.map((landmark) =>
      this.mapMirroredPoint(landmark.x, landmark.y),
    )

    context.lineCap = "round"
    context.lineJoin = "round"
    context.lineWidth = Math.max(2, this.canvas.width * 0.012)
    context.strokeStyle = "#8b5cf6"
    context.beginPath()
    for (const [startIndex, endIndex] of HAND_CONNECTIONS) {
      const start = points[startIndex]
      const end = points[endIndex]
      if (start && end) {
        context.moveTo(start.x, start.y)
        context.lineTo(end.x, end.y)
      }
    }
    context.stroke()

    context.fillStyle = "#35d07f"
    const radius = Math.max(2.5, this.canvas.width * 0.015)
    for (const point of points) {
      context.beginPath()
      context.arc(point.x, point.y, radius, 0, Math.PI * 2)
      context.fill()
    }
  }

  clear(): void {
    this.canvas
      .getContext("2d")
      ?.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  private resizeAndGetContext(): CanvasRenderingContext2D | null {
    const ratio = window.devicePixelRatio || 1
    const width = Math.max(1, Math.round(this.canvas.clientWidth * ratio))
    const height = Math.max(1, Math.round(this.canvas.clientHeight * ratio))
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width
      this.canvas.height = height
    }
    return this.canvas.getContext("2d")
  }

  private mapMirroredPoint(x: number, y: number) {
    const sourceWidth = Math.max(1, this.video.videoWidth)
    const sourceHeight = Math.max(1, this.video.videoHeight)
    const scale = Math.max(
      this.canvas.width / sourceWidth,
      this.canvas.height / sourceHeight,
    )
    const offsetX = (this.canvas.width - sourceWidth * scale) / 2
    const offsetY = (this.canvas.height - sourceHeight * scale) / 2

    return {
      x: offsetX + (1 - x) * sourceWidth * scale,
      y: offsetY + y * sourceHeight * scale,
    }
  }
}
