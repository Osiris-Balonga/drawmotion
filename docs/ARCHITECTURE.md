# Architecture

DrawMotion is a React/TypeScript client application without a server API or
database. The UI owns settings; the frame pipeline and rendering are imperative
to avoid a React render for every point.

## Repository layout

| Directory       | Purpose                                                                       | Tracked in Git |
| --------------- | ----------------------------------------------------------------------------- | -------------- |
| `src/`          | Application code and colocated unit/component/integration tests               | Yes            |
| `src/test/`     | Shared test setup, deterministic fixtures, and fakes; not a second test suite | Yes            |
| `tests/e2e/`    | Browser journeys and browser-specific fixtures                                | Yes            |
| `public/`       | Shipped model, WASM, images, and license texts                                | Yes            |
| `scripts/`      | Build, asset, license, and security verification                              | Yes            |
| `.github/`      | CI, repository policies, and contribution templates                           | Yes            |
| `docs/`         | Contributor and release documentation                                         | Yes            |
| `.artifacts/`   | Generated coverage, Playwright reports, screenshots, and traces               | No             |
| `dist/`         | Generated production build                                                    | No             |
| `node_modules/` | Installed dependencies and compiler cache                                     | No             |

Keep test sources close to the modules they exercise. Browser tests live
separately because they run against the built application, not individual
modules. Generated reports belong in `.artifacts/`, never alongside sources.
The lockfile and vendored runtime assets are intentionally tracked so a clone
can reproduce the build without fetching model files from a third-party CDN.

## Frame pipeline

```text
getUserMedia → HandTrackingSession → WorkerHandTracker → MediaPipe Worker
                         ↓ results
              classifier + pinch detector
                         ↓
              useWorkspaceGestures
       filter → screen coordinates → intentions
                         ↓
              CanvasDrawingController
          document + history + assistance
                         ↓
              TwoLayerCanvasRenderer → PNG
```

The Worker runs Hand Landmarker; the application's classifier interprets its
landmarks. There is no remote inference, Python service, or Three.js.
The MediaPipe adapter used **inside** the Worker is not a legacy main-thread
inference mode.

## Where to make changes

| Responsibility                                              | Location                                              |
| ----------------------------------------------------------- | ----------------------------------------------------- |
| Permissions, video streams, stopping tracks                 | `src/infrastructure/camera/`                          |
| Capture, bounded queue, Worker protocol, model, diagnostics | `src/infrastructure/mediapipe/`, `src/workers/`       |
| Pinching, classification, stability, tracking loss          | `src/core/gestures/`                                  |
| Mirrored camera-to-screen mapping                           | `src/core/geometry/coordinate-mapping.ts`             |
| Strokes, history, shape assistance, viewport, Canvas        | `src/core/drawing/`                                   |
| Shared settings and screen composition                      | `src/features/workspace/workspace-shell.tsx`          |
| Frame-to-command adaptation, menu, feedback                 | `src/features/workspace/use-workspace-gestures.ts`    |
| Zoom, pan, keyboard shortcuts                               | `src/features/workspace/use-workspace-navigation.ts`  |
| Progress and exercise observation                           | `src/features/onboarding/use-workspace-onboarding.ts` |
| Tutorial state machine and versioned storage                | `src/features/onboarding/`                            |
| Dock controls and Base UI components                        | `src/features/toolbar/`, `src/components/ui/`         |

The three workspace hooks have distinct responsibilities; they are not a global
store. The shell provides the same state and callbacks to the dock and gesture
commands, with no independent copies of colors or thicknesses.

Workspace styles have an explicit import order:
`chrome.css`, `camera.css`, `interactions.css`, `responsive.css`.
Responsive overrides stay last. Tokens live in `src/styles/globals.css`.

## Invariants

- **One image in flight to the Worker**, with at most one pending replacement.
  Dispose of discarded bitmaps and release resources when stopping.
- **No connecting stroke after tracking loss.** A distant return reanchors the
  filter; the previous point must not become the start of a new stroke.
- **Exactly one horizontal mirror.** The circular crop is a visual preview,
  not the detection region or a restriction on drawing coordinates.
- **No gesture clicks on small buttons.** Pinches select large targets in the
  contextual palette; the dock uses mouse, keyboard, or touch.
- **Explicit units.** Intentions use CSS screen coordinates. The controller
  inverts the viewport transform to store document points. Displayed widths
  are divided by 1000, then the renderer scales them by the canvas's shorter
  side and zoom. A fist must use the selected eraser size, not a hidden minimum
  or the pen width.
- **Shared history** for drawing and erasing. Assistance preserves original
  points so users can reject a shape correction.
- **Export the visible persistent layer**, without the camera, controls, or
  pointer. Fitting the whole document is not automatic.
- **Tutorial-only persistence** under `drawmotion:onboarding`, with a versioned
  schema. Missing, old, invalid, or inaccessible data falls back to a first
  visit without blocking use. Drawings are not saved.

## Localization

`src/i18n/` contains five small, bundled message catalogs and the browser-locale
resolver. English defines the typed message keys and interpolation parameters;
other catalogs must provide the same keys. The translator uses `Intl.NumberFormat`
for numeric values and returns plain text, never HTML.

The first supported `navigator.languages` preference wins, with
`navigator.language` as a fallback when the list is empty. Unsupported or invalid
preferences fall back to English. Regional variants map to their base language;
all Chinese variants currently use the `zh-Hans` catalog. This is not Traditional
Chinese localization. The selected language is fixed for the page session:
reload after changing browser preferences. There is no location lookup, extra
storage, or effect that restarts tracking when rendering translated text.

Before React renders, the entry point updates the document's `lang` attribute
and description. UI labels, tutorial guidance, tooltips, camera errors, and
screen-reader announcements use these catalogs. Developer diagnostics and
repository documentation remain English. Translations are maintained in source;
there is no runtime translation service.

References: [browser language preferences](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/languages)
and [document language](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/lang).

## Tests and decisions

The [testing guide](TESTING.md) separates core logic, components, integrations,
and browser journeys. A physical webcam is still required to assess latency,
accuracy, and recognition under varying conditions.

[ADRs](adr/) explain structural decisions. [PRODUCT](../PRODUCT.md) and
[DESIGN](../DESIGN.md) describe intent, not QA results.
The [archived initial plan](archive/implementation-plan.md) is not a set of
instructions to execute again.
