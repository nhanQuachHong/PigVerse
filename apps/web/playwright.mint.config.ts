import { defineConfig, devices } from "@playwright/test";

const contract = "0x1111111111111111111111111111111111111111";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "mint-flow.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3101",
    colorScheme: "light",
    reducedMotion: "reduce",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "node --experimental-strip-types e2e/support/mock-base-rpc.mjs",
      reuseExistingServer: false,
      url: "http://127.0.0.1:3201",
    },
    {
      command: "pnpm build && pnpm start --port 3101",
      env: {
        BASE_SEPOLIA_RPC_URL: "http://127.0.0.1:3201",
        NEXT_PUBLIC_CHAIN_ID: "84532",
        NEXT_PUBLIC_CONTRACT_ADDRESS: contract,
        PIGVERSE_ENV: "base-sepolia",
      },
      reuseExistingServer: false,
      url: "http://localhost:3101",
    },
  ],
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["iPhone 13"], browserName: "chromium" },
    },
  ],
});
