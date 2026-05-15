import { IWorldOptions, World as CucumberWorld } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page, chromium, firefox, webkit } from '@playwright/test';
import { config } from '../../config/config';
import logger from './Logger';

export class World extends CucumberWorld {
  public browser!: Browser;
  public context!: BrowserContext;
  public page!: Page;

  constructor(options: IWorldOptions) {
    super(options);
  }

  async openBrowser(): Promise<void> {
    logger.info(`Launching browser: ${config.browser}`);
    const browserType = config.browser.toLowerCase();

    if (browserType === 'firefox') {
      this.browser = await firefox.launch({ headless: config.headless });
    } else if (browserType === 'webkit') {
      this.browser = await webkit.launch({ headless: config.headless });
    } else {
      this.browser = await chromium.launch({ headless: config.headless });
    }

    logger.info('Browser launched successfully');
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
    this.page.setDefaultNavigationTimeout(config.pageTimeout);
    this.page.setDefaultTimeout(config.pageTimeout);
    logger.info(`Navigating to base URL: ${config.baseUrl}`);
    await this.page.goto(config.baseUrl, { waitUntil: 'domcontentloaded', timeout: config.pageTimeout });
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    logger.info('Browser setup complete - viewport set to 1920x1080');
  }

  async closeBrowser(): Promise<void> {
    logger.info('Closing browser...');
    await this.page?.close();
    await this.context?.close();
    await this.browser?.close();
    logger.info('Browser closed successfully');
  }
}
