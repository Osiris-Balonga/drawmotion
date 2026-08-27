import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { expect, test } from "@playwright/test"
import { documentCsp } from "../../scripts/security-policy"

test.use({
  launchOptions: {
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      "--enable-unsafe-swiftshader",
    ],
  },
})

test("document CSP allows real local MediaPipe inference and blocks page connections", async ({
  page,
  context,
  request,
  baseURL,
}) => {
  test.setTimeout(60_000)
  const requested: string[] = []
  const errors: string[] = []
  context.on("request", (request) => requested.push(request.url()))
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  await page.goto("./")
  await promisify(execFile)(process.execPath, [
    "scripts/verify-deployment.mjs",
    baseURL!,
  ])
  await expect(
    page.locator('meta[http-equiv="Content-Security-Policy"]'),
  ).toHaveAttribute("content", documentCsp)
  await page.getByRole("button", { name: "Passer le tutoriel" }).click()
  await page.getByRole("button", { name: "Activer ma caméra" }).click()
  // No routed fake Worker: this assertion requires actual WASM inference on the fake video.
  await expect(
    page.getByText("Main non détectée", { exact: true }).last(),
  ).toBeAttached({ timeout: 40_000 })
  expect(requested.some((url) => url.endsWith(".wasm"))).toBe(true)
  expect(requested.some((url) => url.endsWith("hand_landmarker.task"))).toBe(
    true,
  )
  expect(
    requested.filter((url) => new URL(url).origin !== new URL(baseURL!).origin),
  ).toEqual([])
  expect(
    requested.filter(
      (url) => !new URL(url).pathname.startsWith(new URL(baseURL!).pathname),
    ),
  ).toEqual([])
  const workerUrl = requested.find((url) =>
    /hand-tracking\.worker-.*\.js$/.test(url),
  )!
  const workerResponse = await request.head(workerUrl)
  expect(workerResponse.status()).toBe(200)
  // Meta CSP does not set response policy on a Worker; do not claim otherwise.
  expect(workerResponse.headers()["content-security-policy"]).toBeUndefined()
  await page.getByRole("button", { name: "Mettre la caméra en pause" }).click()
  expect(errors).toEqual([])

  const blocked = await page.evaluate(async () => {
    const violation = new Promise<string>((resolve) =>
      document.addEventListener(
        "securitypolicyviolation",
        (event) => resolve(event.effectiveDirective),
        { once: true },
      ),
    )
    await fetch("https://example.com/drawmotion-csp-probe").catch(
      () => undefined,
    )
    return violation
  })
  expect(blocked).toBe("connect-src")
})
