import { createBdd } from 'playwright-bdd';
import { test } from '../utils/World';

const { Given, When, Then } = createBdd(test);

Given('the user navigates to the rings section', async ({ platinumRingPage }) => {
  await platinumRingPage.navigateToRings();
});

When('the user applies the platinum filter', async ({ platinumRingPage }) => {
  await platinumRingPage.applyPlatinumFilter();
});

Then('the user clicks on the first platinum ring', async ({ platinumRingPage }) => {
  await platinumRingPage.clickFirstProduct();
});

Then('the user adds the platinum ring to the cart', async ({ platinumRingPage }) => {
  await platinumRingPage.addToCart();
});

Then('the user proceeds to pay for the platinum ring', async ({ platinumRingPage }) => {
  await platinumRingPage.proceedToPay();
});
