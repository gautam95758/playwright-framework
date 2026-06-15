import fs from 'fs';
import path from 'path';
import { expect, Locator, Page } from '@playwright/test';
import { config } from '../../config/config';
import logger from './Logger';
import { geminiFailureAnalyzer, SelectorSuggestion } from './GeminiFailureAnalyzer';

type SelectorOrLocator = string | Locator;

export class PlaywrightHelper {
  constructor(private readonly page: Page) {
    logger.info('PlaywrightHelper initialized');
  }

  async waitUntilElementIsVisible(selectorOrLocator: SelectorOrLocator, timeoutInSeconds = 20): Promise<void> {
    await this.withHealing(
      'waitUntilElementIsVisible',
      selectorOrLocator,
      async (locator) => {
        await expect(locator).toBeVisible({ timeout: timeoutInSeconds * 1000 });
      },
      timeoutInSeconds,
    );
  }

  async clickElement(selectorOrLocator: SelectorOrLocator): Promise<void> {
    await this.withHealing('clickElement', selectorOrLocator, async (locator) => {
      await locator.click({ timeout: defaultActionTimeoutMs() });
    });
  }

  async typeIntoElement(selectorOrLocator: SelectorOrLocator, text: string): Promise<void> {
    await this.withHealing('typeIntoElement', selectorOrLocator, async (locator) => {
      await locator.fill(text, { timeout: defaultActionTimeoutMs() });
    });
  }

  async retrieveElementText(selectorOrLocator: SelectorOrLocator): Promise<string> {
    return this.withHealing('retrieveElementText', selectorOrLocator, async (locator) => locator.innerText());
  }

  async pressEnterKey(selectorOrLocator: SelectorOrLocator): Promise<void> {
    await this.withHealing('pressEnterKey', selectorOrLocator, async (locator) => {
      await locator.press('Enter', { timeout: defaultActionTimeoutMs() });
    });
  }

  async hoverOnElement(selectorOrLocator: SelectorOrLocator): Promise<void> {
    await this.withHealing('hoverOnElement', selectorOrLocator, async (locator) => {
      await locator.hover({ timeout: defaultActionTimeoutMs() });
    });
  }

  async switchToChildWindow(): Promise<Page> {
    const newPage = await this.page.context().waitForEvent('page');
    await newPage.waitForLoadState();
    logger.info(`Switched to child window | URL: "${newPage.url()}"`);
    return newPage;
  }

  async scrollInWebPage(direction: 'vertical' | 'horizontal', pixels: number): Promise<void> {
    if (direction === 'vertical') {
      await this.page.evaluate((px) => window.scrollBy(0, px), pixels);
    } else {
      await this.page.evaluate((px) => window.scrollBy(px, 0), pixels);
    }
  }

  async scrollInWebPageEnd(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }

