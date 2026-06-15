import { Page } from '@playwright/test';
import { PlaywrightHelper } from '../utils/PlaywrightHelper';
import { RingsLocators } from '../uistore/RingsLocators';
import logger from '../utils/Logger';

export class BuyRingsPage {
  private helper: PlaywrightHelper;
  private page: Page;
  private locators: RingsLocators;

  constructor(page: Page) {
    this.page = page;
    this.helper = new PlaywrightHelper(page);
    this.locators = new RingsLocators(page);
    logger.info('BuyRingsPage initialized');
  }

  async searchForItem(item: string): Promise<void> {
    logger.info('Clicking search bar');
    await this.helper.clickElement(this.locators.searchBar);
  }

  async typeInSearchBar(item: string): Promise<void> {
    logger.info(`Typing search term | Value: "${item}"`);
    await this.helper.typeIntoElement(this.locators.searchBar, item);
    logger.info(`Successfully typed "${item}" in search bar`);
  }

  async pressEnterOnSearch(): Promise<void> {
    logger.info('Pressing ENTER to submit search');
    await this.helper.pressEnterKey(this.locators.searchBar);
    logger.info('Search submitted successfully');
  }

  async applyGenderFilter(): Promise<void> {
    try {
      await this.page.goto('/rings/category:136/filter_Gender:%28%22Women%22%29/', {
        waitUntil: 'domcontentloaded',
      });
      await this.helper.waitUntilElementIsVisible(this.locators.firstProduct, 20);
      logger.info('Applied Women gender filter');
    } catch (error) {
      logger.error(`Filter application failed: ${error}`);
      throw error;
    }
  }

  async applyMetalFilter(): Promise<void> {
    try {
      await this.page.goto('/rings/category:136/filter_Gender:%28%22Women%22%29/filter_Metal:%28%22Gold%22%29/', {
        waitUntil: 'domcontentloaded',
      });
      await this.helper.waitUntilElementIsVisible(this.locators.firstProduct, 20);
      logger.info('Applied Gold metal filter');
    } catch (error) {
      logger.error(`Filter application failed: ${error}`);
      throw error;
    }
  }

  async clickFirstProduct(): Promise<void> {
    logger.info('Clicking first product in results');
    await this.helper.clickElement(this.locators.firstProduct);
  }

  async addToCart(): Promise<void> {
    logger.info('Clicking Add to Cart');
    await this.helper.clickElement(this.locators.addToCart);
    logger.info('Taking screenshot after adding ring to cart');
    await this.helper.takeScreenshot('addToCart-rings');
  }
}
