import { Page } from '@playwright/test';
import { PlaywrightHelper } from '../utils/PlaywrightHelper';
import { PlatinumRingLocators } from '../uistore/PlatinumRingLocators';
import logger from '../utils/Logger';

export class PlatinumRingPage {
  private helper: PlaywrightHelper;
  private page: Page;

  constructor(page: Page) {
    this.page = page;
    this.helper = new PlaywrightHelper(page);
    logger.info('PlatinumRingPage initialized');
  }

  async navigateToRings(): Promise<void> {
    logger.info('========== navigateToRings STARTED ==========');
    logger.info(`Hovering over Rings menu | Selector: "${PlatinumRingLocators.ringsMenu}"`);
    await this.helper.hoverOnElement(PlatinumRingLocators.ringsMenu);
    logger.info(`Clicking Rings menu | Selector: "${PlatinumRingLocators.ringsMenu}"`);
    await this.helper.clickElement(PlatinumRingLocators.ringsMenu);
    logger.info('========== navigateToRings COMPLETED ==========');
  }

  async applyPlatinumFilter(): Promise<void> {
    logger.info('========== applyPlatinumFilter STARTED ==========');
    logger.info(`Waiting for Metal filter | Selector: "${PlatinumRingLocators.metalFilter}"`);
    await this.helper.waitUntilElementIsVisible(PlatinumRingLocators.metalFilter, 10);
    logger.info(`Clicking Metal filter | Selector: "${PlatinumRingLocators.metalFilter}"`);
    await this.helper.clickElement(PlatinumRingLocators.metalFilter);
    logger.info(`Clicking Platinum option | Selector: "${PlatinumRingLocators.platinumOption}"`);
    await this.helper.clickElement(PlatinumRingLocators.platinumOption);
    logger.info('========== applyPlatinumFilter COMPLETED ==========');
  }

  async clickFirstProduct(): Promise<void> {
    logger.info('========== clickFirstProduct STARTED ==========');
    logger.info(`Clicking first platinum ring | Selector: "${PlatinumRingLocators.firstProduct}"`);
    await this.helper.clickElement(PlatinumRingLocators.firstProduct);
    logger.info('========== clickFirstProduct COMPLETED ==========');
  }

  async addToCart(): Promise<void> {
    logger.info('========== addToCart STARTED ==========');
    logger.info(`Clicking Add to Cart | Selector: "${PlatinumRingLocators.addToCart}"`);
    await this.helper.clickElement(PlatinumRingLocators.addToCart);
    logger.info('Taking screenshot after adding platinum ring to cart');
    await this.helper.takeScreenshot('addToCart-platinum');
    logger.info('========== addToCart COMPLETED ==========');
  }

  async proceedToPay(): Promise<void> {
    logger.info('========== proceedToPay STARTED ==========');
    logger.info(`Clicking Proceed to Pay | Selector: "${PlatinumRingLocators.proceedToPay}"`);
    await this.helper.clickElement(PlatinumRingLocators.proceedToPay);
    logger.info('========== proceedToPay COMPLETED ==========');
  }
}
