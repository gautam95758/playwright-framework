import { Page } from '@playwright/test';
import logger from './Logger';

export type DomStrategy = 'role' | 'keyword' | 'main' | 'body';

export type StrategyDecision = {
  strategy: DomStrategy;
  searchTerm: string;
};

export type DomExtractionResult = {
  strategy: DomStrategy;
  searchTerm: string;
  html: string;
  charsSent: number;
};

const STRATEGIES: DomStrategy[] = ['role', 'keyword', 'main', 'body'];

export class DomExtractor {
  async extractForFailedSelector(page: Page, failedSelector: string, error: Error): Promise<DomExtractionResult> {
    const decision = await this.chooseStrategy(failedSelector, error);
    const raw = await this.runStrategy(page, decision);
    const html = this.cleanHtml(raw);

    logger.info(`[AI-DOM] Prepared ${html.length} DOM chars via strategy "${decision.strategy}"`);

    return {
      strategy: decision.strategy,
      searchTerm: decision.searchTerm,
      html,
      charsSent: html.length,
    };
  }

  cleanHtml(html: string): string {
    const stripped = html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, '')
      .replace(/\sstyle=(["']).*?\1/gi, '')
      .replace(/\sdata-(?!testid\b)[a-z0-9_-]+=(["']).*?\1/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (stripped.length <= 2000) {
      return stripped;
    }

    const capped = stripped.slice(0, 2000);
    const lastClose = capped.lastIndexOf('>');
    return lastClose > 0 ? capped.slice(0, lastClose + 1) : capped;
  }

  private async chooseStrategy(failedSelector: string, _error: Error): Promise<StrategyDecision> {
    return {
      strategy: inferStrategy(failedSelector),
      searchTerm: extractSearchTerm(failedSelector),
    };
  }

  private async runStrategy(page: Page, decision: StrategyDecision): Promise<string> {
    const searchTerm = cssSafe(decision.searchTerm);

    if (decision.strategy === 'role') {
      return page
        .locator('[role="button"],[role="link"]')
        .filter({ hasText: decision.searchTerm })
        .first()
        .evaluate((element) => element.parentElement?.parentElement?.outerHTML || '')
        .catch(() => '');
    }

    if (decision.strategy === 'keyword') {
      const html = await page
        .locator(
          `[class*="${searchTerm}" i],[id*="${searchTerm}" i],[aria-label*="${searchTerm}" i],[placeholder*="${searchTerm}" i],[name*="${searchTerm}" i]`,
        )
        .first()
        .evaluate((element) => element.parentElement?.outerHTML || element.outerHTML || '')
        .catch(() => '');

      return html || collectInteractiveCandidates(page, decision.searchTerm);
    }

    if (decision.strategy === 'main') {
      return page
        .evaluate(() => document.querySelector('main,[role="main"],#content,.content')?.innerHTML?.slice(0, 2000) || '')
        .catch(() => '');
    }

    return page.evaluate(() => document.body.innerHTML.slice(0, 2000)).catch(() => '');
  }
}

function extractSearchTerm(selector: string): string {
  const singleArg = selector.match(/getBy(?:Text|Label|Placeholder|Title|AltText)\((\/.+\/[a-z]*|['"][^'"]+['"])/i)?.[1];
  if (singleArg) {
    return cleanLocatorArgument(singleArg).split(/\s+/)[0] || 'search';
  }

  return selector
    .replace(/getBy(Role|TestId|Text|Label|Placeholder|Title)\W*/gi, ' ')
    .replace(/[^a-z0-9_-]+/gi, ' ')
    .trim()
    .split(/\s+/)[0] || 'button';
}

function inferStrategy(selector: string): DomStrategy {
  if (/getBy(Role|Text|Label|Placeholder|Title|AltText)/i.test(selector)) {
    return 'keyword';
  }
  if (/main|content/i.test(selector)) {
    return 'main';
  }
  return 'keyword';
}

function cleanLocatorArgument(value: string): string {
  if (value.startsWith('/')) {
    const lastSlash = value.lastIndexOf('/');
    return value
      .slice(1, lastSlash)
      .replace(/\\[wds]/gi, ' ')
      .replace(/[^a-z0-9_-]+/gi, ' ')
      .trim();
  }

  return value.slice(1, -1).replace(/[^a-z0-9_-]+/gi, ' ').trim();
}

async function collectInteractiveCandidates(page: Page, searchTerm: string): Promise<string> {
  return page
    .evaluate((term) => {
      const normalizedTerm = String(term || '').toLowerCase();
      const elements = Array.from(
        document.querySelectorAll('input, textarea, button, a, select, [role], [aria-label], [placeholder], [data-testid], [data-test], [data-qa]'),
      );

      const normalize = (value: string | null | undefined) => String(value || '').replace(/\s+/g, ' ').trim();
      const score = (element: Element): number => {
        const haystack = [
          element.tagName,
          element.textContent,
          element.getAttribute('role'),
          element.getAttribute('aria-label'),
          element.getAttribute('placeholder'),
          element.getAttribute('name'),
          element.getAttribute('id'),
          element.getAttribute('data-testid'),
          element.getAttribute('data-test'),
          element.getAttribute('data-qa'),
        ].map(normalize).join(' ').toLowerCase();

        if (!normalizedTerm) return 1;
        if (haystack.includes(normalizedTerm)) return 3;
        if (element.matches('input, textarea, [placeholder]')) return 2;
        return 1;
      };

      return elements
        .map((element) => ({ element, score: score(element) }))
        .filter((entry) => entry.score > 1)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
        .map((entry) => entry.element.outerHTML)
        .join('\n');
    }, searchTerm)
    .catch(() => '');
}

function cssSafe(value: string): string {
  return value.replace(/["\\]/g, '').slice(0, 60);
}

export const domExtractor = new DomExtractor();
