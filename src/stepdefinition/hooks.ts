import { Before, After, BeforeAll, setWorldConstructor, setDefaultTimeout } from '@cucumber/cucumber';
import { World } from '../utils/World';
import logger from '../utils/Logger';
import fs from 'fs';
import path from 'path';

setWorldConstructor(World);
setDefaultTimeout(120 * 1000);

BeforeAll(async function () {
  logger.info('====== TEST SUITE STARTED ======');
  resetDirectory('./screenshots');
  ensureDirectory('./reports');
  ensureDirectory('./logs');
});

Before(async function (this: World, { pickle }) {
  logger.info(`====== SCENARIO STARTED: ${pickle.name} ======`);
  await this.openBrowser();
});

After(async function (this: World, { result, pickle }) {
  const scenarioName = sanitizeFileName(pickle.name);
  const status = result?.status || 'UNKNOWN';

  if (this.page && !this.page.isClosed()) {
    const screenshotPath = path.join('./screenshots', `${status}_${scenarioName}.png`);
    const screenshot = await this.page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });
    await this.attach(screenshot, 'image/png');
    logger.info(`Scenario screenshot saved and attached: ${screenshotPath}`);
  } else {
    logger.error('Screenshot skipped because the page was already closed');
  }

  if (result?.status === 'FAILED') {
    logger.error(`====== SCENARIO FAILED: ${pickle.name} ======`);
  } else {
    logger.info(`====== SCENARIO PASSED: ${pickle.name} ======`);
  }

  await this.closeBrowser();
});

function ensureDirectory(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`Created directory: ${dir}`);
  }
}

function resetDirectory(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
  logger.info(`Prepared clean directory: ${dir}`);
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 120);
}
