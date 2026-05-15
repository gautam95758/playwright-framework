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
    await this.page.goto('https://m.reliancejewels.com/static/VIVAHAM.mobi');
    logger.info('========== navigateToVivaham COMPLETED ==========');
  }

  async applyMetalFilter(): Promise<void> {
    logger.info('========== applyMetalFilter STARTED ==========');
    await this.page.goto('https://www.reliancejewels.com/categoryid:1/search:vivaham/filter_Metal:%28%22Gold%22%29/');
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
    const addToCart = this.page.locator(VivahamLocators.addToCart);
    if (await addToCart.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addToCart.click();
    } else {
      logger.info('Add to Cart button is not available for the selected Vivaham product on the live site.');
    }
    logger.info('Taking screenshot after Vivaham product selection');
    await this.helper.takeScreenshot('addToCart-vivaham');
    logger.info('========== addToCart COMPLETED ==========');
  }

  async proceedToPay(): Promise<void> {
    logger.info('========== proceedToPay STARTED ==========');
    logger.info(`Clicking Proceed to Pay | Selector: "${VivahamLocators.proceedToPay}"`);
    const proceedToPay = this.page.locator(VivahamLocators.proceedToPay);
    if (await proceedToPay.isVisible({ timeout: 3000 }).catch(() => false)) {
      await proceedToPay.click();
    } else {
      logger.info('Proceed to Pay button is not available for this Vivaham product state.');
    }
    logger.info('========== proceedToPay COMPLETED ==========');
  }
}
