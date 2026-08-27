# DrawMotion

Draw in the air, directly in your browser. DrawMotion turns hand movements
captured by a webcam into 2D drawings: pinch to draw, release to lift the pen,
and make a fist to erase.

Prototype being prepared for a public demo, version `1.0.0-rc.1`.
The demo is not published yet. See [features and limitations](CHANGELOG.md).

## Getting started

Requirements: **Node.js 24** and **pnpm 11.19.0**.

```sh
git clone https://github.com/Osiris-Balonga/drawmotion.git
cd drawmotion
pnpm install --frozen-lockfile
pnpm dev
```

The repository is still private, so cloning currently requires access.
Open the URL printed by Vite, click the camera preview, and follow the tutorial.
No API key or Python server is needed. Desktop Chrome and Edge are the initial
targets; see [compatibility limitations](docs/COMPATIBILITY.md).

## Using DrawMotion

- **Aim**: move your index finger; the purple dot shows the pointer position.
- **Draw**: bring your thumb and index finger together. Release to finish the stroke.
- **Erase**: make a fist and move it over the drawing.
- **Gesture commands**: hold up your index and middle fingers in a peace sign.
  Then pinch over a large target to select it. This gesture is disabled during
  the first tutorial missions to avoid interrupting them.
- **Settings**: the dock and gesture commands share color, thickness, and stroke
  style. The dock's HEX/RGB picker supports mouse, touch, and keyboard input.
- **Precision**: freehand follows your movement, stabilized drawing reduces
  unevenness, and shape assistance can regularize lines, circles, ellipses, and
  rectangles. You can reject a correction and keep your original stroke.
- **Navigation**: use the zoom controls or `+` / `-` / `0`, and Space + drag to
  pan the canvas. `M` opens commands; Ctrl/Cmd + Z undoes an action.
- **Export**: the PNG captures the visible area at the current zoom, not
  automatically the entire document. Zoom out and recenter before exporting.

Drawings stay in memory: **export before reloading or closing the page**.
Settings work without a camera, but freehand drawing still requires a detected
hand. Accuracy depends on framing, lighting, and hardware; DrawMotion is not
a replacement for a drawing tablet.

## Local processing

MediaPipe Hand Landmarker runs in a Web Worker. The model, WASM, fonts, and
illustrations are served with the site. DrawMotion does not record or upload
video and does not request microphone access. Only tutorial progress is saved
in local storage.

The [privacy documentation](docs/COMPATIBILITY.md#privacy) distinguishes in-memory
data, normal asset requests, and network checks. To report a vulnerability,
see [SECURITY.md](SECURITY.md).

## Contributing and testing

React, TypeScript, Vite, Tailwind CSS, shadcn/ui **Base UI**, MediaPipe, and
Canvas 2D. No Three.js, backend, or global state store.

```sh
pnpm test                       # unit, component, and integration tests
pnpm exec playwright install chromium
pnpm test:e2e                   # browser journeys against a production build
```

Run groups separately with `test:unit`, `test:components`, and
`test:integration`. `test:all` runs all tests.
See [CONTRIBUTING](CONTRIBUTING.md), [architecture](docs/ARCHITECTURE.md), and
[testing](docs/TESTING.md), including the checks that require a physical webcam.

Repository code and documentation are written in English. User-facing app
content may be localized; see the [language policy](CONTRIBUTING.md#language).

## License and release

Original code is licensed under [MIT](LICENSE). Dependencies, the font, and the
model retain their own licenses: see [third-party notices](docs/THIRD_PARTY.md).
`pnpm build` includes the required texts in `dist/licenses/`.

Publication still requires [manual QA](docs/qa/v1.0.0.md) and the
[release procedure](docs/RELEASE.md). Historical plans are kept in
[the archive](docs/archive/README.md), not used as current instructions.
