import { Page } from '@playwright/test';
import { PlaywrightHelper } from '../utils/PlaywrightHelper';
import { RingsLocators } from '../uistore/RingsLocators';
import logger from '../utils/Logger';

export class BuyRingsPage {
  private helper: PlaywrightHelper;
  private page: Page;

  constructor(page: Page) {
    this.page = page;
    this.helper = new PlaywrightHelper(page);
    logger.info('BuyRingsPage initialized');
  }

  async searchForItem(item: string): Promise<void> {
    logger.info('========== searchForItem STARTED ==========');
    logger.info(`Clicking search bar | Selector: "${RingsLocators.searchBar}"`);
    await this.helper.clickElement(RingsLocators.searchBar);
    logger.info('========== searchForItem COMPLETED ==========');
  }

  async typeInSearchBar(item: string): Promise<void> {
    logger.info('========== typeInSearchBar STARTED ==========');
    logger.info(`Typing search term | Value: "${item}" | Selector: "${RingsLocators.searchBar}"`);
    await this.helper.typeIntoElement(RingsLocators.searchBar, item);
    logger.info(`Successfully typed "${item}" in search bar`);
    logger.info('========== typeInSearchBar COMPLETED ==========');
  }

  async pressEnterOnSearch(): Promise<void> {
    logger.info('========== pressEnterOnSearch STARTED ==========');
    logger.info(`Pressing ENTER to submit search | Selector: "${RingsLocators.searchBar}"`);
    await this.helper.pressEnterKey(RingsLocators.searchBar);
    logger.info('Search submitted successfully');
    logger.info('========== pressEnterOnSearch COMPLETED ==========');
  }

  async applyGenderFilter(): Promise<void> {
    logger.info('========== applyGenderFilter STARTED ==========');
    await this.page.goto('https://www.reliancejewels.com/rings/search:Rings/filter_Gender:%28%22Women%22%29/');
    logger.info('========== applyGenderFilter COMPLETED ==========');
  }

  async applyMetalFilter(): Promise<void> {
    logger.info('========== applyMetalFilter STARTED ==========');
    await this.page.goto('https://www.reliancejewels.com/rings/search:Rings/filter_Gender:%28%22Women%22%29/filter_Metal:%28%22Gold%22%29/');
    logger.info('========== applyMetalFilter COMPLETED ==========');
  }

  async clickFirstProduct(): Promise<void> {
    logger.info('========== clickFirstProduct STARTED ==========');
    logger.info(`Clicking first product in results | Selector: "${RingsLocators.firstProduct}"`);
    await this.helper.clickElement(RingsLocators.firstProduct);
    logger.info('========== clickFirstProduct COMPLETED ==========');
  }

  async addToCart(): Promise<void> {
    logger.info('========== addToCart STARTED ==========');
    logger.info(`Clicking Add to Cart | Selector: "${RingsLocators.addToCart}"`);
    await this.helper.clickElement(RingsLocators.addToCart);
    logger.info('Taking screenshot after adding ring to cart');
    await this.helper.takeScreenshot('addToCart-rings');
    logger.info('========== addToCart COMPLETED ==========');
  }
}
