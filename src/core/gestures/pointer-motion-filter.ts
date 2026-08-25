import type { CanvasPoint } from "@/core/geometry/coordinate-mapping"

export type FilteredPointer = {
  point: CanvasPoint | null
  reliable: boolean
}

export type PointerMotionFilterOptions = {
  timeConstantMs?: number
}

const DEFAULT_TIME_CONSTANT_MS = 70

export class PointerMotionFilter {
  readonly #timeConstantMs: number
  #lastReliablePoint: CanvasPoint | null = null
  #lastTimestampMs: number | null = null

  constructor(options: PointerMotionFilterOptions = {}) {
    this.#timeConstantMs = options.timeConstantMs ?? DEFAULT_TIME_CONSTANT_MS
    if (this.#timeConstantMs <= 0) {
      throw new Error("Pointer filter timeConstantMs must be greater than zero")
    }
  }

  update(
    point: CanvasPoint | null,
    timestampMs: number,
    reliable = point !== null,
  ): FilteredPointer {
    if (!point || !reliable) {
      this.#lastTimestampMs = null
      return { point: this.#lastReliablePoint, reliable: false }
    }

    if (!this.#lastReliablePoint || this.#lastTimestampMs === null) {
      this.#lastReliablePoint = { ...point }
      this.#lastTimestampMs = timestampMs
      return { point: this.#lastReliablePoint, reliable: true }
    }

    const elapsedMs = Math.max(0, timestampMs - this.#lastTimestampMs)
    const alpha = 1 - Math.exp(-elapsedMs / this.#timeConstantMs)
    this.#lastReliablePoint = {
      x:
        this.#lastReliablePoint.x +
        (point.x - this.#lastReliablePoint.x) * alpha,
      y:
        this.#lastReliablePoint.y +
        (point.y - this.#lastReliablePoint.y) * alpha,
    }
    this.#lastTimestampMs = timestampMs
    return { point: this.#lastReliablePoint, reliable: true }
  }

  reset() {
    this.#lastReliablePoint = null
    this.#lastTimestampMs = null
  }
}