  async scrollInWebPageTop(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, 0));
  }

  async scrollInWebPageTillVisible(selectorOrLocator: SelectorOrLocator): Promise<void> {
    await this.withHealing('scrollInWebPageTillVisible', selectorOrLocator, async (locator) => {
      await locator.scrollIntoViewIfNeeded();
    });
  }

  async javascriptExecutorClick(selectorOrLocator: SelectorOrLocator): Promise<void> {
    await this.withHealing('javascriptExecutorClick', selectorOrLocator, async (locator) => {
      await locator.evaluate((element) => (element as HTMLElement).click());
    });
  }

  async clearTextInputField(selectorOrLocator: SelectorOrLocator): Promise<void> {
    await this.withHealing('clearTextInputField', selectorOrLocator, async (locator) => {
      await locator.clear({ timeout: defaultActionTimeoutMs() });
    });
  }

  async isElementVisible(selectorOrLocator: SelectorOrLocator): Promise<boolean> {
    return this.getLocator(selectorOrLocator).isVisible().catch(() => false);
  }

  async isElementEnabled(selectorOrLocator: SelectorOrLocator): Promise<boolean> {
    return this.getLocator(selectorOrLocator).isEnabled().catch(() => false);
  }

  async getElementCount(selectorOrLocator: SelectorOrLocator): Promise<number> {
    return this.getLocator(selectorOrLocator).count();
  }

  async getAttribute(selectorOrLocator: SelectorOrLocator, attributeName: string): Promise<string | null> {
    return this.getLocator(selectorOrLocator).getAttribute(attributeName);
  }

  async verifyEquals(actual: string, expected: string, description: string): Promise<void> {
    logger.info(`Assertion: ${description}`);
    expect(actual, description).toBe(expected);
  }

  async verifyTrue(condition: boolean, description: string): Promise<void> {
    logger.info(`Assertion: ${description}`);
    expect(condition, description).toBeTruthy();
  }

  async verifyFalse(condition: boolean, description: string): Promise<void> {
    logger.info(`Assertion: ${description}`);
    expect(condition, description).toBeFalsy();
  }

  async retryFailedTestCase(action: () => Promise<void>, maxRetries: number): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      try {
        await action();
        return;
      } catch (error) {
        lastError = error as Error;
        logger.error(`Retry attempt ${attempt} failed | Error: ${lastError.message}`);
      }
    }

    throw lastError;
  }

  async getPageTitle(): Promise<string> {
    return this.page.title();
  }

  getCurrentUrl(): string {
    return this.page.url();
  }

  async takeScreenshot(name: string): Promise<Buffer> {
    fs.mkdirSync('screenshots', { recursive: true });
    return this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: false });
  }

  private getLocator(selectorOrLocator: SelectorOrLocator): Locator {
    return typeof selectorOrLocator === 'string' ? this.page.locator(selectorOrLocator) : selectorOrLocator;
  }

  private getDescription(selectorOrLocator: SelectorOrLocator): string {
    return typeof selectorOrLocator === 'string' ? selectorOrLocator : selectorOrLocator.toString();
  }

  private async withHealing<T>(
    action: string,
    selectorOrLocator: SelectorOrLocator,
    operation: (locator: Locator) => Promise<T>,
    timeoutInSeconds?: number,
  ): Promise<T> {
    const failedSelector = this.getDescription(selectorOrLocator);
    const locator = this.getLocator(selectorOrLocator);

    logger.info(`Attempting ${action} | Selector: ${failedSelector}`);

    try {
      return await operation(locator);
    } catch (error) {
      const originalError = error as Error;
      logger.error(`${action} failed | Selector: ${failedSelector} | Error: ${originalError.message}`);

      if (!config.gemini.selfHealEnabled || !geminiFailureAnalyzer.isLocatorOrWaitFailure(originalError)) {
        throw originalError;
      }

      // Guard: page may have closed after timeout — cannot heal against a dead page
      if (this.page.isClosed()) {
        logger.warn(`[SELF-HEAL] Skipped — page is already closed after "${action}" failed on "${failedSelector}"`);
        throw originalError;
      }

      const healed = await this.tryHeal({
        action,
        failedSelector,
        originalError,
        operation,
        timeoutInSeconds,
      });

      if (healed.success) {
        return healed.value as T;
      }

      throw originalError;
    }
  }

  private async tryHeal<T>(input: {
    action: string;
    failedSelector: string;
    originalError: Error;
    operation: (locator: Locator) => Promise<T>;
    timeoutInSeconds?: number;
  }): Promise<{ success: boolean; value?: T }> {
    const healingResult = await geminiFailureAnalyzer
      .suggestSelectors({
        page: this.page,
        action: input.action,
        failedSelector: input.failedSelector,
        error: input.originalError,
      })
      .catch((error): Awaited<ReturnType<typeof geminiFailureAnalyzer.suggestSelectors>> => {
        logger.error(`AI self-healing skipped | Selector: ${input.failedSelector} | Error: ${(error as Error).message}`);
        return {};
      });
    const { suggestion, extraction, visionSuggestion } = healingResult;

    if (visionSuggestion) {
      logger.info(`[AI-SUGGEST] ${visionSuggestion}`);
      return { success: false };
    }

    if (!suggestion) {
      return { success: false };
    }

    if (suggestion.confidence < 0.7) {
      logger.info(`[AI-SUGGEST] Low confidence (${suggestion.confidence}) - not auto-written, manual fix needed`);
      return { success: false };
    }

    for (const selector of suggestion.suggestedSelectors) {
      const locator = locatorFromSuggestion(this.page, selector);
      if (!locator) {
        continue;
      }

      try {
        const value = await input.operation(locator);
        const file = tryWriteLocatorReplacement(input.failedSelector, selector);

        if (suggestion.confidence >= 0.9) {
          logger.info(`[SELF-HEAL] ${input.failedSelector} -> ${selector}${file ? ` | Updated: ${file}` : ''}`);
        } else {
          logger.info(`[SELF-HEAL-REVIEW] Locator worked but confidence is ${suggestion.confidence}${file ? ` | Updated: ${file}` : ''}`);
        }

        return { success: true, value };
      } catch {
        logger.info(`Suggested selector did not work during retry: ${selector}`);
      }
    }

    return { success: false };
  }
}

