import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig, cucumberReporter } from 'playwright-bdd';
import { config } from './config/config';

const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: ['src/stepdefinition/**/*.ts', 'src/utils/World.ts'],
  outputDir: '.features-gen',
  missingSteps: 'fail-on-gen',
});

export default defineConfig({
  testDir,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: Number(process.env.PLAYWRIGHT_RETRIES ?? (process.env.CI ? 2 : 0)),
  workers: 4,
  timeout: config.pageTimeout,
  expect: {
    timeout: config.pageTimeout,
  },
  reporter: [
    ['list'],
    cucumberReporter('json', { outputFile: 'reports/test-results.json', skipAttachments: false }),
  ],
  use: {
    baseURL: config.baseUrl,
    headless: config.headless,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',
    navigationTimeout: config.pageTimeout,
    actionTimeout: config.pageTimeout,
    viewport: { width: 1920, height: 1080 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
