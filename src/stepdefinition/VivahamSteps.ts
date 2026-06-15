import { createBdd } from 'playwright-bdd';
import { test } from '../utils/World';

const { Given, When, Then } = createBdd(test);

Given('the user navigates to vivaham section', async ({ vivahamPage }) => {
  await vivahamPage.navigateToVivaham();
});

When('the user applies metal filter in vivaham', async ({ vivahamPage }) => {
  await vivahamPage.applyMetalFilter();
});

Then('the user clicks on the first vivaham product', async ({ vivahamPage }) => {
  await vivahamPage.clickFirstProduct();
});

Then('the user adds the vivaham product to cart', async ({ vivahamPage }) => {
  await vivahamPage.addToCart();
});

Then('the user proceeds to pay for vivaham product', async ({ vivahamPage }) => {
  await vivahamPage.proceedToPay();
});
