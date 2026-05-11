import { Given, When, Then } from '@cucumber/cucumber';
import { World } from '../utils/World';
import { PlatinumRingPage } from '../pages/PlatinumRingPage';

Given('the user navigates to the rings section', async function (this: World) {
  const page = new PlatinumRingPage(this.page);
  await page.navigateToRings();
});

When('the user applies the platinum filter', async function (this: World) {
  const page = new PlatinumRingPage(this.page);
  await page.applyPlatinumFilter();
});

Then('the user clicks on the first platinum ring', async function (this: World) {
  const page = new PlatinumRingPage(this.page);
  await page.clickFirstProduct();
});

Then('the user adds the platinum ring to the cart', async function (this: World) {
  const page = new PlatinumRingPage(this.page);
  await page.addToCart();
});

Then('the user proceeds to pay for the platinum ring', async function (this: World) {
  const page = new PlatinumRingPage(this.page);
  await page.proceedToPay();
});
