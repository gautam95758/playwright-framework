import { Page, Locator } from '@playwright/test';
import logger from './Logger';
import { geminiFailureAnalyzer } from './GeminiFailureAnalyzer';

export class PlaywrightHelper {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
    logger.info('PlaywrightHelper initialized');
  }

  async waitUntilElementIsVisible(selector: string, timeoutInSeconds = 20): Promise<void> {
    logger.info(`Waiting for element to be visible | Selector: "${selector}" | Timeout: ${timeoutInSeconds}s`);
    try {
      await this.page.locator(selector).waitFor({ state: 'visible', timeout: timeoutInSeconds * 1000 });
      logger.info(`Element is now visible | Selector: "${selector}"`);
    } catch (e) {
      logger.error(`Element NOT visible after ${timeoutInSeconds}s | Selector: "${selector}" | Error: ${(e as Error).message}`);
      await this.analyzeLocatorFailure('waitUntilElementIsVisible', selector, e as Error);
      throw e;
    }
  }

  async clickElement(selector: string): Promise<void> {
    logger.info(`Attempting to click element | Selector: "${selector}"`);
    try {
      const text = await this.page.locator(selector).innerText().catch(() => '');
      await this.page.locator(selector).click();
      logger.info(`Successfully clicked element | Selector: "${selector}" | Text: "${text.trim()}"`);
    } catch (e) {
      logger.error(`Failed to click element | Selector: "${selector}" | Error: ${(e as Error).message}`);
      await this.analyzeLocatorFailure('clickElement', selector, e as Error);
      throw e;
    }
  }

  async typeIntoElement(selector: string, text: string): Promise<void> {
    logger.info(`Attempting to type into element | Selector: "${selector}" | Value: "${text}"`);
    try {
      await this.page.locator(selector).fill(text);
      logger.info(`Successfully typed into element | Selector: "${selector}" | Value: "${text}"`);
    } catch (e) {
      logger.error(`Failed to type into element | Selector: "${selector}" | Error: ${(e as Error).message}`);
      await this.analyzeLocatorFailure('typeIntoElement', selector, e as Error);
      throw e;
    }
  }

  async retrieveElementText(selector: string): Promise<string> {
    logger.info(`Retrieving text from element | Selector: "${selector}"`);
    try {
      const text = await this.page.locator(selector).innerText();
      logger.info(`Successfully retrieved text | Selector: "${selector}" | Text: "${text.trim()}"`);
      return text;
    } catch (e) {
      logger.error(`Failed to retrieve text | Selector: "${selector}" | Error: ${(e as Error).message}`);
      await this.analyzeLocatorFailure('retrieveElementText', selector, e as Error);
      throw e;
    }
  }

  async pressEnterKey(selector: string): Promise<void> {
    logger.info(`Pressing ENTER key on element | Selector: "${selector}"`);
    try {
      await this.page.locator(selector).press('Enter');
      logger.info(`Successfully pressed ENTER key | Selector: "${selector}"`);
    } catch (e) {
      logger.error(`Failed to press ENTER key | Selector: "${selector}" | Error: ${(e as Error).message}`);
      await this.analyzeLocatorFailure('pressEnterKey', selector, e as Error);
      throw e;
    }
  }

  async hoverOnElement(selector: string): Promise<void> {
    logger.info(`Attempting to hover over element | Selector: "${selector}"`);
    try {
      const text = await this.page.locator(selector).innerText().catch(() => '');
      await this.page.locator(selector).hover();
      logger.info(`Successfully hovered over element | Selector: "${selector}" | Text: "${text.trim()}"`);
    } catch (e) {
      logger.error(`Failed to hover over element | Selector: "${selector}" | Error: ${(e as Error).message}`);
      await this.analyzeLocatorFailure('hoverOnElement', selector, e as Error);
      throw e;
    }
  }

  async switchToChildWindow(): Promise<Page> {
    logger.info('Attempting to switch to child window');
    try {
      const [newPage] = await Promise.all([
        this.page.context().waitForEvent('page'),
      ]);
      await newPage.waitForLoadState();
      logger.info(`Successfully switched to child window | URL: "${newPage.url()}"`);
      return newPage;
    } catch (e) {
      logger.error(`Failed to switch to child window | Error: ${(e as Error).message}`);
      throw e;
    }
  }

  async findElementsByXpath(xpath: string): Promise<Locator[]> {
    logger.info(`Finding elements by XPath | XPath: "${xpath}"`);
    try {
      const locator = this.page.locator(`xpath=${xpath}`);
      const count = await locator.count();
      logger.info(`Found ${count} element(s) | XPath: "${xpath}"`);
      return Array.from({ length: count }, (_, i) => locator.nth(i));
    } catch (e) {
      logger.error(`Failed to find elements | XPath: "${xpath}" | Error: ${(e as Error).message}`);
      throw e;
    }
  }

  async scrollInWebPage(direction: 'vertical' | 'horizontal', pixels: number): Promise<void> {
    logger.info(`Scrolling page | Direction: "${direction}" | Pixels: ${pixels}`);
    try {
      if (direction === 'vertical') {
        await this.page.evaluate((px) => window.scrollBy(0, px), pixels);
      } else {
        await this.page.evaluate((px) => window.scrollBy(px, 0), pixels);
      }
      logger.info(`Successfully scrolled | Direction: "${direction}" | Pixels: ${pixels}`);
    } catch (e) {
      logger.error(`Failed to scroll | Direction: "${direction}" | Error: ${(e as Error).message}`);
      throw e;
    }
  }

  async scrollInWebPageEnd(): Promise<void> {
    logger.info('Scrolling to end of page');
    try {
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      logger.info('Successfully scrolled to end of page');
    } catch (e) {
      logger.error(`Failed to scroll to end of page | Error: ${(e as Error).message}`);
      throw e;
    }
  }

  async scrollInWebPageTop(): Promise<void> {
    logger.info('Scrolling to top of page');
    try {
      await this.page.evaluate(() => window.scrollTo(0, 0));
      logger.info('Successfully scrolled to top of page');
    } catch (e) {
      logger.error(`Failed to scroll to top of page | Error: ${(e as Error).message}`);
      throw e;
    }
  }

  async scrollInWebPageTillVisible(selector: string): Promise<void> {
    logger.info(`Scrolling until element is visible | Selector: "${selector}"`);
    try {
      await this.page.locator(selector).scrollIntoViewIfNeeded();
      logger.info(`Successfully scrolled element into view | Selector: "${selector}"`);
    } catch (e) {
      logger.error(`Failed to scroll element into view | Selector: "${selector}" | Error: ${(e as Error).message}`);
      await this.analyzeLocatorFailure('scrollInWebPageTillVisible', selector, e as Error);
      throw e;
    }
  }

  async javascriptExecutorClick(selector: string): Promise<void> {
    logger.info(`Attempting JavaScript click on element | Selector: "${selector}"`);
    try {
      const element = this.page.locator(selector);
      await element.evaluate((el) => (el as HTMLElement).click());
      logger.info(`Successfully performed JavaScript click | Selector: "${selector}"`);
    } catch (e) {
      logger.error(`Failed JavaScript click | Selector: "${selector}" | Error: ${(e as Error).message}`);
      await this.analyzeLocatorFailure('javascriptExecutorClick', selector, e as Error);
      throw e;
    }
  }

  async clearTextInputField(selector: string): Promise<void> {
    logger.info(`Clearing input field | Selector: "${selector}"`);
    try {
      await this.page.locator(selector).clear();
      logger.info(`Successfully cleared input field | Selector: "${selector}"`);
    } catch (e) {
      logger.error(`Failed to clear input field | Selector: "${selector}" | Error: ${(e as Error).message}`);
      await this.analyzeLocatorFailure('clearTextInputField', selector, e as Error);
      throw e;
    }
  }

  async verifyEquals(actual: string, expected: string, description: string): Promise<void> {
    logger.info(`Verifying equals | Description: "${description}"`);
    logger.info(`  Expected : "${expected}"`);
    logger.info(`  Actual   : "${actual}"`);
    if (actual !== expected) {
      logger.error(`ASSERTION FAILED | Description: "${description}" | Expected: "${expected}" | Actual: "${actual}"`);
      throw new Error(`[FAIL] ${description}\n  Expected: "${expected}"\n  Actual:   "${actual}"`);
    }
    logger.info(`ASSERTION PASSED | Description: "${description}"`);
  }

  async verifyTrue(condition: boolean, description: string): Promise<void> {
    logger.info(`Verifying condition is TRUE | Description: "${description}" | Condition: ${condition}`);
    if (!condition) {
      logger.error(`ASSERTION FAILED | Description: "${description}" | Condition was false`);
      throw new Error(`[FAIL] ${description} - condition was false`);
    }
    logger.info(`ASSERTION PASSED | Description: "${description}"`);
  }

  async verifyFalse(condition: boolean, description: string): Promise<void> {
    logger.info(`Verifying condition is FALSE | Description: "${description}" | Condition: ${condition}`);
    if (condition) {
      logger.error(`ASSERTION FAILED | Description: "${description}" | Condition was true (expected false)`);
      throw new Error(`[FAIL] ${description} - condition was true (expected false)`);
    }
    logger.info(`ASSERTION PASSED | Description: "${description}"`);
  }

  async retryFailedTestCase(action: () => Promise<void>, maxRetries: number): Promise<void> {
    logger.info(`Starting retry mechanism | Max retries: ${maxRetries}`);
    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Retry attempt ${attempt} of ${maxRetries}`);
        await action();
        logger.info(`Action succeeded on attempt ${attempt}`);
        return;
      } catch (e) {
        lastError = e as Error;
        logger.error(`Attempt ${attempt} failed | Error: ${lastError.message}`);
      }
    }
    logger.error(`All ${maxRetries} attempts failed`);
    throw lastError;
  }

  async getPageTitle(): Promise<string> {
    try {
      const title = await this.page.title();
      logger.info(`Retrieved page title | Title: "${title}"`);
      return title;
    } catch (e) {
      logger.error(`Failed to get page title | Error: ${(e as Error).message}`);
      throw e;
    }
  }

  getCurrentUrl(): string {
    const url = this.page.url();
    logger.info(`Retrieved current URL | URL: "${url}"`);
    return url;
  }

  async takeScreenshot(name: string): Promise<Buffer> {
    logger.info(`Taking screenshot | Name: "${name}"`);
    try {
      const buffer = await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: false });
      logger.info(`Screenshot saved successfully | Path: "screenshots/${name}.png"`);
      return buffer;
    } catch (e) {
      logger.error(`Failed to take screenshot | Name: "${name}" | Error: ${(e as Error).message}`);
      throw e;
    }
  }

  private async analyzeLocatorFailure(action: string, selector: string, error: Error): Promise<void> {
    await geminiFailureAnalyzer.analyzeLocatorFailure({
      page: this.page,
      action,
      selector,
      error,
    });
  }
}
