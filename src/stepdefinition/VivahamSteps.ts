import { Given, When, Then } from '@cucumber/cucumber';
import { World } from '../utils/World';
import { VivahamPage } from '../pages/VivahamPage';

Given('the user navigates to vivaham section', async function (this: World) {
  const page = new VivahamPage(this.page);
  await page.navigateToVivaham();
});

When('the user applies metal filter in vivaham', async function (this: World) {
  const page = new VivahamPage(this.page);
  await page.applyMetalFilter();
});

Then('the user clicks on the first vivaham product', async function (this: World) {
  const page = new VivahamPage(this.page);
  await page.clickFirstProduct();
});

Then('the user adds the vivaham product to cart', async function (this: World) {
  const page = new VivahamPage(this.page);
  await page.addToCart();
});

Then('the user proceeds to pay for vivaham product', async function (this: World) {
  const page = new VivahamPage(this.page);
  await page.proceedToPay();
});
