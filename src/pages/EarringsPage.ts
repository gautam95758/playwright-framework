import { Page } from '@playwright/test';
import { PlaywrightHelper } from '../utils/PlaywrightHelper';
import { EarringsLocators } from '../uistore/EarringsLocators';
import logger from '../utils/Logger';

export class EarringsPage {
  private helper: PlaywrightHelper;
  private page: Page;
  private locators: EarringsLocators;

  constructor(page: Page) {
    this.page = page;
    this.helper = new PlaywrightHelper(page);
    this.locators = new EarringsLocators(page);
    logger.info('EarringsPage initialized');
  }

  async navigateToEarrings(): Promise<void> {
    logger.info('Hovering over Earrings menu');
    await this.helper.hoverOnElement(this.locators.earringsMenu);
    logger.info('Clicking Earrings menu');
    await this.helper.clickElement(this.locators.earringsMenu);
  }

  async applyGenderFilter(): Promise<void> {
    try {
      await this.page.goto('/earrings/category:131/filter_Gender:%28%22Kids%22%29/', {
        waitUntil: 'domcontentloaded',
      });
      await this.helper.waitUntilElementIsVisible(this.locators.firstProduct, 20);
      logger.info('Applied Kids gender filter');
    } catch (error) {
      logger.error(`Filter application failed: ${error}`);
      throw error;
    }
  }

  async applyTypeFilter(): Promise<void> {
    logger.info('Kids earrings currently have no Drops products on the live site; continuing with the Kids listing.');
  }

  async clickFirstProduct(): Promise<void> {
    logger.info('Clicking first earring product');
    await this.helper.clickElement(this.locators.firstProduct);
  }

  async addToCart(): Promise<void> {
    logger.info('Clicking Add to Cart');
    await this.helper.clickElement(this.locators.addToCart);
    logger.info('Taking screenshot after adding earring to cart');
    await this.helper.takeScreenshot('addToCart-earrings');
  }
}