function locatorFromSuggestion(page: Page, suggestion: string): Locator | undefined {
  const text = suggestion.trim();
  const roleMatch = text.match(/getByRole\(\s*['"]([^'"]+)['"]\s*,\s*\{\s*name:\s*(\/.+\/[a-z]*|['"][^'"]+['"])/);
  if (roleMatch?.[1] && roleMatch[2]) {
    return page.getByRole(roleMatch[1] as Parameters<Page['getByRole']>[0], { name: parseName(roleMatch[2]) });
  }

  const placeholderMatch = matchSingleLocatorArg(text, 'getByPlaceholder');
  if (placeholderMatch) {
    return page.getByPlaceholder(parseName(placeholderMatch));
  }

  const textMatch = matchSingleLocatorArg(text, 'getByText');
  if (textMatch) {
    return page.getByText(parseName(textMatch));
  }

  const labelMatch = matchSingleLocatorArg(text, 'getByLabel');
  if (labelMatch) {
    return page.getByLabel(parseName(labelMatch));
  }

  const altTextMatch = matchSingleLocatorArg(text, 'getByAltText');
  if (altTextMatch) {
    return page.getByAltText(parseName(altTextMatch));
  }

  const titleMatch = matchSingleLocatorArg(text, 'getByTitle');
  if (titleMatch) {
    return page.getByTitle(parseName(titleMatch));
  }

  const testIdMatch = text.match(/getByTestId\(\s*['"]([^'"]+)['"]\s*\)/);
  if (testIdMatch?.[1]) {
    return page.getByTestId(testIdMatch[1]);
  }

  const locatorMatch = text.match(/locator\(\s*['"]([^'"]+)['"]\s*\)/);
  if (locatorMatch?.[1]) {
    return page.locator(locatorMatch[1]);
  }

  if (/^[.#\[\]a-z0-9_:-]/i.test(text) && !text.includes('(')) {
    return page.locator(text);
  }

  return undefined;
}

function matchSingleLocatorArg(text: string, methodName: string): string | undefined {
  const pattern = new RegExp(`${methodName}\\(\\s*(\\/.+\\/[a-z]*|['"][^'"]+['"])`);
  return text.match(pattern)?.[1];
}

function parseName(value: string): string | RegExp {
  if (value.startsWith('/')) {
    const lastSlash = value.lastIndexOf('/');
    return new RegExp(value.slice(1, lastSlash), value.slice(lastSlash + 1));
  }

  return value.slice(1, -1);
}

function defaultActionTimeoutMs(): number {
  return Math.min(10000, Math.max(3000, Math.floor(config.pageTimeout / 3)));
}

function tryWriteLocatorReplacement(failedSelector: string, replacement: string): string | undefined {
  const oldFragments = getOldSelectorFragments(failedSelector);
  if (!oldFragments.length) {
    return undefined;
  }

  const locatorDir = path.resolve('src', 'uistore');
  const files = fs.readdirSync(locatorDir).filter((file) => file.endsWith('Locators.ts'));

  for (const file of files) {
    const filePath = path.join(locatorDir, file);
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    const lineIndex = lines.findIndex((line) => oldFragments.some((fragment) => line.includes(fragment)));

    if (lineIndex === -1) {
      continue;
    }

    const replacementExpression = `this.page.${replacement.replace(/^page\./, '')}`;
    lines[lineIndex] = lines[lineIndex].includes('return ')
      ? lines[lineIndex].replace(/return\s+.*;/, `return ${replacementExpression};`)
      : lines[lineIndex].replace(/this\.page\..*/, `${replacementExpression};`);
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    return file;
  }

  return undefined;
}

function getOldSelectorFragments(failedSelector: string): string[] {
  const locatorMatch = failedSelector.match(/locator\(['"]([^'"]+)['"]\)/);
  if (locatorMatch?.[1]) {
    return [locatorMatch[1], `locator('${locatorMatch[1]}')`, `locator("${locatorMatch[1]}")`];
  }

  const normalized = failedSelector.replace(/^page\./, '').trim();
  const fragments = [normalized];
  if (normalized.includes('(')) {
    fragments.push(`this.page.${normalized}`);
  }

  return fragments.filter(Boolean);
}
