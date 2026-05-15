import fs from 'fs';
import path from 'path';
import { Page } from '@playwright/test';
import { config } from '../../config/config';
import { geminiClient } from './GeminiClient';
import logger from './Logger';

type LocatorFailureInput = {
  page: Page;
  action: string;
  selector: string;
  error: Error;
};

type CandidateElement = {
  tag: string;
  text: string;
  role: string | null;
  ariaLabel: string | null;
  placeholder: string | null;
  testId: string | null;
  id: string;
  name: string | null;
  href: string | null;
  type: string | null;
  className: string;
};

type LocatorFailureContext = {
  url: string;
  title: string;
  action: string;
  selector: string;
  errorMessage: string;
  matchingElementCount: number | null;
  matchingElements: CandidateElement[];
  candidateElements: CandidateElement[];
};

const LOCATOR_FAILURE_PATTERNS = [
  /timeout/i,
  /waiting for locator/i,
  /strict mode violation/i,
  /not visible/i,
  /not enabled/i,
  /not attached/i,
  /element is outside/i,
  /target page.*closed/i,
];

export class GeminiFailureAnalyzer {
  async analyzeLocatorFailure(input: LocatorFailureInput): Promise<void> {
    if (!config.gemini.locatorAnalysisEnabled) {
      logger.info('Gemini locator analysis is disabled by GEMINI_LOCATOR_ANALYSIS=false');
      return;
    }

    if (!geminiClient.isConfigured()) {
      logger.info('Skipping Gemini locator analysis because GEMINI_API_KEY is not configured');
      return;
    }

    if (!this.isLocatorOrWaitFailure(input.error)) {
      logger.info(`Skipping Gemini locator analysis for non-locator failure | Action: "${input.action}"`);
      return;
    }

    try {
      const context = await this.captureContext(input);
      const prompt = this.buildPrompt(context);
      const suggestion = await geminiClient.generateText(prompt, {
        temperature: 0.1,
        maxOutputTokens: 1600,
      });

      const reportPath = this.writeReport(context, suggestion);
      logger.info(`Gemini locator analysis saved | Path: "${reportPath}"`);
    } catch (e) {
      logger.error(`Gemini locator analysis failed | Error: ${(e as Error).message}`);
    }
  }

  private isLocatorOrWaitFailure(error: Error): boolean {
    const message = error.message || '';
    return LOCATOR_FAILURE_PATTERNS.some((pattern) => pattern.test(message));
  }

  private async captureContext(input: LocatorFailureInput): Promise<LocatorFailureContext> {
    const page = input.page;

    if (page.isClosed()) {
      return {
        url: '<page closed>',
        title: '<page closed>',
        action: input.action,
        selector: input.selector,
        errorMessage: input.error.message,
        matchingElementCount: null,
        matchingElements: [],
        candidateElements: [],
      };
    }

    const locator = page.locator(input.selector);
    const matchingElementCount = await locator.count().catch(() => null);
    const matchingElements = await locator
      .evaluateAll((elements) => elements.slice(0, 10).map((element) => {
        const htmlElement = element as HTMLElement;
        const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().slice(0, 180);
        return {
          tag: element.tagName.toLowerCase(),
          text: normalize(htmlElement.innerText || element.textContent || ''),
          role: element.getAttribute('role'),
          ariaLabel: element.getAttribute('aria-label'),
          placeholder: element.getAttribute('placeholder'),
          testId: element.getAttribute('data-testid') || element.getAttribute('data-test') || element.getAttribute('data-qa'),
          id: element.id || '',
          name: element.getAttribute('name'),
          href: element.getAttribute('href'),
          type: element.getAttribute('type'),
          className: String(element.getAttribute('class') || ''),
        };
      }))
      .catch(() => []);

    const candidateLimit = Math.max(10, config.gemini.locatorContextLimit);
    const candidateElements = await page
      .locator('a, button, input, select, textarea, [role], [aria-label], [data-testid], [data-test], [data-qa]')
      .evaluateAll((elements, limit) => elements.slice(0, limit as number).map((element) => {
        const htmlElement = element as HTMLElement;
        const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().slice(0, 180);
        return {
          tag: element.tagName.toLowerCase(),
          text: normalize(htmlElement.innerText || element.textContent || ''),
          role: element.getAttribute('role'),
          ariaLabel: element.getAttribute('aria-label'),
          placeholder: element.getAttribute('placeholder'),
          testId: element.getAttribute('data-testid') || element.getAttribute('data-test') || element.getAttribute('data-qa'),
          id: element.id || '',
          name: element.getAttribute('name'),
          href: element.getAttribute('href'),
          type: element.getAttribute('type'),
          className: String(element.getAttribute('class') || ''),
        };
      }), candidateLimit)
      .catch(() => []);

    return {
      url: page.url(),
      title: await page.title().catch(() => ''),
      action: input.action,
      selector: input.selector,
      errorMessage: input.error.message,
      matchingElementCount,
      matchingElements,
      candidateElements,
    };
  }

  private buildPrompt(context: LocatorFailureContext): string {
    return [
      'You are reviewing a Playwright/Cucumber UI test failure for Reliance Jewels.',
      'The test failed during a locator or wait action. Suggest stable Playwright locator improvements and timing fixes.',
      'Prefer role, label, placeholder, text, test id, or scoped CSS locators. Avoid brittle absolute XPath.',
      'Do not invent application behavior. Return concise JSON with keys: probableCause, recommendedLocator, waitStrategy, assertionToAdd, codeSnippet.',
      '',
      JSON.stringify(context, null, 2),
    ].join('\n');
  }

  private writeReport(context: LocatorFailureContext, suggestion: string): string {
    const reportDir = path.resolve('reports', 'gemini-locator-suggestions');
    fs.mkdirSync(reportDir, { recursive: true });

    const safeAction = context.action.replace(/[^a-z0-9_-]/gi, '_').slice(0, 40);
    const fileName = `${new Date().toISOString().replace(/[:.]/g, '-')}-${safeAction}.json`;
    const reportPath = path.join(reportDir, fileName);

    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          context,
          suggestion,
        },
        null,
        2,
      ),
      'utf8',
    );

    return reportPath;
  }
}

export const geminiFailureAnalyzer = new GeminiFailureAnalyzer();
