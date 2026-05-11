import { Page } from '@playwright/test';
import { PlaywrightHelper } from '../utils/PlaywrightHelper';
import { ChainLocators } from '../uistore/ChainLocators';
import logger from '../utils/Logger';

export class ChainPage {
  private helper: PlaywrightHelper;
  private page: Page;

  constructor(page: Page) {
    this.page = page;
    this.helper = new PlaywrightHelper(page);
    logger.info('ChainPage initialized');
  }

  async navigateToChain(): Promise<void> {
    logger.info('========== navigateToChain STARTED ==========');
    logger.info(`Hovering over Chains menu | Selector: "${ChainLocators.chainMenu}"`);
    await this.helper.hoverOnElement(ChainLocators.chainMenu);
    logger.info(`Clicking Chains menu | Selector: "${ChainLocators.chainMenu}"`);
    await this.helper.clickElement(ChainLocators.chainMenu);
    logger.info('========== navigateToChain COMPLETED ==========');
  }

  async applyGoldFilter(): Promise<void> {
    logger.info('========== applyGoldFilter STARTED ==========');
    logger.info(`Waiting for Gold filter | Selector: "${ChainLocators.goldFilter}"`);
    await this.helper.waitUntilElementIsVisible(ChainLocators.goldFilter, 10);
    logger.info(`Clicking Gold filter | Selector: "${ChainLocators.goldFilter}"`);
    await this.helper.clickElement(ChainLocators.goldFilter);
    logger.info('========== applyGoldFilter COMPLETED ==========');
  }

  async clickFirstProduct(): Promise<void> {
    logger.info('========== clickFirstProduct STARTED ==========');
    logger.info(`Clicking first chain product | Selector: "${ChainLocators.firstProduct}"`);
    await this.helper.clickElement(ChainLocators.firstProduct);
    logger.info('========== clickFirstProduct COMPLETED ==========');
  }

  async addToCart(): Promise<void> {
    logger.info('========== addToCart STARTED ==========');
    logger.info(`Clicking Add to Cart | Selector: "${ChainLocators.addToCart}"`);
    await this.helper.clickElement(ChainLocators.addToCart);
    logger.info('Taking screenshot after adding chain to cart');
    await this.helper.takeScreenshot('addToCart-chain');
    logger.info('========== addToCart COMPLETED ==========');
  }

  async proceedToPay(): Promise<void> {
    logger.info('========== proceedToPay STARTED ==========');
    logger.info(`Clicking Proceed to Pay | Selector: "${ChainLocators.proceedToPay}"`);
    await this.helper.clickElement(ChainLocators.proceedToPay);
    logger.info('========== proceedToPay COMPLETED ==========');
  }
}
