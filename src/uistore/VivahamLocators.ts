import { Locator, Page } from '@playwright/test';
import { CommonLocators } from './CommonLocators';

export class VivahamLocators extends CommonLocators {
  constructor(page: Page) {
    super(page);
  }

  get vivahamMenu(): Locator {
    return this.page.getByRole('link', { name: /vivaham/i }).first();
  }

  get metalFilter(): Locator {
    return this.page.getByRole('link', { name: /^metal$/i });
  }

  get goldOption(): Locator {
    return this.page.getByRole('link', { name: /gold/i }).first();
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
