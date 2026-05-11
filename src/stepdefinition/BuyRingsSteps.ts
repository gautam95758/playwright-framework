import { Given, When, Then } from '@cucumber/cucumber';
import { World } from '../utils/World';
import { BuyRingsPage } from '../pages/BuyRingsPage';

Given('the user initiates the search functionality', async function (this: World) {
  const page = new BuyRingsPage(this.page);
  await page.searchForItem('');
});

When('the user inputs {string} into the designated search field', async function (this: World, item: string) {
  const page = new BuyRingsPage(this.page);
  await page.typeInSearchBar(item);
});

When('the user confirms the search by pressing the Enter key', async function (this: World) {
  const page = new BuyRingsPage(this.page);
  await page.pressEnterOnSearch();
});

Then('the user applies the gender-specific filter', async function (this: World) {
  const page = new BuyRingsPage(this.page);
  await page.applyGenderFilter();
});

Then('the user selects the preferred metal category', async function (this: World) {
  const page = new BuyRingsPage(this.page);
  await page.applyMetalFilter();
});

Then('the user identifies and clicks on the first product displayed in the results', async function (this: World) {
  const page = new BuyRingsPage(this.page);
  await page.clickFirstProduct();
});

Then('the user proceeds to add the selected item to the shopping cart', async function (this: World) {
  const page = new BuyRingsPage(this.page);
  await page.addToCart();
});
