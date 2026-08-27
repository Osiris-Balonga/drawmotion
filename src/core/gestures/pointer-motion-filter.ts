import type { CanvasPoint } from "@/core/geometry/coordinate-mapping"

export type FilteredPointer = {
  point: CanvasPoint | null
  reliable: boolean
  discontinuity: boolean
}

export type PointerMotionFilterOptions = {
  minCutoffHz?: number
  velocityCutoffHz?: number
  velocityWeight?: number
  jumpTolerance?: number
  maxNormalizedSpeed?: number
  jumpConfirmationRadius?: number
}

type AxisFilterState = {
  raw: number
  filtered: number
  velocity: number
}

const DEFAULT_MIN_CUTOFF_HZ = 1
const DEFAULT_VELOCITY_CUTOFF_HZ = 1
const DEFAULT_VELOCITY_WEIGHT = 0.5
const DEFAULT_JUMP_TOLERANCE = 0.08
const DEFAULT_MAX_NORMALIZED_SPEED = 1.6
const DEFAULT_JUMP_CONFIRMATION_RADIUS = 0.08
const MAX_FILTER_INTERVAL_SECONDS = 0.1
const MAX_JUMP_INTERVAL_SECONDS = 0.25

function smoothingAlpha(elapsedSeconds: number, cutoffHz: number) {
  const timeConstant = 1 / (2 * Math.PI * cutoffHz)
  return 1 / (1 + timeConstant / elapsedSeconds)
}

function lowPass(previous: number, value: number, alpha: number) {
  return previous + alpha * (value - previous)
}

function positiveOption(value: number, name: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Pointer filter ${name} must be greater than zero`)
  }
  return value
}

/**
 * Speed-adaptive One Euro pointer filter with a discontinuity guard.
 * Coordinates are expected to stay normalized in the camera's [0, 1] space.
 */
export class PointerMotionFilter {
  readonly #minCutoffHz: number
  readonly #velocityCutoffHz: number
  readonly #velocityWeight: number
  readonly #jumpTolerance: number
  readonly #maxNormalizedSpeed: number
  readonly #jumpConfirmationRadius: number
  #x: AxisFilterState | null = null
  #y: AxisFilterState | null = null
  #lastReliablePoint: CanvasPoint | null = null
  #lastRawPoint: CanvasPoint | null = null
  #lastTimestampMs: number | null = null
  #pendingJump: CanvasPoint | null = null
  #hadTrackingGap = false

  constructor(options: PointerMotionFilterOptions = {}) {
    this.#minCutoffHz = positiveOption(
      options.minCutoffHz ?? DEFAULT_MIN_CUTOFF_HZ,
      "minCutoffHz",
    )
    this.#velocityCutoffHz = positiveOption(
      options.velocityCutoffHz ?? DEFAULT_VELOCITY_CUTOFF_HZ,
      "velocityCutoffHz",
    )
    this.#velocityWeight = positiveOption(
      options.velocityWeight ?? DEFAULT_VELOCITY_WEIGHT,
      "velocityWeight",
    )
    this.#jumpTolerance = positiveOption(
      options.jumpTolerance ?? DEFAULT_JUMP_TOLERANCE,
      "jumpTolerance",
    )
    this.#maxNormalizedSpeed = positiveOption(
      options.maxNormalizedSpeed ?? DEFAULT_MAX_NORMALIZED_SPEED,
      "maxNormalizedSpeed",
    )
    this.#jumpConfirmationRadius = positiveOption(
      options.jumpConfirmationRadius ?? DEFAULT_JUMP_CONFIRMATION_RADIUS,
      "jumpConfirmationRadius",
    )
  }

  update(
    point: CanvasPoint | null,
    timestampMs: number,
    reliable = point !== null,
  ): FilteredPointer {
    if (!point || !reliable) {
      this.#hadTrackingGap = true
      return {
        point: this.#lastReliablePoint,
        reliable: false,
        discontinuity: false,
      }
    }

    if (!this.#lastRawPoint || this.#lastTimestampMs === null) {
      return this.#reanchor(point, timestampMs, false)
    }

    if (
      this.#pendingJump &&
      Math.hypot(
        point.x - this.#pendingJump.x,
        point.y - this.#pendingJump.y,
      ) <= this.#jumpConfirmationRadius
    ) {
      return this.#reanchor(point, timestampMs, true)
    }

    const elapsedSeconds = Math.max(
      1 / 120,
      (timestampMs - this.#lastTimestampMs) / 1000,
    )
    const displacement = Math.hypot(
      point.x - this.#lastRawPoint.x,
      point.y - this.#lastRawPoint.y,
    )
    // Time without observations is not evidence of continuous movement.
    // Keep short, nearby dropouts smooth, but confirm a distant return instead
    // of interpolating ink from the old position after a long tracking gap.
    const permittedDisplacement = this.#hadTrackingGap
      ? this.#jumpConfirmationRadius
      : this.#jumpTolerance +
        this.#maxNormalizedSpeed *
          Math.min(elapsedSeconds, MAX_JUMP_INTERVAL_SECONDS)

    if (displacement > permittedDisplacement) {
      this.#pendingJump = { ...point }
      return {
        point: this.#lastReliablePoint,
        reliable: false,
        discontinuity: true,
      }
    }

    this.#pendingJump = null
    this.#hadTrackingGap = false
    const filterInterval = Math.min(elapsedSeconds, MAX_FILTER_INTERVAL_SECONDS)
    this.#x = this.#filterAxis(point.x, this.#x, filterInterval)
    this.#y = this.#filterAxis(point.y, this.#y, filterInterval)
    this.#lastRawPoint = { ...point }
    this.#lastTimestampMs = timestampMs
    this.#lastReliablePoint = {
      x: this.#x.filtered,
      y: this.#y.filtered,
    }

    return {
      point: this.#lastReliablePoint,
      reliable: true,
      discontinuity: false,
    }
  }

  reset() {
    this.#x = null
    this.#y = null
    this.#lastReliablePoint = null
    this.#lastRawPoint = null
    this.#lastTimestampMs = null
    this.#pendingJump = null
    this.#hadTrackingGap = false
  }

  #filterAxis(value: number, state: AxisFilterState | null, elapsed: number) {
    if (!state) return { raw: value, filtered: value, velocity: 0 }

    const rawVelocity = (value - state.raw) / elapsed
    const velocity = lowPass(
      state.velocity,
      rawVelocity,
      smoothingAlpha(elapsed, this.#velocityCutoffHz),
    )
    const cutoff = this.#minCutoffHz + this.#velocityWeight * Math.abs(velocity)
    return {
      raw: value,
      filtered: lowPass(state.filtered, value, smoothingAlpha(elapsed, cutoff)),
      velocity,
    }
  }

  #reanchor(
    point: CanvasPoint,
    timestampMs: number,
    discontinuity: boolean,
  ): FilteredPointer {
    this.#x = { raw: point.x, filtered: point.x, velocity: 0 }
    this.#y = { raw: point.y, filtered: point.y, velocity: 0 }
    this.#lastRawPoint = { ...point }
    this.#lastReliablePoint = { ...point }
    this.#lastTimestampMs = timestampMs
    this.#pendingJump = null
    this.#hadTrackingGap = false
    return { point: this.#lastReliablePoint, reliable: true, discontinuity }
  }
}
