import { Locator, Page } from '@playwright/test';
import { CommonLocators } from './CommonLocators';

export class RingsLocators extends CommonLocators {
  constructor(page: Page) {
    super(page);
  }

  get searchBar(): Locator {
    return this.searchInput;
  }

  get genderFilter(): Locator {
    return this.page.getByRole('link', { name: /^gender$/i });
  }

  get womenFilter(): Locator {
    return this.page.getByRole('link', { name: /women/i }).first();
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
}
