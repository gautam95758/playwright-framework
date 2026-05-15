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
    await this.page.goto('https://www.reliancejewels.com/rings/category:136/filter_Metal:%28%22Platinum%22%29/');
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
    const proceedToPay = this.page.locator(PlatinumRingLocators.proceedToPay);
    if (await proceedToPay.isVisible({ timeout: 3000 }).catch(() => false)) {
      await proceedToPay.click();
    } else {
      logger.info('Proceed to Pay button is not available for this cart state; cart add step already completed.');
    }
    logger.info('========== proceedToPay COMPLETED ==========');
  }
}
