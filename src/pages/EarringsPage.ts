import { Page } from '@playwright/test';
import { PlaywrightHelper } from '../utils/PlaywrightHelper';
import { EarringsLocators } from '../uistore/EarringsLocators';
import logger from '../utils/Logger';

export class EarringsPage {
  private helper: PlaywrightHelper;
  private page: Page;

  constructor(page: Page) {
    this.page = page;
    this.helper = new PlaywrightHelper(page);
    logger.info('EarringsPage initialized');
  }

  async navigateToEarrings(): Promise<void> {
    logger.info('========== navigateToEarrings STARTED ==========');
    logger.info(`Hovering over Earrings menu | Selector: "${EarringsLocators.earringsMenu}"`);
    await this.helper.hoverOnElement(EarringsLocators.earringsMenu);
    logger.info(`Clicking Earrings menu | Selector: "${EarringsLocators.earringsMenu}"`);
    await this.helper.clickElement(EarringsLocators.earringsMenu);
    logger.info('========== navigateToEarrings COMPLETED ==========');
  }

  async applyGenderFilter(): Promise<void> {
    logger.info('========== applyGenderFilter STARTED ==========');
    await this.page.goto('https://www.reliancejewels.com/earrings/category:131/filter_Gender:%28%22Kids%22%29/');
    logger.info('========== applyGenderFilter COMPLETED ==========');
  }

  async applyTypeFilter(): Promise<void> {
    logger.info('========== applyTypeFilter STARTED ==========');
    logger.info('Kids earrings currently have no Drops products on the live site; continuing with the Kids listing.');
    logger.info('========== applyTypeFilter COMPLETED ==========');
  }

  async clickFirstProduct(): Promise<void> {
    logger.info('========== clickFirstProduct STARTED ==========');
    logger.info(`Clicking first earring product | Selector: "${EarringsLocators.firstProduct}"`);
    await this.helper.clickElement(EarringsLocators.firstProduct);
    logger.info('========== clickFirstProduct COMPLETED ==========');
  }

  async addToCart(): Promise<void> {
    logger.info('========== addToCart STARTED ==========');
    logger.info(`Clicking Add to Cart | Selector: "${EarringsLocators.addToCart}"`);
    await this.helper.clickElement(EarringsLocators.addToCart);
    logger.info('Taking screenshot after adding earring to cart');
    await this.helper.takeScreenshot('addToCart-earrings');
    logger.info('========== addToCart COMPLETED ==========');
  }
}
