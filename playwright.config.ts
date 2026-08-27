import { defineConfig } from "@playwright/test"

const sitePath = process.env.SITE_URL
  ? new URL(process.env.SITE_URL).pathname
  : "/"
const baseURL = `http://127.0.0.1:4175${sitePath}`

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: ".artifacts/test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  // Camera inference and accessibility scans compete for the same CPU/GPU.
  // Keep runs reproducible on ordinary laptops and shared CI runners.
  workers: 1,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: ".artifacts/playwright-report" }],
  ],
  use: {
    locale: "fr-FR",
    baseURL,
    browserName: "chromium",
    channel: process.env.E2E_BROWSER_CHANNEL || undefined,
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command:
      process.env.E2E_USE_BUILD === "1"
        ? "pnpm preview --host 127.0.0.1 --port 4175 --strictPort"
        : "pnpm build && pnpm preview --host 127.0.0.1 --port 4175 --strictPort",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
