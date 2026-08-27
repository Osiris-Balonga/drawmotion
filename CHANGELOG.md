# Changelog

## Unreleased

- Add explicit offline preparation, install guidance and optional persistent
  storage, with scoped integrity-checked caching of the complete application.
- Defer PWA updates until all old-version windows close; never reload a drawing
  session automatically. Gate Pages deployment on cold-start and A/B browser tests.

- Save the latest drawing and canvas view locally across page reloads, including
  erasing, assistance and clearing; explain storage failures without blocking drawing.
- Show pointer cursors on enabled clickable controls, including the dock and navigation.
- Add the author and a maintainer-approved application preview to the README.

## 1.0.0-rc.1 — 2026-08-27 (public demo candidate)

### Features

- GitHub Pages deployment gated by CI, with project-subpath assets and document
  CSP; repository publication does not mark the candidate as stable 1.0.

- Build-time search/social metadata, canonical origin validation, crawl controls,
  and a production sitemap; preview builds stay out of search.

- English, French, Spanish, Italian, and Simplified Chinese UI selected from browser preferences, including tutorial, camera errors, and accessibility labels.

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
- No document persistence in this release or collaboration; export before closing the page.
- PNG captures the visible canvas: zoom out/recenter to include off-screen strokes.
- Public demo and source are available; stable-release physical QA remains pending.

Dated automated results from [batch 10](docs/qa/lot10-local.md) do not replace
[final QA](docs/qa/v1.0.0.md).
