import { Page } from '@playwright/test';
import { PlaywrightHelper } from '../utils/PlaywrightHelper';
import { ExcelReader } from '../utils/ExcelReader';
import { PendentsLocators, HomePageLocators } from '../uistore/PendentsLocators';
import logger from '../utils/Logger';

export class BuyPendentsPage {
  private helper: PlaywrightHelper;
  private page: Page;

  constructor(page: Page) {
    this.page = page;
    this.helper = new PlaywrightHelper(page);
    logger.info('BuyPendentsPage initialized');
  }

  async hoverOverPendents(): Promise<void> {
    logger.info('========== hoverOverPendents STARTED ==========');
    logger.info(`Hovering over PENDANTS menu | Selector: "${HomePageLocators.pendent}"`);
    await this.helper.hoverOnElement(HomePageLocators.pendent);
    logger.info(`Clicking on Gifting category | Selector: "${HomePageLocators.gift}"`);
    await this.helper.clickElement(HomePageLocators.gift);
    const data = await ExcelReader.readCellValue('RingsAndPendant', '4', 'Items');
    logger.info(`Excel data fetched for URL verification | Expected keyword: "${data}"`);
    const url = this.helper.getCurrentUrl();
    const description = await ExcelReader.readCellValue('RingsAndPendant', '4', 'Description');
    logger.info(`Verifying URL contains keyword | URL: "${url}" | Keyword: "${data.toLowerCase()}"`);
    await this.helper.verifyTrue(url.includes(data.toLowerCase()), description);
    logger.info('========== hoverOverPendents COMPLETED ==========');
  }

  async genderFilter(): Promise<void> {
    logger.info('========== genderFilter STARTED ==========');
    logger.info(`Clicking Gender filter | Selector: "${PendentsLocators.Gender}"`);
    await this.helper.clickElement(PendentsLocators.Gender);
    logger.info(`Waiting for Kids filter to appear | Selector: "${PendentsLocators.kids}"`);
    await this.helper.waitUntilElementIsVisible(PendentsLocators.kids, 10);
    logger.info(`Clicking Kids filter | Selector: "${PendentsLocators.kids}"`);
    await this.helper.clickElement(PendentsLocators.kids);
    const title = await this.helper.getPageTitle();
    const actual = await ExcelReader.readCellValue('RingsAndPendant', '5', 'Actual');
    const description = await ExcelReader.readCellValue('RingsAndPendant', '5', 'Description');
    logger.info(`Verifying page title | Actual: "${title}" | Expected: "${actual}"`);
    await this.helper.verifyEquals(title, actual, description);
    logger.info('========== genderFilter COMPLETED ==========');
  }

  async moreFilter(): Promise<void> {
    logger.info('========== moreFilter STARTED ==========');
    logger.info(`Clicking More filter button | Selector: "${PendentsLocators.moreFilter}"`);
    await this.helper.clickElement(PendentsLocators.moreFilter);
    logger.info(`Clicking Type filter | Selector: "${PendentsLocators.type}"`);
    await this.helper.clickElement(PendentsLocators.type);
    logger.info(`Waiting for Pendant option inside Type filter | Selector: "${PendentsLocators.pendentInsideType}"`);
    await this.helper.waitUntilElementIsVisible(PendentsLocators.pendentInsideType, 10);
    logger.info(`Clicking Pendant option inside Type | Selector: "${PendentsLocators.pendentInsideType}"`);
    await this.helper.clickElement(PendentsLocators.pendentInsideType);
    logger.info('========== moreFilter COMPLETED ==========');
  }

  async firstProductClick(): Promise<void> {
    logger.info('========== firstProductClick STARTED ==========');
    const title = await this.helper.getPageTitle();
    const actual = await ExcelReader.readCellValue('RingsAndPendant', '6', 'Actual');
    const description = await ExcelReader.readCellValue('RingsAndPendant', '6', 'Description');
    logger.info(`Verifying page title before clicking product | Actual: "${title}" | Expected: "${actual}"`);
    await this.helper.verifyEquals(title, actual, description);
    logger.info(`Clicking first product on pendents page | Selector: "${PendentsLocators.firstProductOnPendent}"`);
    await this.helper.clickElement(PendentsLocators.firstProductOnPendent);
    logger.info('========== firstProductClick COMPLETED ==========');
  }

  async addToCart(): Promise<void> {
    logger.info('========== addToCart STARTED ==========');
    logger.info(`Clicking Add to Cart button | Selector: "${PendentsLocators.AddtoCart}"`);
    await this.helper.clickElement(PendentsLocators.AddtoCart);
    logger.info('Taking screenshot after adding to cart');
    await this.helper.takeScreenshot('addToCart-pendents');
    logger.info('========== addToCart COMPLETED ==========');
  }

  async proceedToPay(): Promise<void> {
    logger.info('========== proceedToPay STARTED ==========');
    const keyword = await ExcelReader.readCellValue('RingsAndPendant', '7', 'actual');
    logger.info(`Excel keyword for price verification: "${keyword}"`);
    const priceText = await this.helper.retrieveElementText(PendentsLocators.tableHeadingPrice);
    const description = await ExcelReader.readCellValue('RingsAndPendant', '7', 'Description');
    logger.info(`Verifying price heading | Text: "${priceText}" | Keyword: "${keyword}"`);
    await this.helper.verifyTrue(priceText.includes(keyword), description);
    logger.info(`Clicking Proceed to Pay | Selector: "${PendentsLocators.proceedToPay}"`);
    await this.helper.clickElement(PendentsLocators.proceedToPay);
    logger.info('========== proceedToPay COMPLETED ==========');
  }
}
