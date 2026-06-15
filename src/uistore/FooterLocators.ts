import { Locator, Page } from '@playwright/test';

export class FooterLocators {
  constructor(private readonly page: Page) {}

  get footerSection(): Locator {
    return this.page.getByRole('contentinfo');
  }

  get privacyPolicy(): Locator {
    return this.footerSection.getByRole('link', { name: /privacy policy/i });
  }

  get termsConditions(): Locator {
    return this.footerSection.getByRole('link', { name: /terms.*conditions/i });
  }

  get shippingPolicy(): Locator {
    return this.footerSection.getByRole('link', { name: /shipping policy/i });
  }

  get returnPolicy(): Locator {
    return this.footerSection.getByRole('link', { name: /return.*refund/i });
  }

  get aboutUs(): Locator {
    return this.footerSection.getByRole('link', { name: /about us/i });
  }
}
