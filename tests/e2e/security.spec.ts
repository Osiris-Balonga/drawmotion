import { readFile } from "node:fs/promises"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { expect, test } from "@playwright/test"

test.use({
  launchOptions: {
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      "--enable-unsafe-swiftshader",
    ],
  },
})

test("production headers allow the real local MediaPipe Worker and block external connections", async ({
  page,
  context,
  request,
  baseURL,
}) => {
  test.setTimeout(60_000)
  const config = JSON.parse(await readFile("vercel.json", "utf8")) as {
    headers: { headers: { key: string; value: string }[] }[]
  }
  const requested: string[] = []
  const errors: string[] = []
  context.on("request", (request) => requested.push(request.url()))
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  const response = await page.goto("/")
  await promisify(execFile)(process.execPath, [
    "scripts/verify-security-headers.mjs",
    baseURL!,
  ])
  for (const { key, value } of config.headers[0].headers)
    expect(response?.headers()[key.toLowerCase()]).toBe(value)
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
  expect(requested.filter((url) => new URL(url).origin !== baseURL)).toEqual([])
  const workerUrl = requested.find((url) =>
    /hand-tracking\.worker-.*\.js$/.test(url),
  )!
  const workerResponse = await request.head(workerUrl)
  expect(workerResponse.headers()["content-security-policy"]).toBe(
    response?.headers()["content-security-policy"],
  )
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
