import { createBdd } from 'playwright-bdd';
import { test } from '../utils/World';

const { Given, When, Then } = createBdd(test);

Given('the user navigates to the diamond section', async ({ diamondPage }) => {
  await diamondPage.navigateToDiamond();
});

When('the user applies the shape filter', async ({ diamondPage }) => {
  await diamondPage.applyShapeFilter();
});

Then('the user clicks on the first diamond product', async ({ diamondPage }) => {
  await diamondPage.clickFirstProduct();
});

Then('the user adds the diamond to the cart', async ({ diamondPage }) => {
  await diamondPage.addToCart();
});

Then('the user proceeds to pay for the diamond', async ({ diamondPage }) => {
  await diamondPage.proceedToPay();
});
