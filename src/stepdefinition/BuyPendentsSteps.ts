import { Given, When, Then } from '@cucumber/cucumber';
import { World } from '../utils/World';
import { BuyPendentsPage } from '../pages/BuyPendentsPage';

Given('the user hovers over pendents', async function (this: World) {
  const page = new BuyPendentsPage(this.page);
  await page.hoverOverPendents();
});

When('the user applies the gender filter', async function (this: World) {
  const page = new BuyPendentsPage(this.page);
  await page.genderFilter();
});

Then('the user selects additional filters', async function (this: World) {
  const page = new BuyPendentsPage(this.page);
  await page.moreFilter();
});

Then('the user clicks on the first product displayed', async function (this: World) {
  const page = new BuyPendentsPage(this.page);
  await page.firstProductClick();
});

Then('the user adds the selected product to the cart', async function (this: World) {
  const page = new BuyPendentsPage(this.page);
  await page.addToCart();
});

Then('the user proceeds to the payment page', async function (this: World) {
  const page = new BuyPendentsPage(this.page);
  await page.proceedToPay();
});
