import { Given, When, Then } from '@cucumber/cucumber';
import { World } from '../utils/World';
import { ChainPage } from '../pages/ChainPage';

Given('the user navigates to the chain section', async function (this: World) {
  const page = new ChainPage(this.page);
  await page.navigateToChain();
});

When('the user applies the gold filter for chains', async function (this: World) {
  const page = new ChainPage(this.page);
  await page.applyGoldFilter();
});

Then('the user clicks on the first chain product', async function (this: World) {
  const page = new ChainPage(this.page);
  await page.clickFirstProduct();
});

Then('the user adds the chain to the cart', async function (this: World) {
  const page = new ChainPage(this.page);
  await page.addToCart();
});

Then('the user proceeds to pay for the chain', async function (this: World) {
  const page = new ChainPage(this.page);
  await page.proceedToPay();
});
