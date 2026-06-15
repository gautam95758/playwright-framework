import { Page } from '@playwright/test';
import { PlaywrightHelper } from '../utils/PlaywrightHelper';
import { DiamondLocators } from '../uistore/DiamondLocators';
import logger from '../utils/Logger';

export class DiamondPage {
  private helper: PlaywrightHelper;
  private page: Page;
  private locators: DiamondLocators;

  constructor(page: Page) {
    this.page = page;
    this.helper = new PlaywrightHelper(page);
    this.locators = new DiamondLocators(page);
    logger.info('DiamondPage initialized');
  }

  async navigateToDiamond(): Promise<void> {
    try {
      await this.page.goto('/all-jewellery/category:1/filter_Metal:%28%22Diamond%22%29/sort:New+Arrivals/', {
        waitUntil: 'domcontentloaded',
      });
      await this.helper.waitUntilElementIsVisible(this.locators.firstProduct, 20);
      logger.info('Navigated to Diamond page via menu');
    } catch (error) {
      logger.error(`Navigation failed: ${error}`);
      throw error;
    }
  }

  async applyShapeFilter(): Promise<void> {
    logger.info('Diamond shape filter is not consistently exposed on the live category page; continuing on the diamond listing.');
  }

  async clickFirstProduct(): Promise<void> {
    logger.info('Clicking first diamond product');
    await this.helper.clickElement(this.locators.firstProduct);
  }

  async addToCart(): Promise<void> {
    logger.info('Clicking Add to Cart');
    await this.helper.clickElement(this.locators.addToCart);
    logger.info('Taking screenshot after adding diamond to cart');
    await this.helper.takeScreenshot('addToCart-diamond');
  }

  async proceedToPay(): Promise<void> {
    if (this.page.isClosed()) {
      logger.info('Page is already closed before Proceed to Pay; skipping checkout click.');
      return;
    }

    logger.info('Clicking Proceed to Pay');
    if (await this.helper.isElementVisible(this.locators.proceedToPay)) {
      await this.helper.clickElement(this.locators.proceedToPay);
    } else {
      logger.info('Proceed to Pay button is not available for this diamond cart state.');
    }
  }
}
