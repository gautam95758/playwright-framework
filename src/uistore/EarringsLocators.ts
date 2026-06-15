import { Locator, Page } from '@playwright/test';
import { CommonLocators } from './CommonLocators';

export class EarringsLocators extends CommonLocators {
  constructor(page: Page) {
    super(page);
  }

  get earringsMenu(): Locator {
    return this.page.getByRole('link', { name: /^earrings$/i });
  }

  get genderFilter(): Locator {
    return this.page.getByRole('link', { name: /^gender$/i });
  }

  get kidsFilter(): Locator {
    return this.page.getByRole('link', { name: /kids/i }).first();
  }

  get typeFilter(): Locator {
    return this.page.getByRole('link', { name: /^type$/i });
  }

  get dropsOption(): Locator {
    return this.page.getByRole('link', { name: /drops/i }).first();
  }

  get firstProduct(): Locator {
    return this.firstProductCardLink;
  }

  get addToCart(): Locator {
    return this.addToCartAction;
  }

  get quickView(): Locator {
    return this.page.getByRole('link', { name: /quick view/i }).first();
  }
}
