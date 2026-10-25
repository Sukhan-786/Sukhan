import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/admin-browser",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3104",
    ...devices["Desktop Chrome"],
    channel: "chrome",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node --import tsx tests/fixtures/admin-api.ts",
      url: "http://127.0.0.1:3199/health",
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --port 3104",
      url: "http://127.0.0.1:3104/login",
      reuseExistingServer: false,
      timeout: 60000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:3199",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fixture-publishable-key",
        NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3104",
      },
    },
  ],
  projects: [
    { name: "desktop" },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        channel: "chrome",
      },
    },
  ],
});
