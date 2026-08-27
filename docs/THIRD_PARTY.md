# Licenses and provenance

Checked on August 27, 2026 against the current lockfile.
[DrawMotion's MIT license](../LICENSE) does not replace third-party licenses.

## What the build distributes

`pnpm build` produces `dist/licenses/` and verifies its presence and contents.
Use `pnpm verify:licenses` to check an existing build.

| Resource                                      | License and distributed text              | Provenance                                  |
| --------------------------------------------- | ----------------------------------------- | ------------------------------------------- |
| Application JavaScript and transitive modules | Full texts in Vite-generated `bundled.md` | Packages actually included in chunks        |
| MediaPipe Worker, JS, and WASM                | Apache-2.0, `mediapipe-Apache-2.0.txt`    | `@mediapipe/tasks-vision@1.0.1`             |
| Hand Landmarker full, float16, version 1      | Apache-2.0, same text                     | Unmodified official model; references below |
| Geist Variable 5.3.0                          | OFL-1.1, `geist-OFL.txt`                  | `@fontsource-variable/geist`                |
| Adapted shadcn/ui components and CSS 4.19.0   | MIT, `shadcn-MIT.txt`                     | shadcn/ui with Base UI primitives           |
| Tailwind CSS 4.3.3                            | MIT, `tailwindcss-MIT.txt`                | `tailwindcss`                               |
| tw-animate-css 1.4.0                          | MIT, `tw-animate-css-MIT.txt`             | `tw-animate-css`                            |
| Original DrawMotion code                      | MIT, `drawmotion-MIT.txt`                 | Copied from the root LICENSE by Vite        |

Vite's report covers JavaScript modules in the application bundle, not assets
copied from `public/` or automatically the separate Worker build.
Complementary static texts live in [public/licenses](../public/licenses/README.md).
Lucide's mixed notices are preserved in its full package license, not reduced
to an ISC label.

Packaging verification is not automated legal analysis. After updating a
dependency, review its license, any NOTICE files, and the final artifact.
An SPDX identifier alone is not enough.

## MediaPipe model and runtime

The [official Hand Landmarker documentation](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker)
links the full model to the
[Hand Tracking Lite/Full model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Hand%20Tracking%20%28Lite_Full%29%20with%20Fairness%20Oct%202021.pdf).
Page 2 identifies the model as licensed under Apache License, Version 2.0.
This establishes the model's license separately from the JavaScript package.

Versioned URLs, retrieval dates, and SHA-256 hashes for the model and six runtime
files are in [public/vision/README.md](../public/vision/README.md).
`pnpm verify:vision-assets` checks their integrity. The Apache text comes from
[MediaPipe's LICENSE](https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE).

## Project visuals

`public/brand/drawmotion-symbol-b.png` and `public/onboarding/*.png` were
generated with OpenAI's image-generation tool, then selected and adapted for
DrawMotion by the maintainer. They are not MediaPipe illustrations or Lucide
icons. MIT covers the maintainer's rights in these assets; it does not guarantee
exclusivity over generated content or trademark clearance. No personal webcam
recordings are required by the repository or tests.

## Updating notices

1. Update the package and lockfile in the same PR.
2. Review new files' licenses and provenance. For CSS, fonts, models, WASM, and
   copied code, update the corresponding text in `public/licenses/`.
3. Run `pnpm build` and `pnpm verify:vision-assets`; inspect
   `dist/licenses/`, including copyright notices.
4. Verify that the deployed site serves these files. Do not strip this directory
   from the static artifact.
5. To audit development tools too, use `pnpm licenses list --json`.
   Its output includes local paths; do not publish it raw.

Not all development dependencies ship with the site. Their licenses remain
available in the packages installed from the lockfile.
