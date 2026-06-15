import { Locator, Page } from '@playwright/test';
import { CommonLocators } from './CommonLocators';

export class PendentsLocators extends CommonLocators {
  constructor(page: Page) {
    super(page);
  }

  get Gender(): Locator {
    return this.page.getByRole('link', { name: /^gender$/i });
  }

  get kids(): Locator {
    return this.page.getByRole('link', { name: /kids/i }).first();
  }

  get moreFilter(): Locator {
    return this.page.getByRole('button', { name: /more/i });
  }

  get type(): Locator {
    return this.page.getByRole('link', { name: /^type$/i });
  }

  get pendentInsideType(): Locator {
    return this.page.getByRole('link', { name: /pendant/i }).first();
  }

  get firstProductOnPendent(): Locator {
    return this.firstProductCardLink;
  }

  get AddtoCart(): Locator {
    return this.addToCartAction;
  }

  get proceedToPay(): Locator {
    return this.proceedToPayAction;
  }

  get tableHeadingPrice(): Locator {
    return this.unitPriceHeading;
  }
}

export class HomePageLocators extends CommonLocators {
  constructor(page: Page) {
    super(page);
  }

  get searchBarLocator(): Locator {
    return this.searchInput;
  }

  get pendent(): Locator {
    return this.page.getByRole('link', { name: /pendants?/i }).first();
  }

  get gift(): Locator {
    return this.page.getByRole('link', { name: /gifting/i }).first();
  }
}
