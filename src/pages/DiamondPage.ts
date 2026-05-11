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
    logger.info(`Hovering over Diamonds menu | Selector: "${DiamondLocators.diamondMenu}"`);
    await this.helper.hoverOnElement(DiamondLocators.diamondMenu);
    logger.info(`Clicking Diamonds menu | Selector: "${DiamondLocators.diamondMenu}"`);
    await this.helper.clickElement(DiamondLocators.diamondMenu);
    logger.info('========== navigateToDiamond COMPLETED ==========');
  }

  async applyShapeFilter(): Promise<void> {
    logger.info('========== applyShapeFilter STARTED ==========');
    logger.info(`Waiting for Shape filter | Selector: "${DiamondLocators.shapeFilter}"`);
    await this.helper.waitUntilElementIsVisible(DiamondLocators.shapeFilter, 10);
    logger.info(`Clicking Shape filter | Selector: "${DiamondLocators.shapeFilter}"`);
    await this.helper.clickElement(DiamondLocators.shapeFilter);
    logger.info(`Clicking Round shape option | Selector: "${DiamondLocators.roundShape}"`);
    await this.helper.clickElement(DiamondLocators.roundShape);
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
    await this.helper.clickElement(DiamondLocators.proceedToPay);
    logger.info('========== proceedToPay COMPLETED ==========');
  }
}
