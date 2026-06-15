import { createBdd } from 'playwright-bdd';
import { test } from '../utils/World';

const { Given, When, Then } = createBdd(test);

Given('the user scrolls to the footer', async ({ footerPage }) => {
  await footerPage.scrollToFooter();
});

When('the user clicks on privacy policy', async ({ footerPage }) => {
  await footerPage.clickPrivacyPolicy();
});

Then('the user clicks on terms and conditions', async ({ footerPage }) => {
  await footerPage.clickTermsAndConditions();
});

Then('the user clicks on shipping policy', async ({ footerPage }) => {
  await footerPage.clickShippingPolicy();
});

Then('the user clicks on return policy', async ({ footerPage }) => {
  await footerPage.clickReturnPolicy();
});
