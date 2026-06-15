import { Locator, Page } from '@playwright/test';
import { CommonLocators } from './CommonLocators';

export class NecklaceLocators extends CommonLocators {
  constructor(page: Page) {
    super(page);
  }

  get necklaceMenu(): Locator {
    return this.page.getByRole('link', { name: /necklaces?/i }).first();
  }

  get myCart(): Locator {
    return this.page.getByRole('link', { name: /cart/i });
  }

  get cartItems(): Locator {
    return this.page.getByRole('row').filter({ hasText: /unit price|qty|quantity|total/i });
  }

  get firstProduct(): Locator {
    return this.firstProductCardLink;
  }

  get addToCart(): Locator {
    return this.addToCartAction;
  }

  get proceedToPay(): Locator {
    return this.proceedToPayAction;
  }

  get tableHeadingPrice(): Locator {
    return this.unitPriceHeading;
  }
}
