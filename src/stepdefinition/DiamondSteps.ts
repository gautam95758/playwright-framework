import { Given, When, Then } from '@cucumber/cucumber';
import { World } from '../utils/World';
import { DiamondPage } from '../pages/DiamondPage';

Given('the user navigates to the diamond section', async function (this: World) {
  const page = new DiamondPage(this.page);
  await page.navigateToDiamond();
});

When('the user applies the shape filter', async function (this: World) {
  const page = new DiamondPage(this.page);
  await page.applyShapeFilter();
});

Then('the user clicks on the first diamond product', async function (this: World) {
  const page = new DiamondPage(this.page);
  await page.clickFirstProduct();
});

Then('the user adds the diamond to the cart', async function (this: World) {
  const page = new DiamondPage(this.page);
  await page.addToCart();
});

Then('the user proceeds to pay for the diamond', async function (this: World) {
  const page = new DiamondPage(this.page);
  await page.proceedToPay();
});
