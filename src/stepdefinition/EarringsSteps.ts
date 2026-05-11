import { Given, When, Then } from '@cucumber/cucumber';
import { World } from '../utils/World';
import { EarringsPage } from '../pages/EarringsPage';

Given('the user navigates to the earrings section', async function (this: World) {
  const page = new EarringsPage(this.page);
  await page.navigateToEarrings();
});

When('the user applies gender filter for earrings', async function (this: World) {
  const page = new EarringsPage(this.page);
  await page.applyGenderFilter();
});

Then('the user applies type filter for earrings', async function (this: World) {
  const page = new EarringsPage(this.page);
  await page.applyTypeFilter();
});

Then('the user clicks on the first earring product', async function (this: World) {
  const page = new EarringsPage(this.page);
  await page.clickFirstProduct();
});

Then('the user adds the earring to the cart', async function (this: World) {
  const page = new EarringsPage(this.page);
  await page.addToCart();
});
