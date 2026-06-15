import { Locator, Page } from '@playwright/test';
import { CommonLocators } from './CommonLocators';

export class PlatinumRingLocators extends CommonLocators {
  constructor(page: Page) {
    super(page);
  }

  get ringsMenu(): Locator {
    return this.page.getByRole('link', { name: /^rings$/i });
  }

  get metalFilter(): Locator {
    return this.page.getByRole('link', { name: /^metal$/i });
  }

  get platinumOption(): Locator {
    return this.page.getByRole('link', { name: /platinum/i }).first();
  }

  get priceFilter(): Locator {
    return this.page.getByRole('link', { name: /^price$/i });
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
}
