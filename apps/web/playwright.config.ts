import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{arg}{ext}",
  use: {
    baseURL: "http://localhost:3100",
    colorScheme: "light",
    reducedMotion: "reduce",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm build && pnpm start --port 3100",
    reuseExistingServer: !process.env.CI,
    url: "http://localhost:3100",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { height: 900, width: 1440 },
      },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["iPhone 13"], browserName: "chromium" },
    },
  ],
});
