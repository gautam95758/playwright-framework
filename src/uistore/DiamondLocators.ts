import { Locator, Page } from '@playwright/test';
import { CommonLocators } from './CommonLocators';

export class DiamondLocators extends CommonLocators {
  constructor(page: Page) {
    super(page);
  }

  get diamondMenu(): Locator {
    return this.page.getByRole('link', { name: /^diamond$/i }).first();
  }

  get shapeFilter(): Locator {
    return this.page.getByRole('link', { name: /^shape$/i });
  }

  get roundShape(): Locator {
    return this.page.getByRole('link', { name: /round/i }).first();
  }

  get caratFilter(): Locator {
    return this.page.getByRole('link', { name: /carat/i }).first();
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

  get quickView(): Locator {
    return this.page.getByRole('link', { name: /quick view/i }).first();
  }
}
