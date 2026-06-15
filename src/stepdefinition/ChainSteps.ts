import { createBdd } from 'playwright-bdd';
import { test } from '../utils/World';

const { Given, When, Then } = createBdd(test);

Given('the user navigates to the chain section', async ({ chainPage }) => {
  await chainPage.navigateToChain();
});

When('the user applies the gold filter for chains', async ({ chainPage }) => {
  await chainPage.applyGoldFilter();
});

Then('the user clicks on the first chain product', async ({ chainPage }) => {
  await chainPage.clickFirstProduct();
});

Then('the user adds the chain to the cart', async ({ chainPage }) => {
  await chainPage.addToCart();
});

Then('the user proceeds to pay for the chain', async ({ chainPage }) => {
  await chainPage.proceedToPay();
});
