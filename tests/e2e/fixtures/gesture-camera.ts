import { readFileSync } from "node:fs"
import { expect, type Page } from "@playwright/test"
import {
  fistGestureLandmarks,
  handFromGestureFixture,
  menuGestureLandmarks,
  openHandGestureLandmarks,
  pinchGestureLandmarks,
} from "../../../src/test/fixtures/gesture-landmarks"

const poses = {
  open: openHandGestureLandmarks,
  pinch: pinchGestureLandmarks,
  fist: fistGestureLandmarks,
  menu: menuGestureLandmarks,
}
type Pose = keyof typeof poses
type Point = { x: number; y: number }
type Hands = ReturnType<typeof handFromGestureFixture>[]

// Positions are fractions of the visible canvas, not MediaPipe coordinates.
// Keep the hand small enough to stay in frame, with its index tip on target.
export function handAt(pose: Pose, point: Point): Hands {
  const landmarks = poses[pose]
  const tip = landmarks[8]
  return [
    handFromGestureFixture(
      landmarks.map(({ x, y, z }) => ({
        x: 1 - point.x + (x - tip.x) * 0.25,
        y: point.y + (y - tip.y) * 0.25,
        z,
      })),
    ),
  ]
}

export function hold(pose: Pose, point: Point, count = 10): Hands[] {
  return Array.from({ length: count }, () => handAt(pose, point))
}

export function move(pose: Pose, from: Point, to: Point, count = 16): Hands[] {
  return Array.from({ length: count }, (_, index) =>
    handAt(pose, {
      x: from.x + ((to.x - from.x) * (index + 1)) / count,
      y: from.y + ((to.y - from.y) * (index + 1)) / count,
    }),
  )
}

export async function installGestureCamera(page: Page) {
  const source = readFileSync(
    new URL("./hand-tracking.worker.js", import.meta.url),
    "utf8",
  )
  await page.route(/\/assets\/hand-tracking\.worker-[^/]+\.js$/, (route) =>
    route.fulfill({ contentType: "text/javascript", body: source }),
  )
}

export async function activateCamera(page: Page) {
  await page.getByRole("button", { name: "Activer ma caméra" }).click()
  await expect(
    page.getByText("Main non détectée", { exact: true }).last(),
  ).toBeAttached()
  await expect
    .poll(() =>
      page
        .getByLabel("Flux vidéo local")
        .evaluate((video: HTMLVideoElement) =>
          Boolean(video.srcObject && video.videoWidth && !video.paused),
        ),
    )
    .toBe(true)
}

export async function playHands(page: Page, frames: Hands[]) {
  await page.evaluate(
    (frames) =>
      new Promise<void>((resolve, reject) => {
        const channel = new BroadcastChannel("drawmotion-e2e-landmarks")
        const id = crypto.randomUUID()
        const timer = setTimeout(() => {
          channel.close()
          reject(new Error("The fixture Worker did not consume the sequence"))
        }, 15_000)
        channel.onmessage = (event: MessageEvent<{ completed: string }>) => {
          if (event.data.completed !== id) return
          clearTimeout(timer)
          channel.close()
          resolve()
        }
        channel.postMessage({ id, frames })
      }),
    frames,
  )
}

export async function aimAt(page: Page, target: Point) {
  await playHands(page, hold("open", target, 16))
}

export async function pinchButton(page: Page, name: string) {
  const palette = page.getByRole("region", { name: "Commandes gestuelles" })
  await expect(palette.getByRole("button", { name, exact: true })).toBeVisible()
  const bounds = await palette
    .getByRole("button", { name, exact: true })
    .boundingBox()
  const canvas = await page.locator(".drawing-canvas").boundingBox()
  if (!bounds || !canvas) throw new Error(`Missing gesture target: ${name}`)
  const target = {
    x: (bounds.x + bounds.width / 2 - canvas.x) / canvas.width,
    y: (bounds.y + bounds.height / 2 - canvas.y) / canvas.height,
  }
  await aimAt(page, target)
  await playHands(page, hold("pinch", target, 4))
  await playHands(page, hold("open", target))
}

// Read actual raster output, not the controller's internal document.
export async function inkIn(page: Page, point: Point, radius = 10) {
  return page
    .locator("canvas.drawing-canvas__layer")
    .first()
    .evaluate(
      (canvas: HTMLCanvasElement, { point, radius }) => {
        const pixels = canvas
          .getContext("2d")!
          .getImageData(
            Math.round(point.x * canvas.width) - radius,
            Math.round(point.y * canvas.height) - radius,
            radius * 2,
            radius * 2,
          ).data
        let ink = 0
        for (let i = 3; i < pixels.length; i += 4) {
          if (pixels[i] > 128) ink++
        }
        return ink
      },
      { point, radius },
    )
}
