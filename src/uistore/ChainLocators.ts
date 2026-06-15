import { Locator, Page } from '@playwright/test';
import { CommonLocators } from './CommonLocators';

export class ChainLocators extends CommonLocators {
  constructor(page: Page) {
    super(page);
  }

  get chainMenu(): Locator {
    return this.page.getByRole('link', { name: /^chain$/i });
  }

  get goldFilter(): Locator {
    return this.page.getByRole('link', { name: /gold/i }).first();
  }

  get lengthFilter(): Locator {
    return this.page.getByRole('link', { name: /^length$/i });
  }

  get weightFilter(): Locator {
    return this.page.getByRole('link', { name: /^weight$/i });
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
