import { Page } from '@playwright/test';
import { PlaywrightHelper } from '../utils/PlaywrightHelper';
import { VivahamLocators } from '../uistore/VivahamLocators';
import logger from '../utils/Logger';

export class VivahamPage {
  private helper: PlaywrightHelper;
  private page: Page;

  constructor(page: Page) {
    this.page = page;
    this.helper = new PlaywrightHelper(page);
    logger.info('VivahamPage initialized');
  }

  async navigateToVivaham(): Promise<void> {
    logger.info('========== navigateToVivaham STARTED ==========');
    logger.info(`Hovering over Vivaham menu | Selector: "${VivahamLocators.vivahamMenu}"`);
    await this.helper.hoverOnElement(VivahamLocators.vivahamMenu);
    logger.info(`Clicking Vivaham menu | Selector: "${VivahamLocators.vivahamMenu}"`);
    await this.helper.clickElement(VivahamLocators.vivahamMenu);
    logger.info('========== navigateToVivaham COMPLETED ==========');
  }

  async applyMetalFilter(): Promise<void> {
    logger.info('========== applyMetalFilter STARTED ==========');
    logger.info(`Waiting for Metal filter | Selector: "${VivahamLocators.metalFilter}"`);
    await this.helper.waitUntilElementIsVisible(VivahamLocators.metalFilter, 10);
    logger.info(`Clicking Metal filter | Selector: "${VivahamLocators.metalFilter}"`);
    await this.helper.clickElement(VivahamLocators.metalFilter);
    logger.info(`Clicking Gold option | Selector: "${VivahamLocators.goldOption}"`);
    await this.helper.clickElement(VivahamLocators.goldOption);
    logger.info('========== applyMetalFilter COMPLETED ==========');
  }

  async clickFirstProduct(): Promise<void> {
    logger.info('========== clickFirstProduct STARTED ==========');
    logger.info(`Clicking first Vivaham product | Selector: "${VivahamLocators.firstProduct}"`);
    await this.helper.clickElement(VivahamLocators.firstProduct);
    logger.info('========== clickFirstProduct COMPLETED ==========');
  }

  async addToCart(): Promise<void> {
    logger.info('========== addToCart STARTED ==========');
    logger.info(`Clicking Add to Cart | Selector: "${VivahamLocators.addToCart}"`);
    await this.helper.clickElement(VivahamLocators.addToCart);
    logger.info('Taking screenshot after adding Vivaham product to cart');
    await this.helper.takeScreenshot('addToCart-vivaham');
    logger.info('========== addToCart COMPLETED ==========');
  }

  async proceedToPay(): Promise<void> {
    logger.info('========== proceedToPay STARTED ==========');
    logger.info(`Clicking Proceed to Pay | Selector: "${VivahamLocators.proceedToPay}"`);
    await this.helper.clickElement(VivahamLocators.proceedToPay);
    logger.info('========== proceedToPay COMPLETED ==========');
  }
}
