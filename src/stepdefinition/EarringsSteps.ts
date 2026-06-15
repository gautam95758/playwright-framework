import { createBdd } from 'playwright-bdd';
import { test } from '../utils/World';

const { Given, When, Then } = createBdd(test);

Given('the user navigates to the earrings section', async ({ earringsPage }) => {
  await earringsPage.navigateToEarrings();
});

When('the user applies gender filter for earrings', async ({ earringsPage }) => {
  await earringsPage.applyGenderFilter();
});

Then('the user applies type filter for earrings', async ({ earringsPage }) => {
  await earringsPage.applyTypeFilter();
});

Then('the user clicks on the first earring product', async ({ earringsPage }) => {
  await earringsPage.clickFirstProduct();
});

Then('the user adds the earring to the cart', async ({ earringsPage }) => {
  await earringsPage.addToCart();
});
