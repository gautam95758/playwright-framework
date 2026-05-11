import { Before, After, BeforeAll, setWorldConstructor, setDefaultTimeout } from '@cucumber/cucumber';
import { World } from '../utils/World';
import logger from '../utils/Logger';
import fs from 'fs';

setWorldConstructor(World);
setDefaultTimeout(60 * 1000);

BeforeAll(async function () {
  logger.info('====== TEST SUITE STARTED ======');
  ['./screenshots', './reports', './logs'].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Created directory: ${dir}`);
    }
  });
});

Before(async function (this: World, { pickle }) {
  logger.info(`====== SCENARIO STARTED: ${pickle.name} ======`);
  await this.openBrowser();
});

After(async function (this: World, { result, pickle }) {
  if (result?.status === 'FAILED') {
    logger.error(`====== SCENARIO FAILED: ${pickle.name} ======`);
    const screenshotName = pickle.name.replace(/\s+/g, '_');
    await this.page?.screenshot({
      path: `./screenshots/FAILED_${screenshotName}.png`,
    });
    logger.error(`Screenshot saved: FAILED_${screenshotName}.png`);
  } else {
    logger.info(`====== SCENARIO PASSED: ${pickle.name} ======`);
  }
  await this.closeBrowser();
});
