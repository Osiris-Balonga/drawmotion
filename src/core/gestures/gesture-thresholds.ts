export const GESTURE_THRESHOLDS = {
  /** Minimum tracker confidence before a hand may produce a gesture. */
  minimumHandConfidence: 0.65,
  /** Thumb-to-index distance, divided by palm size, required to enter pinch. */
  pinchEnterRatio: 0.18,
  /** Larger release boundary that prevents chatter around pinch entry. */
  pinchExitRatio: 0.24,
  /** Fingertip must exceed its PIP-to-wrist distance by this factor. */
  fingerExtensionRatio: 1.12,
  /** Index through little finger count needed for an open hand. */
  openHandMinimumExtendedFingers: 4,
  /** Maximum extended fingers accepted as a fist. */
  fistMaximumExtendedFingers: 0,
} as const
