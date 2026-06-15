import fs from 'fs';
import path from 'path';
import { Page } from '@playwright/test';
import { config } from '../../config/config';
import appPatterns from '../../config/appPatterns.json';
import { domExtractor, DomExtractionResult } from './DomExtractor';
import { geminiClient } from './GeminiClient';
import logger from './Logger';

export type SelectorSuggestion = {
  suggestedSelectors: string[];
  reason: string;
  confidence: number;
};

export type ScenarioFailureInput = {
  scenario: string;
  feature: string;
  failedStepText: string;
  error: Error;
  page: Page;
  consoleErrors: string[];
  visualDiff?: string;
  selfHealed?: boolean;
  domExtraction?: DomExtractionResult;
};

export type ScenarioFailureAnalysis = {
  rootCause: string;
  category: 'locator' | 'assertion' | 'navigation' | 'dependency' | 'data' | 'race-condition' | 'missing-await' | 'environment';
  file: string;
  step: string;
  suggestedFix: string;
  confidence: 'High' | 'Medium' | 'Low';
  missingAwaitDetected: boolean;
  commonCauseGroup: string;
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
  isLocatorOrWaitFailure(error: Error): boolean {
    return LOCATOR_FAILURE_PATTERNS.some((pattern) => pattern.test(error.message || ''));
  }

  async suggestSelectors(input: {
    page: Page;
    action: string;
    failedSelector: string;
    error: Error;
  }): Promise<{ suggestion?: SelectorSuggestion; extraction?: DomExtractionResult; visionSuggestion?: string }> {
    if (!config.gemini.locatorAnalysisEnabled || !geminiClient.isConfigured()) {
      logger.info('Skipping Gemini selector suggestion because Gemini is disabled or not configured');
      return {};
    }

    const extraction = await domExtractor.extractForFailedSelector(input.page, input.failedSelector, input.error);

    const suggestion = await geminiClient.generateJson<SelectorSuggestion>(
      {
        action: input.action,
        failedSelector: input.failedSelector,
        error: input.error.message,
        appPatterns,
        domSlice: extraction.html || '(No exact DOM match found. Suggest from failed selector text, URL, and app patterns.)',
        task: 'suggest 3 alternative Playwright locators ranked by reliability. prefer getByRole > getByTestId > CSS. return ONLY JSON: { suggestedSelectors: string[], reason: string, confidence: number (0-1) }',
      },
      { maxOutputTokens: 1200 },
    );

    return { suggestion, extraction };
  }

  async analyzeScenarioFailure(input: ScenarioFailureInput): Promise<ScenarioFailureAnalysis> {
    const fallback = this.fallbackAnalysis(input);

    if (!geminiClient.isConfigured()) {
      return fallback;
    }

    const logTail = readLogTail(path.resolve('logs', 'test.log'), 20).map(compactLogLine);
    const pageUrl = input.page.isClosed() ? '<page closed>' : input.page.url();
    const pageTitle = input.page.isClosed() ? '<page closed>' : await input.page.title().catch(() => '');

    const analysis = await geminiClient
      .generateJson<ScenarioFailureAnalysis>(
        {
          scenario: input.scenario,
          feature: input.feature,
          failedStepText: input.failedStepText,
          errorMessage: input.error.message,
          stack: input.error.stack?.slice(0, 2500),
          url: pageUrl,
          title: pageTitle,
          consoleErrors: input.consoleErrors.slice(-10).map((error) => error.slice(0, 500)),
          last50LogLines: logTail,
          task: [
            'Return ONLY one compact JSON object.',
            'Do not quote long terminal logs, HTML attachments, screenshots, traces, or stack blocks inside field values.',
            'Keep every string field under 220 characters.',
            'Use this shape exactly: { rootCause: string, category: "locator|assertion|navigation|dependency|data|race-condition|missing-await|environment", file: string, step: string, suggestedFix: string, confidence: "High|Medium|Low", missingAwaitDetected: boolean, commonCauseGroup: string }',
          ].join(' '),
        },
        { maxOutputTokens: 900 },
      )
      .catch((error) => {
        logger.error(`Gemini scenario failure analysis failed | Error: ${(error as Error).message}`);
        return fallback;
      });

    return analysis;
  }

  renderFailureCard(input: ScenarioFailureInput, analysis: ScenarioFailureAnalysis): string {
    const terminalLines = readLogTail(path.resolve('logs', 'test.log'), 20).join('\n');
    const consoleErrors = input.consoleErrors.length ? input.consoleErrors.join('\n') : 'None captured';

    return `
<section style="border:1px solid #fca5a5;border-radius:8px;padding:14px;font-family:Arial,sans-serif;background:#fff7f7;color:#111827">
  <h3 style="margin:0 0 10px;color:#b91c1c">Root cause summary</h3>
  <p><strong>Root cause:</strong> ${escapeHtml(analysis.rootCause)}</p>
  <p><strong>Category:</strong> ${escapeHtml(analysis.category)}</p>
  <p><strong>File + step:</strong> ${escapeHtml(analysis.file)} - ${escapeHtml(analysis.step)}</p>
  <p><strong>Suggested fix:</strong> ${escapeHtml(analysis.suggestedFix)}</p>
  <p><strong>Confidence:</strong> ${escapeHtml(analysis.confidence)}</p>
  ${analysis.missingAwaitDetected ? '<p><strong>Missing await detected:</strong> Yes</p>' : ''}
  <p><strong>URL:</strong> ${escapeHtml(input.page.isClosed() ? '<page closed>' : input.page.url())}</p>
  <p><strong>Browser console errors:</strong></p>
  <pre style="white-space:pre-wrap;background:#fff;padding:8px;border-radius:6px">${escapeHtml(consoleErrors)}</pre>
  <p><strong>Last 20 terminal log lines:</strong></p>
  <pre style="white-space:pre-wrap;background:#fff;padding:8px;border-radius:6px">${escapeHtml(terminalLines)}</pre>
</section>`;
  }

  private fallbackAnalysis(input: ScenarioFailureInput): ScenarioFailureAnalysis {
    const category = this.isLocatorOrWaitFailure(input.error) ? 'locator' : 'environment';
    return {
      rootCause: input.error.message,
      category,
      file: input.feature,
      step: input.failedStepText,
      suggestedFix: category === 'locator' ? 'Review the failed locator and prefer role/test id selectors.' : 'Review the stack trace and environment state.',
      confidence: 'Low',
      missingAwaitDetected: /await/i.test(input.error.message) && /promise|timeout/i.test(input.error.message),
      commonCauseGroup: category,
    };
  }

}

function readLogTail(filePath: string, lines: number): string[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).slice(-lines);
}

function compactLogLine(line: string): string {
  return line
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 300);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const geminiFailureAnalyzer = new GeminiFailureAnalyzer();
