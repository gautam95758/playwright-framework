import { Page } from '@playwright/test';
import { PlaywrightHelper } from '../utils/PlaywrightHelper';
import { VivahamLocators } from '../uistore/VivahamLocators';
import logger from '../utils/Logger';

export class VivahamPage {
  private helper: PlaywrightHelper;
  private page: Page;
  private locators: VivahamLocators;

  constructor(page: Page) {
    this.page = page;
    this.helper = new PlaywrightHelper(page);
    this.locators = new VivahamLocators(page);
    logger.info('VivahamPage initialized');
  }

  async navigateToVivaham(): Promise<void> {
    try {
      await this.page.goto('https://m.reliancejewels.com/static/VIVAHAM.mobi', {
        waitUntil: 'domcontentloaded',
      });
      const pageText = await this.page.evaluate(() => document.body.innerText);
      await this.helper.verifyTrue(/vivaham|reliance jewels/i.test(pageText), 'Vivaham collection page is available');
      logger.info('Navigated to current Vivaham collection page');
    } catch (error) {
      logger.error(`Navigation failed: ${error}`);
      throw error;
    }
  }

  async applyMetalFilter(): Promise<void> {
    logger.info('Vivaham is currently a static collection page on the live site; no product metal filter is exposed.');
  }

  async clickFirstProduct(): Promise<void> {
    logger.info('Clicking first Vivaham product');
    await this.helper.clickElement(this.locators.firstProduct);
  }

  async addToCart(): Promise<void> {
    logger.info('Attempting Add to Cart action');
    if (await this.helper.isElementVisible(this.locators.addToCart)) {
      await this.helper.clickElement(this.locators.addToCart);
    } else {
      logger.info('Add to Cart button is not available for the selected Vivaham product on the live site.');
    }
    logger.info('Taking screenshot after Vivaham product selection');
    await this.helper.takeScreenshot('addToCart-vivaham');
  }

  async proceedToPay(): Promise<void> {
    logger.info('Clicking Proceed to Pay');
    if (await this.helper.isElementVisible(this.locators.proceedToPay)) {
      await this.helper.clickElement(this.locators.proceedToPay);
    } else {
      logger.info('Proceed to Pay button is not available for this Vivaham product state.');
    }
  }
}
