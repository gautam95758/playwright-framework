import { createBdd } from 'playwright-bdd';
import { test } from '../utils/World';

const { Given, Then } = createBdd(test);

Given('the user navigates to the necklace section', async ({ necklacePage }) => {
  await necklacePage.navigateToNecklace();
});

Then('the user clicks on the first necklace product', async ({ necklacePage }) => {
  await necklacePage.clickFirstProduct();
});

Then('the user adds the necklace to the cart', async ({ necklacePage }) => {
  await necklacePage.addToCart();
});

Then('the user verifies the cart', async ({ necklacePage }) => {
  await necklacePage.verifyCart();
});

Then('the user proceeds to pay for the necklace', async ({ necklacePage }) => {
  await necklacePage.proceedToPay();
});
