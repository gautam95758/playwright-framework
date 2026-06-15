import { Page, TestInfo } from '@playwright/test';
import { test as base } from 'playwright-bdd';
import { BuyPendentsPage } from '../pages/BuyPendentsPage';
import { BuyRingsPage } from '../pages/BuyRingsPage';
import { ChainPage } from '../pages/ChainPage';
import { DiamondPage } from '../pages/DiamondPage';
import { EarringsPage } from '../pages/EarringsPage';
import { FooterPage } from '../pages/FooterPage';
import { NecklacePage } from '../pages/NecklacePage';
import { PlatinumRingPage } from '../pages/PlatinumRingPage';
import { VivahamPage } from '../pages/VivahamPage';
import logger from './Logger';

export type ScenarioContext = {
  scenarioName: string;
  featureFile: string;
  consoleErrors: string[];
  failedStepText?: string;
  lastScreenshotPath?: string;
};

export type BddFixtures = {
  scenarioContext: ScenarioContext;
  buyPendentsPage: BuyPendentsPage;
  buyRingsPage: BuyRingsPage;
  chainPage: ChainPage;
  diamondPage: DiamondPage;
  earringsPage: EarringsPage;
  footerPage: FooterPage;
  necklacePage: NecklacePage;
  platinumRingPage: PlatinumRingPage;
  vivahamPage: VivahamPage;
};

export const test = base.extend<BddFixtures>({
  scenarioContext: async ({ page, $bddContext, $testInfo }, use) => {
    const consoleErrors: string[] = [];
    const onConsole = (message: { type(): string; text(): string }) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    };

    page.on('console', onConsole);
    await use({
      scenarioName: $testInfo.title || 'Unnamed scenario',
      featureFile: $bddContext.featureUri,
      consoleErrors,
    });
    page.off('console', onConsole);
  },

  buyPendentsPage: async ({ page }, use) => use(new BuyPendentsPage(page)),
  buyRingsPage: async ({ page }, use) => use(new BuyRingsPage(page)),
  chainPage: async ({ page }, use) => use(new ChainPage(page)),
  diamondPage: async ({ page }, use) => use(new DiamondPage(page)),
  earringsPage: async ({ page }, use) => use(new EarringsPage(page)),
  footerPage: async ({ page }, use) => use(new FooterPage(page)),
  necklacePage: async ({ page }, use) => use(new NecklacePage(page)),
  platinumRingPage: async ({ page }, use) => use(new PlatinumRingPage(page)),
  vivahamPage: async ({ page }, use) => use(new VivahamPage(page)),
});

export type BddTest = typeof test;

export async function attachText(testInfo: TestInfo, name: string, body: string): Promise<void> {
  await testInfo.attach(name, {
    body,
    contentType: 'text/plain',
  });
}

export async function attachHtml(testInfo: TestInfo, name: string, body: string): Promise<void> {
  await testInfo.attach(name, {
    body,
    contentType: 'text/html',
  });
}

export async function gotoBaseUrl(page: Page): Promise<void> {
  logger.info('Navigating to configured baseURL');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
}
