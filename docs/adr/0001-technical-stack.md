# ADR 0001 — Technical stack

Date: 2026-08-25

Status: accepted

## Context

DrawMotion is a client-side web application centered on webcam input, local
inference, and a Canvas engine. Version 1 needs no application server or database.

## Decision

- React 19 and strict TypeScript for the interface.
- Vite 8 for development and static builds.
- Tailwind CSS 4.3 for utilities and tokens.
- shadcn/ui with Base Nova and Base UI primitives; component source owned by the project.
- MediaPipe Tasks Vision in a Web Worker.
- Native two-layer Canvas 2D.
- React hooks for UI state and refs for the imperative video pipeline.
- Vitest, Testing Library, and Playwright for tests.
- GitHub Pages for the HTTPS demo and production, deployed by GitHub Actions.

## Consequences

Hosting amendment dated August 27, 2026: the maintainer selected GitHub Pages
instead of the original Vercel plan. CI tests the repository subpath and deploys
only from `main`; see the Pages limitations in [compatibility](../COMPATIBILITY.md#static-host-security).

Amendment dated August 27, 2026: Zustand was planned initially but was not
introduced. State belongs to the workspace and its gesture, navigation, and
onboarding hooks. The current scope does not need a global store.

Drawing, gesture interpretation, and camera infrastructure remain independent
of React. MediaPipe assets are hosted locally. New dependencies must reduce
measurable complexity and be justified in their pull request.
