import { Given, When, Then } from '@cucumber/cucumber';
import { World } from '../utils/World';
import { FooterPage } from '../pages/FooterPage';

Given('the user scrolls to the footer', async function (this: World) {
  const page = new FooterPage(this.page);
  await page.scrollToFooter();
});

When('the user clicks on privacy policy', async function (this: World) {
  const page = new FooterPage(this.page);
  await page.clickPrivacyPolicy();
});

Then('the user clicks on terms and conditions', async function (this: World) {
  const page = new FooterPage(this.page);
  await page.clickTermsAndConditions();
});

Then('the user clicks on shipping policy', async function (this: World) {
  const page = new FooterPage(this.page);
  await page.clickShippingPolicy();
});

Then('the user clicks on return policy', async function (this: World) {
  const page = new FooterPage(this.page);
  await page.clickReturnPolicy();
});
