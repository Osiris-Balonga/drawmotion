export const GESTURE_THRESHOLDS = {
  /** Thumb-to-index distance, divided by palm size, required to enter pinch. */
  pinchEnterRatio: 0.18,
  /** Larger release boundary that prevents chatter around pinch entry. */
  pinchExitRatio: 0.24,
  /** Drawing release boundary, widened to tolerate hand rotation mid-stroke. */
  drawingPinchExitRatio: 0.34,
  /** Time reserved for a pinched hand to recover before ending the stroke. */
  drawingReleaseGraceMs: 150,
  /** Fingertip must exceed its PIP-to-wrist distance by this factor. */
  fingerExtensionRatio: 1.12,
  /** Index through little finger count needed for an open hand. */
  openHandMinimumExtendedFingers: 4,
  /** Maximum extended fingers accepted as a fist. */
  fistMaximumExtendedFingers: 0,
  /** Stable duration required before the dedicated menu pose can open UI. */
  menuPoseHoldMs: 550,
} as const
