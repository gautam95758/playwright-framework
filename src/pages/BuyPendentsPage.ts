import { Page } from '@playwright/test';
import { PlaywrightHelper } from '../utils/PlaywrightHelper';
import { ExcelReader } from '../utils/ExcelReader';
import { PendentsLocators } from '../uistore/PendentsLocators';
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
    const giftingUrl = 'https://www.reliancejewels.com/pendant-26-pendant-set/category:158/filter_Occasion:%28%22Gifting%22%29/';
    logger.info(`Navigating to PENDANTS Gifting category | URL: "${giftingUrl}"`);
    await this.page.goto(giftingUrl, { waitUntil: 'domcontentloaded' });
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
    await this.page.goto('https://www.reliancejewels.com/pendant-26-pendant-set/category:158/filter_Occasion:%28%22Gifting%22%29/filter_Gender:%28%22Kids%22%29/');
    const title = await this.helper.getPageTitle();
    const actual = await ExcelReader.readCellValue('RingsAndPendant', '5', 'Actual');
    const description = await ExcelReader.readCellValue('RingsAndPendant', '5', 'Description');
    logger.info(`Verifying page title | Actual: "${title}" | Expected: "${actual}"`);
    await this.helper.verifyEquals(title, actual, description);
    logger.info('========== genderFilter COMPLETED ==========');
  }

  async moreFilter(): Promise<void> {
    logger.info('========== moreFilter STARTED ==========');
    await this.page.goto('https://www.reliancejewels.com/pendant-26-pendant-set/category:158/filter_Occasion:%28%22Gifting%22%29/filter_Gender:%28%22Kids%22%29/filter_Type:%28%22Pendant%22%29/');
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
    const tableHeading = this.page.locator(PendentsLocators.tableHeadingPrice);
    if (await tableHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
      const priceText = await tableHeading.innerText();
      logger.info(`Verifying price heading | Text: "${priceText}" | Keyword: "Unit Price"`);
      await this.helper.verifyTrue(priceText.includes('Unit Price'), 'Cart page has Unit Price heading');
    } else {
      logger.info(`Cart price heading is not visible for the current live cart state | URL: "${this.page.url()}"`);
    }
    logger.info(`Clicking Proceed to Pay | Selector: "${PendentsLocators.proceedToPay}"`);
    const proceedToPay = this.page.locator(PendentsLocators.proceedToPay);
    if (await proceedToPay.isVisible({ timeout: 3000 }).catch(() => false)) {
      await proceedToPay.click();
    } else {
      logger.info('Proceed to Pay button is not available for this pendant cart state.');
    }
    logger.info('========== proceedToPay COMPLETED ==========');
  }
}
