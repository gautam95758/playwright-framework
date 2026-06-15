import fs from 'fs';
import path from 'path';
import { chromium, Locator, Page } from '@playwright/test';
import { config } from '../config/config';
import { geminiFailureAnalyzer } from '../src/utils/GeminiFailureAnalyzer';
import logger from '../src/utils/Logger';

type LocatorHealthEntry = {
  file: string;
  locatorName: string;
  selector: string;
  suggestedReplacement: string;
};

type LocatorHealthReport = {
  checkedAt: string;
  totalLocators: number;
  broken: LocatorHealthEntry[];
  healthy: number;
};

const suggestionCache = new Map<string, string>();
let aiSuggestionsDisabled = false;

void main();

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: config.headless });
  const page = await browser.newPage({ baseURL: config.baseUrl });
  page.setDefaultTimeout(5000);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const report: LocatorHealthReport = {
    checkedAt: new Date().toISOString(),
    totalLocators: 0,
    broken: [],
    healthy: 0,
  };

  for (const filePath of getLocatorFiles()) {
    const moduleExports = require(filePath) as Record<string, unknown>;
    for (const exportedValue of Object.values(moduleExports)) {
      if (typeof exportedValue !== 'function') {
        continue;
      }

      const instance = new (exportedValue as new (page: Page) => object)(page);
      const getters = getLocatorGetterNames(instance);

      for (const locatorName of getters) {
        report.totalLocators += 1;
        const locator = Reflect.get(instance, locatorName) as Locator;
        const selector = locator.toString();
        const count = await locator.count().catch(() => 0);

        if (count > 0) {
          report.healthy += 1;
          continue;
        }

        const suggestedReplacement = await getSuggestion(page, selector);
        report.broken.push({
          file: path.basename(filePath),
          locatorName,
          selector,
          suggestedReplacement,
        });
      }
    }
  }

  await browser.close();

  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync('reports/locator-health.json', JSON.stringify(report, null, 2), 'utf8');

  if (report.broken.length > 0) {
    logger.info(`[PRE-RUN] ${report.broken.length} broken locators detected - see reports/locator-health.json`);
  }
}

function getLocatorGetterNames(instance: object): string[] {
  const names = new Set<string>();
  let prototype = Object.getPrototypeOf(instance) as object | null;

  while (prototype && prototype !== Object.prototype) {
    Object.getOwnPropertyNames(prototype).forEach((name) => {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
      if (name !== 'constructor' && typeof descriptor?.get === 'function') {
        names.add(name);
      }
    });
    prototype = Object.getPrototypeOf(prototype) as object | null;
  }

  return [...names];
}

function getLocatorFiles(): string[] {
  const dir = path.resolve('src', 'uistore');
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('Locators.ts'))
    .map((file) => path.join(dir, file));
}

async function getSuggestion(page: Page, selector: string): Promise<string> {
  if (aiSuggestionsDisabled) {
    return '';
  }

  const cached = suggestionCache.get(selector);
  if (cached !== undefined) {
    return cached;
  }

  const result = await geminiFailureAnalyzer
    .suggestSelectors({
      page,
      action: 'count',
      failedSelector: selector,
      error: new Error('Locator health check returned 0 matches'),
    })
    .catch((error) => {
      const message = (error as Error).message;
      logger.error(`[PRE-RUN] Gemini locator suggestion failed for ${selector} | Error: ${message}`);
      if (/429|quota|rate.?limit/i.test(message)) {
        aiSuggestionsDisabled = true;
        logger.error('[PRE-RUN] Gemini suggestions disabled for the rest of this health check because the API quota/rate limit was reached.');
      }
      return {
        suggestion: undefined,
        extraction: undefined,
        visionSuggestion: undefined,
      };
    });

  const suggestion = result.suggestion?.suggestedSelectors?.[0] || result.visionSuggestion || '';
  suggestionCache.set(selector, suggestion);
  return suggestion;
}
