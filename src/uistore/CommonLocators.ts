import { Locator, Page } from '@playwright/test';

export class CommonLocators {
  constructor(protected readonly page: Page) {}

  get mainContent(): Locator {
    return this.page.getByRole('main').or(this.page.locator('#content, .content')).first();
  }

  get searchInput(): Locator {
    return this.page.getByRole('textbox', { name: 'What are you searching for?' });
  }

  get firstProductCardLink(): Locator {
    // TODO: Replace with a product-card test id or accessible product name when the live DOM exposes one.
    return this.mainContent.getByRole('link').filter({ has: this.page.getByRole('img') }).first();
  }

  get addToCartAction(): Locator {
    // TODO: Confirm exact accessible name on the product detail page across product categories.
    return this.page
      .getByRole('button', { name: /add to cart|buy now/i })
      .or(this.page.getByRole('link', { name: /add to cart|buy now/i }))
      .first();
  }

  get proceedToPayAction(): Locator {
    return this.page
      .getByRole('button', { name: /proceed to pay|checkout/i })
      .or(this.page.getByRole('link', { name: /proceed to pay|checkout/i }))
      .first();
  }

  get unitPriceHeading(): Locator {
    return this.page.getByRole('columnheader', { name: /unit price/i });
  }
}
