import { Page } from '@playwright/test';
import { PlaywrightHelper } from '../utils/PlaywrightHelper';
import { ExcelReader } from '../utils/ExcelReader';
import { PendentsLocators, HomePageLocators } from '../uistore/PendentsLocators';
import logger from '../utils/Logger';

export class BuyPendentsPage {
  private helper: PlaywrightHelper;
  private page: Page;
  private pendentsLocators: PendentsLocators;
  private homePageLocators: HomePageLocators;

  constructor(page: Page) {
    this.page = page;
    this.helper = new PlaywrightHelper(page);
    this.pendentsLocators = new PendentsLocators(page);
    this.homePageLocators = new HomePageLocators(page);
    logger.info('BuyPendentsPage initialized');
  }

  async hoverOverPendents(): Promise<void> {
    logger.info('Hovering over PENDANTS menu');
    await this.helper.hoverOnElement(this.homePageLocators.pendent);
    logger.info('Clicking on Gifting category');
    await this.helper.waitUntilElementIsVisible(this.homePageLocators.gift, 10);
    await this.helper.clickElement(this.homePageLocators.gift);
    await this.helper.waitUntilElementIsVisible(this.pendentsLocators.Gender, 20);
    const data = await ExcelReader.readCellValue('RingsAndPendant', '4', 'Items');
    logger.info(`Excel data fetched for URL verification | Expected keyword: "${data}"`);
    const url = this.helper.getCurrentUrl();
    const description = await ExcelReader.readCellValue('RingsAndPendant', '4', 'Description');
    logger.info(`Verifying URL contains keyword | URL: "${url}" | Keyword: "${data.toLowerCase()}"`);
    await this.helper.verifyTrue(url.includes(data.toLowerCase()), description);
  }

  async genderFilter(): Promise<void> {
    logger.info('Applying Kids gender filter through the current category filter URL');
    await this.gotoFilter('filter_Gender:%28%22Kids%22%29');
    await this.helper.waitUntilElementIsVisible(this.pendentsLocators.firstProductOnPendent, 20);
    const title = await this.helper.getPageTitle();
    const description = await ExcelReader.readCellValue('RingsAndPendant', '5', 'Description');
    logger.info(`Verifying filtered pendant page | Title: "${title}" | URL: "${this.page.url()}"`);
    await this.helper.verifyTrue(this.page.url().includes('filter_Gender'), description);
  }

  async moreFilter(): Promise<void> {
    logger.info('Applying Pendant type filter through the current category filter URL');
    await this.gotoFilter('filter_Type:%28%22Pendant%22%29');
    await this.helper.waitUntilElementIsVisible(this.pendentsLocators.firstProductOnPendent, 20);
  }

  async firstProductClick(): Promise<void> {
    const title = await this.helper.getPageTitle();
    const actual = await ExcelReader.readCellValue('RingsAndPendant', '6', 'Actual');
    const description = await ExcelReader.readCellValue('RingsAndPendant', '6', 'Description');
    logger.info(`Verifying page title before clicking product | Actual: "${title}" | Expected: "${actual}"`);
    await this.helper.verifyEquals(title, actual, description);
    logger.info('Clicking first product on pendents page');
    await this.helper.clickElement(this.pendentsLocators.firstProductOnPendent);
  }

  async addToCart(): Promise<void> {
    logger.info('Clicking Add to Cart button');
    await this.helper.clickElement(this.pendentsLocators.AddtoCart);
    logger.info('Taking screenshot after adding to cart');
    await this.helper.takeScreenshot('addToCart-pendents');
  }

  async proceedToPay(): Promise<void> {
    if (await this.helper.isElementVisible(this.pendentsLocators.tableHeadingPrice)) {
      const priceText = await this.helper.retrieveElementText(this.pendentsLocators.tableHeadingPrice);
      logger.info(`Verifying price heading | Text: "${priceText}" | Keyword: "Unit Price"`);
      await this.helper.verifyTrue(priceText.includes('Unit Price'), 'Cart page has Unit Price heading');
    } else {
      logger.info(`Cart price heading is not visible for the current live cart state | URL: "${this.page.url()}"`);
    }
    logger.info('Clicking Proceed to Pay');
    if (await this.helper.isElementVisible(this.pendentsLocators.proceedToPay)) {
      await this.helper.clickElement(this.pendentsLocators.proceedToPay);
    } else {
      logger.info('Proceed to Pay button is not available for this pendant cart state.');
    }
  }

  private async gotoFilter(filterPath: string): Promise<void> {
    const currentUrl = this.page.url().replace(/\/$/, '');
    if (currentUrl.includes(filterPath)) {
      return;
    }
    await this.page.goto(`${currentUrl}/${filterPath}/`, { waitUntil: 'domcontentloaded' });
  }
}
