# Product

## Users

DrawMotion primarily serves people discovering a computer-vision demo on a
webcam-equipped computer. They should not need to know MediaPipe or gesture
interfaces. They want to understand the technology, make a simple drawing,
and see how a hand can replace a pointing device.

## Purpose

DrawMotion turns detected hand movements into 2D drawing commands in an
experience inspired by Paint and Excalidraw. The target is for a new user to
allow camera access, learn the gestures, draw, change tools, and export a PNG
without outside help in under two minutes. This is a product goal, not a
verified completion-time claim.

## Brand personality

Precise, educational, and visually engaging. The voice is brief, reassuring,
and factual. The experience reveals enough technology to invite curiosity,
then gets out of the way of drawing.

Repository code and documentation are English-only. User-facing app content,
including guidance and accessibility messages, may be localized.

## What to avoid

- Science-fiction HUDs full of decorative gauges, reticles, and data.
- Glassmorphism, neon halos, and purple gradients used as generic decoration.
- Demos that expose model parameters before explaining what to do.
- Destructive actions bound to gestures that are easy to trigger accidentally.
- Oversized components, nested cards, and animations that delay the task.

## Design principles

1. **Teach by doing.** Validate instructions through detection rather than long explanations.
2. **Canvas first.** Drawing dominates; the technology stays observable without becoming the main content.
3. **Prevent mistakes.** Hysteresis, automatic pausing, and confirmations protect against accidental activation.
4. **Provide a way out.** Mouse and keyboard support settings, canvas management, and export if tracking fails. Freehand drawing still requires a detected hand.
5. **Respect camera access.** Video stays local, is never recorded, and has an explicit lifecycle.

## Accessibility and inclusion

Target WCAG 2.2 AA for applicable controls and content: keyboard access,
textual state announcements, signals beyond color alone, reduced-motion
support, and usable controls at 200% browser zoom. These are goals, not
certification. Camera-free drawing is not implemented yet.
