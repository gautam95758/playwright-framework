import { Given, When, Then } from '@cucumber/cucumber';
import { World } from '../utils/World';
import { NecklacePage } from '../pages/NecklacePage';

Given('the user navigates to the necklace section', async function (this: World) {
  const page = new NecklacePage(this.page);
  await page.navigateToNecklace();
});

Then('the user clicks on the first necklace product', async function (this: World) {
  const page = new NecklacePage(this.page);
  await page.clickFirstProduct();
});

Then('the user adds the necklace to the cart', async function (this: World) {
  const page = new NecklacePage(this.page);
  await page.addToCart();
});

Then('the user verifies the cart', async function (this: World) {
  const page = new NecklacePage(this.page);
  await page.verifyCart();
});

Then('the user proceeds to pay for the necklace', async function (this: World) {
  const page = new NecklacePage(this.page);
  await page.proceedToPay();
});
