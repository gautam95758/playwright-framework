import { Page } from '@playwright/test';
import { PlaywrightHelper } from '../utils/PlaywrightHelper';
import { ChainLocators } from '../uistore/ChainLocators';
import logger from '../utils/Logger';

export class ChainPage {
  private helper: PlaywrightHelper;
  private page: Page;
  private locators: ChainLocators;

  constructor(page: Page) {
    this.page = page;
    this.helper = new PlaywrightHelper(page);
    this.locators = new ChainLocators(page);
    logger.info('ChainPage initialized');
  }

  async navigateToChain(): Promise<void> {
    logger.info('Hovering over Chains menu');
    await this.helper.hoverOnElement(this.locators.chainMenu);
    logger.info('Clicking Chains menu');
    await this.helper.clickElement(this.locators.chainMenu);
  }

  async applyGoldFilter(): Promise<void> {
    try {
      await this.page.goto('/chain/category:146/filter_Metal:%28%22Gold%22%29/', {
        waitUntil: 'domcontentloaded',
      });
      await this.helper.waitUntilElementIsVisible(this.locators.firstProduct, 20);
      logger.info('Applied Gold filter');
    } catch (error) {
      logger.error(`Filter application failed: ${error}`);
      throw error;
    }
  }

  async clickFirstProduct(): Promise<void> {
    logger.info('Clicking first chain product');
    await this.helper.clickElement(this.locators.firstProduct);
  }

  async addToCart(): Promise<void> {
    logger.info('Clicking Add to Cart');
    await this.helper.clickElement(this.locators.addToCart);
    logger.info('Taking screenshot after adding chain to cart');
    await this.helper.takeScreenshot('addToCart-chain');
  }

  async proceedToPay(): Promise<void> {
    logger.info('Clicking Proceed to Pay');
    const proceedToPay = this.locators.proceedToPay;
    if (await this.helper.isElementVisible(proceedToPay)) {
      await this.helper.clickElement(proceedToPay);
    } else {
    }
  }
}
