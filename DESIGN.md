---
name: DrawMotion
description: A guided gesture canvas that is precise and easy to understand.
---

# Design system: DrawMotion

## Overview

**Creative direction: the augmented canvas.**

DrawMotion first feels like a calm drawing tool, then reveals computer vision
through useful feedback: camera preview, hand landmarks, pointer, and
contextual guidance. In an ordinary indoor setting, users should easily
distinguish the white canvas from the dark interface around it.

The composition draws on Figma's clarity, Excalidraw's immediacy, and the
technical legibility of MediaPipe demos. Avoid science-fiction HUDs,
glassmorphism, and neon decoration.

Key characteristics:

- A dominant white canvas with restrained dark controls.
- Progressive learning through five illustrated missions.
- One visible brand accent at a time.
- Technical states explained in human language.
- Motion reserved for feedback and state transitions.

## Colors

Use slightly violet-tinted neutrals, a white canvas, and an almost-black shell.
Reserve violet for actions, progress, and active tracking.
Canonical tokens live in `src/styles/globals.css`.

| Token            | Value                    | Use                                           |
| ---------------- | ------------------------ | --------------------------------------------- |
| Motion violet    | `oklch(0.56 0.22 293)`   | Primary action, selected tool, progress       |
| Focus ring       | `oklch(0.72 0.16 293)`   | High-contrast keyboard focus on dark surfaces |
| Tracking green   | `oklch(0.72 0.16 151)`   | Reliable detection and success                |
| Attention orange | `oklch(0.80 0.15 75)`    | Imperfect framing and recoverable warnings    |
| Graphite shell   | `oklch(0.16 0.012 286)`  | Background and toolbars                       |
| Elevated surface | `oklch(0.22 0.016 286)`  | Floating panels                               |
| White canvas     | `oklch(0.995 0.002 286)` | Drawing surface only                          |
| Light ink        | `oklch(0.97 0.006 286)`  | Primary text on the shell                     |

Violet should indicate an action or state, not decorate an inactive surface.

## Typography

Use Geist Variable for headings, body text, and labels. Reserve monospace for
development diagnostics. Labels should feel compact, legible, and familiar,
like a creative tool rather than a marketing campaign.

- No oversized display headings in the workspace.
- Headings and active panel titles use weight 600.
- Body text uses weight 400 and a maximum measure of 70 characters.
- Labels use weight 500, sentence case, and normal letter spacing.

Use one sans-serif family; establish hierarchy through size, weight, and
spacing. The size scale is `0.75rem`, `0.875rem`, `1rem`, `1.25rem`,
and `1.5rem`. Body text starts at `1rem`; smaller sizes are for metadata
and short labels.

## Spacing and motion

Use a four-point spacing scale: `0.25rem`, `0.5rem`, `0.75rem`, `1rem`,
`1.5rem`, `2rem`, and `3rem`. Related controls use 8–12 px gaps; distinct
work areas use 24–48 px.

Direct feedback takes `120ms`; state transitions take `200ms`, using
`cubic-bezier(0.25, 1, 0.5, 1)`. Reduced motion replaces transitions with
immediate, perceptible state changes.

## Elevation

Keep the system flat by default. Tone differences separate the shell,
toolbars, and panels. Shadows lift floating islands, the dock, and panels off
the white canvas; do not nest surfaces and shadows without a functional reason.

A shadow indicates an overlay or interaction response, not decoration.

## Components

shadcn/ui components use Base UI. The workspace has floating top islands,
a collapsible bottom dock, contextual gesture commands, an illustrated tutorial,
and a circular camera preview. Temporary mode feedback appears below the camera.

### Buttons

- Moderately rounded corners, not oversized bubbles.
- Solid accent and light text for primary permission or confirmation actions.
- Brief tonal hover changes and clearly visible keyboard focus.
- Ghost tool actions on dark surfaces with explicit selected states.

### Navigation

Brand, history, and export form separate islands above the full-window canvas.
The bottom dock groups tools, widths, stroke styles, precision, and colors;
its extended section collapses on tablets. Zoom, camera preview, and guidance
float without reserved columns.

These controls remain usable with keyboard and mouse. Pinching selects only
the large targets in the dedicated gesture palette.

## Do and do not

Do:

- Give the canvas as much space as possible.
- Explain camera errors with an actionable recovery step.
- Pair tool icons with accessible labels and visual feedback.
- Keep ordinary transitions within 150–250 ms and respect reduced motion.
- Explicitly confirm clearing the entire canvas.

Do not:

- Add decorative HUD gauges, reticles, or data.
- Use glassmorphism, neon halos, or generic purple gradients.
- Expose model parameters before the expected user action.
- Bind destructive actions to easily triggered gestures.
- Nest cards, exaggerate corner radii, or slow tasks with choreography.
- Use a colored side stripe thicker than 1 px as a container accent.
