# Compatibility, privacy, and troubleshooting

## Scope

DrawMotion is a client-side gesture drawing application for desktop and tablet.
Gesture drawing and erasing require a camera and a detected hand. Settings,
commands, history, export, zoom, and panning also work with mouse and keyboard.
There is no complete camera-free drawing mode yet.

Recent Chrome and Edge versions are the demo targets. Camera access requires
HTTPS or `localhost`/`127.0.0.1` during development; plain HTTP on a LAN is
not enough. The browser needs Worker, WebAssembly, createImageBitmap, Canvas,
and getUserMedia support. Tracking tries the GPU and falls back to the CPU if
GPU initialization fails; this does not guarantee adequate speed on every device.

| Environment                        | Available validation                                                     | Limitations                                                       |
| ---------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Automated Chromium on Windows      | Full journeys, real model/WASM on fake video, export, CSP, keyboard, axe | Not a real hand or an accuracy measurement                        |
| Installed Chrome / Edge            | Smoke tests with `E2E_BROWSER_CHANNEL`                                   | Physical webcam QA required before distribution                   |
| Tablet layouts: 782×600 / 768×1024 | Layout and settings in an automated browser                              | Not physical iPad/Android validation                              |
| 200% zoom                          | CSS viewports of 720×450 / 640×400, equivalent to 1440×900 / 1280×800    | Native zoom, virtual keyboard, and touch still need manual checks |
| Safari / Firefox                   | Not tested                                                               | Not guaranteed for the demo; feedback is shown if tracking fails  |
| Phone / very narrow window         | Explicit compatibility message; no automatic camera request              | Mobile drawing is not supported                                   |

Desktop windows remain usable from 640 CSS pixels with a fine pointer. Small
touch surfaces below 768 pixels show advice to use a tablet in landscape or a
computer. This does not require browser-brand sniffing.

Dated results: [batch 10 local validation](qa/lot10-local.md).

## Privacy

- No account, analysis server, analytics, or telemetry SDK in the app.
- Frames and landmarks stay in device memory. DrawMotion does not record or
  upload video and does not request microphone access.
- The model, WASM, fonts, and illustrations are served from the application's
  origin. The browser/host receives normal asset requests, not video frames.
- Tutorial state, drawing strokes and the canvas view are stored in
  `localStorage`. Reload restores the latest saved draft, but not undo/redo
  history or tool settings. Clearing the canvas saves an empty draft.
  Clearing site data removes both the draft and tutorial progress. Localhost
  and the public demo have separate storage; there is no cloud sync or backup.
  Private browsing, storage limits and denied storage may prevent retention;
  export important drawings. Failed saves display an export warning.
- Pausing or moving the tab into the background stops the camera.
- Development diagnostics contain only timings and counters and are excluded
  from the production build.

These findings apply to the verified package and build, not every MediaPipe
version. The [upstream notice](https://github.com/google-ai-edge/mediapipe#privacy-notice)
mentions metrics for some APIs, so upgrades require another network check under
CSP. Current tests observe no third-party connections during loading or local
inference.

## Performance

Only one image is transferred to the Worker at a time. A second may wait on the
main thread; a newer image replaces it and releases its ImageBitmap. This keeps
the synchronous Worker from processing a long queue of outdated positions.
A capture may be in progress while an image is waiting. The Worker also retains
its internal queue guard.

In the `pnpm dev` console, enable **Verbose/Debug** messages to see
`[DrawMotion vision]`, at most once every five seconds:

- `detectionFps`: result frequency over a window of up to 120 results.
- `medianLatencyMs` / `p95LatencyMs`: time from bitmap submission to result
  reception, including waiting, but excluding capture and screen rendering.
- `droppedFrames`: images replaced before transfer. This can increase normally
  when the camera produces frames faster than inference can process them.

These are not end-to-end gesture-to-ink measurements. That requires timestamped
video and a physical device.

`pnpm verify:bundle` checks the local application and Worker build against total
budgets of 800 KiB raw JS, 250 KiB gzip JS, and 100 KiB raw CSS. The prototype is
approximately 640 KiB raw JS / 200 KiB gzip and 71 KiB CSS. Model/WASM files are
excluded, checked separately by `pnpm verify:vision-assets`, and loaded when
tracking starts.

## Static-host security

The production HTML contains a meta CSP from `scripts/security-policy.ts`
that blocks third-party document resources, inline scripts, and dynamic
JavaScript evaluation. `wasm-unsafe-eval` allows WASM compilation without
allowing `unsafe-eval`. Inline styles remain allowed for dynamic Base UI/React
positions and colors. Images using `data:`/`blob:` and local media are allowed;
Workers are same-origin and external forms are blocked.

GitHub Pages does not apply `vercel.json` or custom response headers. Meta CSP
does not cover the Worker's own fetches or provide `frame-ancestors`,
X-Frame-Options, or Permissions-Policy. Do not claim these protections on Pages.
The app requests no microphone, location, USB, or payment access, but that is
application behavior rather than a host-enforced permission restriction.
Referrer suppression uses HTML metadata. HTTPS is enforced by Pages.

`pnpm preview` serves the same built HTML policy, without invented response
headers. `pnpm dev` retains the development configuration needed for HMR.
`security.spec.ts` runs real MediaPipe inference and verifies that CSP blocks
an external connection; other gesture tests use deterministic landmarks.

After an authorized deployment, check the **actual HTTPS URL**:

```sh
pnpm verify:deployment https://osiris-balonga.github.io/drawmotion/
```

The verifier checks HTML policy, canonical/sitemap, asset paths, and WASM MIME.
It does not certify physical gestures or pretend to verify unsupported headers.

## Troubleshooting

| Symptom                             | Action                                                                                             |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| Access denied                       | Allow camera access in site settings, then retry                                                   |
| Camera busy                         | Close the other application using the webcam                                                       |
| Camera missing                      | Check the connection, system permissions, and HTTPS/localhost address                              |
| Tracking unavailable                | Try up-to-date Chrome/Edge; export and reload; check local asset loading                           |
| Hand not detected                   | Keep the whole hand in the real camera field and improve lighting; the circle is a cropped preview |
| Jerky strokes                       | Close heavy workloads, check development FPS/p95, and try the other target browser                 |
| Settings panel too tall when zoomed | Scroll the settings panel, not the page; Escape closes it                                          |
| Camera paused after switching tabs  | Click its preview to resume                                                                        |

## Before the public demo

Test on physical Chrome and Edge setups: permissions, denial/recovery, low
lighting, fist erasing, tracking loss followed by a distant pinched return
without a connecting stroke, native 200% zoom, tablet touch, export, and
background pausing. Verify the HTTPS demo and its assets too. These remain
release prerequisites, not assumed successes.

References: [MediaPipe Web](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js),
[CSP and WASM](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src),
[Workers and CSP](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers#content_security_policy),
[GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
