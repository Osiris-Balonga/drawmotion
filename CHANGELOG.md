# Changelog

## 1.0.0-rc.1 — 2026-08-27 (local, unpublished candidate)

### Features

- Webcam-based 2D drawing: aim with the index finger, pinch to draw, make a fist to erase.
- Contextual commands opened with a peace sign; settings synchronized with the dock.
- Freehand, stabilized, and shape modes; restore original strokes after shape correction.
- Preset and custom HEX/RGB colors, pen/eraser widths, solid, dashed, and dotted strokes.
- Undo/redo, clear confirmation, canvas pan/zoom, and PNG export.
- Floating interface, five illustrated tutorial missions, locally remembered first-visit state.
- Locally served MediaPipe model/runtime; Worker inference without uploading video.

### Reliability and release preparation

- Bounded inference queue and discarded outdated images to prevent growing delays.
- Tracking recovery without connecting strokes after hand loss; readable feedback below the camera.
- Responsive settings, keyboard navigation, reduced motion, and targeted accessibility tests.
- CSP/security headers, asset verification, bundle budgets, and dependency auditing.
- Separate test groups and browser journeys; QA and release workflow preparation.
- Fist erasing respects the selected eraser size, including sizes below 40 pixels.
- Workspace split into composition, gestures, navigation, and onboarding; unused interfaces removed.
- MIT license, third-party notices included in builds, and contributor guide.

### Known limitations

- Quality and latency depend on the webcam, lighting, and hardware; final physical QA is pending.
- Chrome and Edge on Windows are the initial validation targets. Desktop tests do not certify physical tablets, Safari, or Firefox.
- Controls support keyboard and mouse, but freehand drawing currently requires a detected hand.
- No document persistence or collaboration; export before closing the page.
- PNG captures the visible canvas: zoom out/recenter to include off-screen strokes.
- Public demo and open-source publication are still pending.

Dated automated results from [batch 10](docs/qa/lot10-local.md) do not replace
[final QA](docs/qa/v1.0.0.md).
