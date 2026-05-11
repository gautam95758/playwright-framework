import { Page } from '@playwright/test';
import { PlaywrightHelper } from '../utils/PlaywrightHelper';
import { NecklaceLocators } from '../uistore/NecklaceLocators';
import logger from '../utils/Logger';

export class NecklacePage {
  private helper: PlaywrightHelper;
  private page: Page;

  constructor(page: Page) {
    this.page = page;
    this.helper = new PlaywrightHelper(page);
    logger.info('NecklacePage initialized');
  }

  async navigateToNecklace(): Promise<void> {
    logger.info('========== navigateToNecklace STARTED ==========');
    logger.info(`Hovering over Necklace menu | Selector: "${NecklaceLocators.necklaceMenu}"`);
    await this.helper.hoverOnElement(NecklaceLocators.necklaceMenu);
    logger.info(`Clicking Necklace menu | Selector: "${NecklaceLocators.necklaceMenu}"`);
    await this.helper.clickElement(NecklaceLocators.necklaceMenu);
    logger.info('========== navigateToNecklace COMPLETED ==========');
  }

  async clickFirstProduct(): Promise<void> {
    logger.info('========== clickFirstProduct STARTED ==========');
    logger.info(`Clicking first necklace product | Selector: "${NecklaceLocators.firstProduct}"`);
    await this.helper.clickElement(NecklaceLocators.firstProduct);
    logger.info('========== clickFirstProduct COMPLETED ==========');
  }

  async addToCart(): Promise<void> {
    logger.info('========== addToCart STARTED ==========');
    logger.info(`Clicking Add to Cart | Selector: "${NecklaceLocators.addToCart}"`);
    await this.helper.clickElement(NecklaceLocators.addToCart);
    logger.info('Taking screenshot after adding necklace to cart');
    await this.helper.takeScreenshot('addToCart-necklace');
    logger.info('========== addToCart COMPLETED ==========');
  }

  async verifyCart(): Promise<void> {
    logger.info('========== verifyCart STARTED ==========');
    logger.info(`Clicking My Cart | Selector: "${NecklaceLocators.myCart}"`);
    await this.helper.clickElement(NecklaceLocators.myCart);
    logger.info(`Retrieving price heading text | Selector: "${NecklaceLocators.tableHeadingPrice}"`);
    const priceText = await this.helper.retrieveElementText(NecklaceLocators.tableHeadingPrice);
    logger.info(`Verifying cart has Unit Price heading | Text: "${priceText}"`);
    await this.helper.verifyTrue(priceText.includes('Unit Price'), 'Cart page has Unit Price heading');
    logger.info('========== verifyCart COMPLETED ==========');
  }

  async proceedToPay(): Promise<void> {
    logger.info('========== proceedToPay STARTED ==========');
    logger.info(`Clicking Proceed to Pay | Selector: "${NecklaceLocators.proceedToPay}"`);
    await this.helper.clickElement(NecklaceLocators.proceedToPay);
    logger.info('========== proceedToPay COMPLETED ==========');
  }
}
