import { createBdd } from 'playwright-bdd';
import { test } from '../utils/World';

const { Given, When, Then } = createBdd(test);

Given('the user initiates the search functionality', async ({ buyRingsPage }) => {
  await buyRingsPage.searchForItem('');
});

When('the user inputs {string} into the designated search field', async ({ buyRingsPage }, item: string) => {
  await buyRingsPage.typeInSearchBar(item);
});

When('the user confirms the search by pressing the Enter key', async ({ buyRingsPage }) => {
  await buyRingsPage.pressEnterOnSearch();
});

Then('the user applies the gender-specific filter', async ({ buyRingsPage }) => {
  await buyRingsPage.applyGenderFilter();
});

Then('the user selects the preferred metal category', async ({ buyRingsPage }) => {
  await buyRingsPage.applyMetalFilter();
});

Then('the user identifies and clicks on the first product displayed in the results', async ({ buyRingsPage }) => {
  await buyRingsPage.clickFirstProduct();
});

Then('the user proceeds to add the selected item to the shopping cart', async ({ buyRingsPage }) => {
  await buyRingsPage.addToCart();
});
