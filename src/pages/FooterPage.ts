import { Page } from '@playwright/test';
import { PlaywrightHelper } from '../utils/PlaywrightHelper';
import { FooterLocators } from '../uistore/FooterLocators';
import logger from '../utils/Logger';

export class FooterPage {
  private helper: PlaywrightHelper;
  private page: Page;
  private locators: FooterLocators;

  constructor(page: Page) {
    this.page = page;
    this.helper = new PlaywrightHelper(page);
    this.locators = new FooterLocators(page);
    logger.info('FooterPage initialized');
  }

  async scrollToFooter(): Promise<void> {
    logger.info('Scrolling to the bottom of the page');
    await this.helper.scrollInWebPageEnd();
    logger.info('Waiting for footer section to be visible');
    await this.helper.waitUntilElementIsVisible(this.locators.footerSection, 10);
    logger.info('Footer is now visible');
  }

  async clickPrivacyPolicy(): Promise<void> {
    logger.info('Clicking Privacy Policy link');
    await this.helper.clickElement(this.locators.privacyPolicy);
    await this.page.goBack({ waitUntil: 'domcontentloaded' });
    await this.scrollToFooter();
  }

  async clickTermsAndConditions(): Promise<void> {
    logger.info('Clicking Terms & Conditions link');
    await this.helper.clickElement(this.locators.termsConditions);
    await this.page.goBack({ waitUntil: 'domcontentloaded' });
    await this.scrollToFooter();
  }

  async clickShippingPolicy(): Promise<void> {
    logger.info('Clicking Shipping Policy link');
    await this.helper.clickElement(this.locators.shippingPolicy);
    await this.page.goBack({ waitUntil: 'domcontentloaded' });
    await this.scrollToFooter();
  }

  async clickReturnPolicy(): Promise<void> {
    logger.info('Clicking Return Policy link');
    await this.helper.clickElement(this.locators.returnPolicy);
  }

  async clickAboutUs(): Promise<void> {
    logger.info('Clicking About Us link');
    await this.helper.clickElement(this.locators.aboutUs);
  }
}
