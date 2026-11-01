import { defineConfig, devices } from '@playwright/test'

const webPort = process.env.WEB_PORT ?? '5201'
const apiPort = process.env.API_PORT ?? '5202'
const isCI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  // The backend database is shared by all tests: run them one at a time.
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${webPort}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // Profile e2e: fresh in-memory database with users, rooms and today's sample bookings
      command: './mvnw -f backend/pom.xml -q spring-boot:run -Dspring-boot.run.profiles=e2e',
      url: `http://localhost:${apiPort}/api/rooms`,
      env: { API_PORT: apiPort },
      reuseExistingServer: !isCI,
      timeout: 180_000,
    },
    {
      command: 'npm run dev --prefix frontend',
      url: `http://localhost:${webPort}`,
      env: { WEB_PORT: webPort, API_PORT: apiPort },
      reuseExistingServer: !isCI,
      timeout: 60_000,
    },
  ],
})
