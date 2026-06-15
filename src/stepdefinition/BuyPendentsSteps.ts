import { createBdd } from 'playwright-bdd';
import { test } from '../utils/World';

const { Given, When, Then } = createBdd(test);

Given('the user hovers over pendents', async ({ buyPendentsPage }) => {
  await buyPendentsPage.hoverOverPendents();
});

When('the user applies the gender filter', async ({ buyPendentsPage }) => {
  await buyPendentsPage.genderFilter();
});

Then('the user selects additional filters', async ({ buyPendentsPage }) => {
  await buyPendentsPage.moreFilter();
});

Then('the user clicks on the first product displayed', async ({ buyPendentsPage }) => {
  await buyPendentsPage.firstProductClick();
});

Then('the user adds the selected product to the cart', async ({ buyPendentsPage }) => {
  await buyPendentsPage.addToCart();
});

Then('the user proceeds to the payment page', async ({ buyPendentsPage }) => {
  await buyPendentsPage.proceedToPay();
});
