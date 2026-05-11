import { Page } from '@playwright/test';
import { PlaywrightHelper } from '../utils/PlaywrightHelper';
import { FooterLocators } from '../uistore/FooterLocators';
import logger from '../utils/Logger';

export class FooterPage {
  private helper: PlaywrightHelper;
  private page: Page;

  constructor(page: Page) {
    this.page = page;
    this.helper = new PlaywrightHelper(page);
    logger.info('FooterPage initialized');
  }

  async scrollToFooter(): Promise<void> {
    logger.info('========== scrollToFooter STARTED ==========');
    logger.info('Scrolling to the bottom of the page');
    await this.helper.scrollInWebPageEnd();
    logger.info(`Waiting for footer section to be visible | Selector: "${FooterLocators.footerSection}"`);
    await this.helper.waitUntilElementIsVisible(FooterLocators.footerSection, 10);
    logger.info('Footer is now visible');
    logger.info('========== scrollToFooter COMPLETED ==========');
  }

  async clickPrivacyPolicy(): Promise<void> {
    logger.info('========== clickPrivacyPolicy STARTED ==========');
    logger.info(`Clicking Privacy Policy link | Selector: "${FooterLocators.privacyPolicy}"`);
    await this.helper.clickElement(FooterLocators.privacyPolicy);
    logger.info('========== clickPrivacyPolicy COMPLETED ==========');
  }

  async clickTermsAndConditions(): Promise<void> {
    logger.info('========== clickTermsAndConditions STARTED ==========');
    logger.info(`Clicking Terms & Conditions link | Selector: "${FooterLocators.termsConditions}"`);
    await this.helper.clickElement(FooterLocators.termsConditions);
    logger.info('========== clickTermsAndConditions COMPLETED ==========');
  }

  async clickShippingPolicy(): Promise<void> {
    logger.info('========== clickShippingPolicy STARTED ==========');
    logger.info(`Clicking Shipping Policy link | Selector: "${FooterLocators.shippingPolicy}"`);
    await this.helper.clickElement(FooterLocators.shippingPolicy);
    logger.info('========== clickShippingPolicy COMPLETED ==========');
  }

  async clickReturnPolicy(): Promise<void> {
    logger.info('========== clickReturnPolicy STARTED ==========');
    logger.info(`Clicking Return Policy link | Selector: "${FooterLocators.returnPolicy}"`);
    await this.helper.clickElement(FooterLocators.returnPolicy);
    logger.info('========== clickReturnPolicy COMPLETED ==========');
  }

  async clickAboutUs(): Promise<void> {
    logger.info('========== clickAboutUs STARTED ==========');
    logger.info(`Clicking About Us link | Selector: "${FooterLocators.aboutUs}"`);
    await this.helper.clickElement(FooterLocators.aboutUs);
    logger.info('========== clickAboutUs COMPLETED ==========');
  }
}
