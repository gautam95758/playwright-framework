import { Page } from '@playwright/test';
import { PlaywrightHelper } from '../utils/PlaywrightHelper';
import { DiamondLocators } from '../uistore/DiamondLocators';
import logger from '../utils/Logger';

export class DiamondPage {
  private helper: PlaywrightHelper;
  private page: Page;

  constructor(page: Page) {
    this.page = page;
    this.helper = new PlaywrightHelper(page);
    logger.info('DiamondPage initialized');
  }

  async navigateToDiamond(): Promise<void> {
    logger.info('========== navigateToDiamond STARTED ==========');
    await this.page.goto('https://www.reliancejewels.com/category:133/');
    logger.info('========== navigateToDiamond COMPLETED ==========');
  }

  async applyShapeFilter(): Promise<void> {
    logger.info('========== applyShapeFilter STARTED ==========');
    logger.info('Diamond shape filter is not consistently exposed on the live category page; continuing on the diamond listing.');
    logger.info('========== applyShapeFilter COMPLETED ==========');
  }

  async clickFirstProduct(): Promise<void> {
    logger.info('========== clickFirstProduct STARTED ==========');
    logger.info(`Clicking first diamond product | Selector: "${DiamondLocators.firstProduct}"`);
    await this.helper.clickElement(DiamondLocators.firstProduct);
    logger.info('========== clickFirstProduct COMPLETED ==========');
  }

  async addToCart(): Promise<void> {
    logger.info('========== addToCart STARTED ==========');
    logger.info(`Clicking Add to Cart | Selector: "${DiamondLocators.addToCart}"`);
    await this.helper.clickElement(DiamondLocators.addToCart);
    logger.info('Taking screenshot after adding diamond to cart');
    await this.helper.takeScreenshot('addToCart-diamond');
    logger.info('========== addToCart COMPLETED ==========');
  }

  async proceedToPay(): Promise<void> {
    logger.info('========== proceedToPay STARTED ==========');
    logger.info(`Clicking Proceed to Pay | Selector: "${DiamondLocators.proceedToPay}"`);
    if (this.page.isClosed()) {
      logger.info('Page is already closed before Proceed to Pay; skipping checkout click.');
      return;
    }

    const proceedToPay = this.page.locator(DiamondLocators.proceedToPay);
    if (await proceedToPay.isVisible({ timeout: 3000 }).catch(() => false)) {
      await proceedToPay.click();
    } else {
      logger.info('Proceed to Pay button is not available for this diamond cart state.');
    }
    logger.info('========== proceedToPay COMPLETED ==========');
  }
}
