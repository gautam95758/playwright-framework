import fs from 'fs';
import path from 'path';
import { chromium } from '@playwright/test';
import appPatterns from '../config/appPatterns.json';
import { config } from '../config/config';
import { geminiClient } from '../src/utils/GeminiClient';
import logger from '../src/utils/Logger';

type GeneratedLocator = {
  name: string;
  locator: string;
  type: string;
};

void main();

async function main(): Promise<void> {
  const url = process.argv[2];
  if (!url) {
    throw new Error('Usage: ts-node scripts/generateLocators.ts https://...');
  }

  if (!geminiClient.isConfigured()) {
    throw new Error('GEMINI_API_KEY is required for locator generation');
  }

  const browser = await chromium.launch({ headless: config.headless });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.pageTimeout });
  const screenshot = await page.screenshot({ fullPage: true });
  await browser.close();

  const prompt = [
    'identify all interactive elements - buttons, links, inputs, filters, product cards.',
    'for each generate a Playwright locator using getByRole > getByTestId > CSS.',
    'return ONLY JSON array: [{ "name": string, "locator": string, "type": string }]',
    'this app consistently uses these patterns - prefer them:',
    JSON.stringify(appPatterns),
  ].join('\n');

  const raw = await geminiClient.generateVisionText(prompt, [{ data: screenshot, mimeType: 'image/png' }]);
  const locators = parseJson<GeneratedLocator[]>(raw);
  const pageName = toPageName(url);
  const filePath = path.resolve('src', 'uistore', `Generated_${pageName}Locators.ts`);

  fs.writeFileSync(filePath, renderLocatorFile(pageName, locators), 'utf8');

  locators.forEach((locator) => logger.info(`[AI-GEN] ${locator.type}: ${locator.name} -> ${locator.locator}`));
}

function renderLocatorFile(pageName: string, locators: GeneratedLocator[]): string {
  const getters = locators
    .map((locator) => {
      const name = toIdentifier(locator.name);
      return [
        `  get ${name}(): Locator {`,
        `    return this.page.${locator.locator.replace(/^page\./, '')};`,
        '  }',
      ].join('\n');
    })
    .join('\n\n');

  return [
    "import { Locator, Page } from '@playwright/test';",
    '',
    `export class Generated_${pageName}Locators {`,
    '  constructor(private readonly page: Page) {}',
    '',
    getters,
    '}',
    '',
  ].join('\n');
}

function parseJson<T>(raw: string): T {
  return JSON.parse(raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()) as T;
}

function toPageName(url: string): string {
  const parsed = new URL(url);
  return toIdentifier(parsed.pathname.split('/').filter(Boolean).pop() || parsed.hostname.replace(/\W+/g, '_'));
}

function toIdentifier(value: string): string {
  const words = value.replace(/[^a-z0-9]+/gi, ' ').trim().split(/\s+/);
  const identifier = words
    .map((word, index) => (index === 0 ? word.toLowerCase() : word[0]?.toUpperCase() + word.slice(1).toLowerCase()))
    .join('');
  return /^[a-z_]/i.test(identifier) ? identifier : `locator${identifier}`;
}
