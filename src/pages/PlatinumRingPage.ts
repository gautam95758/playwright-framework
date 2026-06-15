import { Page } from '@playwright/test';
import { PlaywrightHelper } from '../utils/PlaywrightHelper';
import { PlatinumRingLocators } from '../uistore/PlatinumRingLocators';
import logger from '../utils/Logger';

export class PlatinumRingPage {
  private helper: PlaywrightHelper;
  private page: Page;
  private locators: PlatinumRingLocators;

  constructor(page: Page) {
    this.page = page;
    this.helper = new PlaywrightHelper(page);
    this.locators = new PlatinumRingLocators(page);
    logger.info('PlatinumRingPage initialized');
  }

  async navigateToRings(): Promise<void> {
    logger.info('Hovering over Rings menu');
    await this.helper.hoverOnElement(this.locators.ringsMenu);
    logger.info('Clicking Rings menu');
    await this.helper.clickElement(this.locators.ringsMenu);
  }

  async applyPlatinumFilter(): Promise<void> {
    try {
      await this.page.goto('/rings/category:136/filter_Metal:%28%22Platinum%22%29/', {
        waitUntil: 'domcontentloaded',
      });
      await this.helper.waitUntilElementIsVisible(this.locators.firstProduct, 20);
      logger.info('Applied Platinum metal filter');
    } catch (error) {
      logger.error(`Filter application failed: ${error}`);
      throw error;
    }
  }

  async clickFirstProduct(): Promise<void> {
    logger.info('Clicking first platinum ring');
    await this.helper.clickElement(this.locators.firstProduct);
  }

  async addToCart(): Promise<void> {
    logger.info('Clicking Add to Cart');
    await this.helper.clickElement(this.locators.addToCart);
    logger.info('Taking screenshot after adding platinum ring to cart');
    await this.helper.takeScreenshot('addToCart-platinum');
  }

  async proceedToPay(): Promise<void> {
    logger.info('Clicking Proceed to Pay');
    if (await this.helper.isElementVisible(this.locators.proceedToPay)) {
      await this.helper.clickElement(this.locators.proceedToPay);
    } else {
    }
  }
}
