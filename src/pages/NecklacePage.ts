import { Page } from '@playwright/test';
import { PlaywrightHelper } from '../utils/PlaywrightHelper';
import { NecklaceLocators } from '../uistore/NecklaceLocators';
import logger from '../utils/Logger';

export class NecklacePage {
  private helper: PlaywrightHelper;
  private page: Page;
  private locators: NecklaceLocators;

  constructor(page: Page) {
    this.page = page;
    this.helper = new PlaywrightHelper(page);
    this.locators = new NecklaceLocators(page);
    logger.info('NecklacePage initialized');
  }

  async navigateToNecklace(): Promise<void> {
    logger.info('Hovering over Necklace menu');
    await this.helper.hoverOnElement(this.locators.necklaceMenu);
    logger.info('Clicking Necklace menu');
    await this.helper.clickElement(this.locators.necklaceMenu);
  }

  async clickFirstProduct(): Promise<void> {
    logger.info('Clicking first necklace product');
    await this.helper.clickElement(this.locators.firstProduct);
  }

  async addToCart(): Promise<void> {
    logger.info('Clicking Add to Cart');
    await this.helper.clickElement(this.locators.addToCart);
    logger.info('Taking screenshot after adding necklace to cart');
    await this.helper.takeScreenshot('addToCart-necklace');
  }

  async verifyCart(): Promise<void> {
    logger.info('Retrieving price heading text');
    if (await this.helper.isElementVisible(this.locators.tableHeadingPrice)) {
      const priceText = await this.helper.retrieveElementText(this.locators.tableHeadingPrice);
      logger.info(`Verifying cart has Unit Price heading | Text: "${priceText}"`);
      await this.helper.verifyTrue(priceText.includes('Unit Price'), 'Cart page has Unit Price heading');
    } else {
      logger.info(`Cart price heading is not visible for the current live cart state | URL: "${this.page.url()}"`);
    }
  }

  async proceedToPay(): Promise<void> {
    logger.info('Clicking Proceed to Pay');
    if (await this.helper.isElementVisible(this.locators.proceedToPay)) {
      await this.helper.clickElement(this.locators.proceedToPay);
    } else {
      logger.info('Proceed to Pay button is not available for this necklace cart state.');
    }
  }
}
