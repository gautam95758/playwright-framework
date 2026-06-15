/**
 * geminiHealAndRerun.ts
 *
 * After a normal test run this script:
 *  1. Reads the Playwright last-run JSON to find every failing spec file.
 *  2. For each failure it reads the error-context.md Playwright writes to
 *     test-results/ so it has the exact failed selector + error message.
 *  3. Asks Gemini for alternative locators, writes the winning one back into
 *     src/uistore/<File>Locators.ts.
 *  4. Reruns ONLY the failing tests (playwright test --last-failed).
 *  5. Prints a tidy heal summary and exits with the rerun exit code.
 *
 * Usage (add to package.json scripts):
 *   "heal":        "ts-node scripts/geminiHealAndRerun.ts"
 *   "test:heal":   "ts-node scripts/runTests.ts && ts-node scripts/geminiHealAndRerun.ts"
 *
 * The script is a no-op when all tests passed (exits 0 immediately).
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { chromium } from '@playwright/test';
import { config } from '../config/config';
import { geminiClient } from '../src/utils/GeminiClient';
import { domExtractor } from '../src/utils/DomExtractor';
import logger from '../src/utils/Logger';
import appPatterns from '../config/appPatterns.json';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LastRunJson = {
  status: 'passed' | 'failed' | 'interrupted';
  failedTests?: string[]; // relative paths to .spec files
};

type HealRecord = {
  specFile: string;
  failedSelector: string;
  newSelector: string;
  locatorFile: string;
  confidence: number;
  healed: boolean;
  reason: string;
};

type SelectorSuggestion = {
  suggestedSelectors: string[];
  reason: string;
  confidence: number;
};

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

void main();

async function main(): Promise<void> {
  if (!geminiClient.isConfigured()) {
    logger.warn('[HEAL] GEMINI_API_KEY is not set – skipping heal-and-rerun.');
    process.exit(0);
  }

  // 1. Check whether there are failing tests from the most recent run
  const lastRunPath = path.resolve('test-results', '.last-run.json');
  if (!fs.existsSync(lastRunPath)) {
    logger.info('[HEAL] No .last-run.json found – nothing to heal.');
    process.exit(0);
  }

  const lastRun = readJson<LastRunJson>(lastRunPath);
  if (lastRun.status === 'passed') {
    logger.info('[HEAL] All tests passed – no healing required.');
    process.exit(0);
  }

  // 2. Collect failure metadata from the error-context.md files Playwright
  //    writes into each test-results/<test-slug>/ directory.
  const failureMeta = collectFailureMeta();
  if (!failureMeta.length) {
    logger.info('[HEAL] Could not extract failure metadata – skipping selector healing.');
    runRerun(); // still rerun so Playwright marks tests properly
    return;
  }

  logger.info(`[HEAL] Found ${failureMeta.length} failure context(s) to analyse.`);

  // 3. Open a lightweight browser session to query live DOM for each failure
  const browser = await chromium.launch({ headless: config.headless });
  const healRecords: HealRecord[] = [];

  for (const meta of failureMeta) {
    logger.info(`[HEAL] Analysing: ${meta.specSlug}`);

    const record = await attemptHeal(meta, browser);
    healRecords.push(record);

    if (record.healed) {
      logger.info(
        `[HEAL] ✅  Healed "${record.failedSelector}" → "${record.newSelector}" in ${record.locatorFile}`,
      );
    } else {
      logger.warn(`[HEAL] ⚠️  Could not auto-heal "${record.failedSelector}": ${record.reason}`);
    }
  }

  await browser.close();

  // 4. Persist a heal summary next to the other AI reports
  persistHealSummary(healRecords);

  const healedCount = healRecords.filter((r) => r.healed).length;
  logger.info(`[HEAL] Healed ${healedCount}/${healRecords.length} selector(s). Re-running failed tests…`);

  // 5. Rerun only the tests that previously failed
  const exitCode = runRerun();
  process.exit(exitCode);
}

// ---------------------------------------------------------------------------
// Failure metadata collection
// ---------------------------------------------------------------------------

type FailureMeta = {
  specSlug: string;
  errorMessage: string;
  failedSelector: string;
  pageUrl: string;
};

function collectFailureMeta(): FailureMeta[] {
  const resultsDir = path.resolve('test-results');
  if (!fs.existsSync(resultsDir)) return [];

  const metas: FailureMeta[] = [];
  const logSelectorMap = buildSelectorMapFromLogs();
  logger.info(`[HEAL-DEBUG] logSelectorMap entries: ${logSelectorMap.length}`);
  if (logSelectorMap.length) {
    logger.info(`[HEAL-DEBUG] last log selector: ${logSelectorMap[logSelectorMap.length - 1].selector}`);
  }

  fs.readdirSync(resultsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .forEach((dir) => {
      const contextPath = path.join(resultsDir, dir.name, 'error-context.md');
      if (!fs.existsSync(contextPath)) return;

      const content = fs.readFileSync(contextPath, 'utf8');

      let failedSelector = extractFailedSelector(content);
      let errorMessage = extractSection(content, 'Error') || extractSection(content, 'error') || '';

      logger.info(`[HEAL-DEBUG] dir=${dir.name} extracted from md="${failedSelector}"`);

      // Fallback: timeout failures don't include the selector in error-context.md.
      // PlaywrightHelper logs "<action> failed | Selector: <selector> | Error: <message>"
      // to logs/error.log and logs/test.log — use the most recent one as a fallback.
      if (!failedSelector && logSelectorMap.length) {
        const last = logSelectorMap[logSelectorMap.length - 1];
        failedSelector = last.selector;
        if (!errorMessage) errorMessage = last.error;
      }

      logger.info(`[HEAL-DEBUG] dir=${dir.name} final failedSelector="${failedSelector}"`);

      metas.push({
        specSlug: dir.name,
        errorMessage,
        failedSelector,
        pageUrl: extractSection(content, 'page url') || config.baseUrl,
      });
    });

  return metas;
}

/**
 * Parses logs/error.log (falling back to logs/test.log) for lines of the form:
 *   "<action> failed | Selector: <selector> | Error: <message>"
 * Returns them in file order (oldest -> newest).
 */
function buildSelectorMapFromLogs(): Array<{ selector: string; error: string }> {
  const candidates = [path.resolve('logs', 'error.log'), path.resolve('logs', 'test.log')];
  const logPath = candidates.find((p) => fs.existsSync(p));
  if (!logPath) return [];

  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split(/\r?\n/);
  const pattern = /failed \| Selector:\s*(.+?)\s*\|\s*Error:\s*(.+)$/;

  const results: Array<{ selector: string; error: string }> = [];
  for (const line of lines) {
    const match = line.match(pattern);
    if (match) {
      results.push({ selector: match[1].trim(), error: match[2].trim() });
    }
  }
  return results;
}

function extractSection(content: string, heading: string): string {
  const regex = new RegExp(`#+\\s*${heading}[:\\s]*\\n([\\s\\S]*?)(?=\\n#+|$)`, 'i');
  return content.match(regex)?.[1]?.trim() || '';
}

function extractFailedSelector(content: string): string {
  // Playwright writes "waiting for locator('...')" or similar in the error block
  const patterns = [
    /locator\(['"]([^'"]+)['"]\)/,
    /getByRole\([^)]+\)/,
    /getByTestId\(['"]([^'"]+)['"]\)/,
    /getByText\(['"]([^'"]+)['"]\)/,
    /getByPlaceholder\([^)]+\)/,
    /getByLabel\([^)]+\)/,
    /getByAltText\([^)]+\)/,
    /getByTitle\([^)]+\)/,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) return match[0];
  }

  // Fall back: grab the first quoted CSS-like string inside the error block
  const errorBlock = extractSection(content, 'Error');
  const cssLike = errorBlock.match(/['"]([.#\[][^'"]{3,})['"]/);
  return cssLike?.[1] || '';
}

// ---------------------------------------------------------------------------
// Healing logic
// ---------------------------------------------------------------------------

async function attemptHeal(
  meta: FailureMeta,
  browser: Awaited<ReturnType<typeof chromium.launch>>,
): Promise<HealRecord> {
  const base: Omit<HealRecord, 'healed' | 'newSelector' | 'locatorFile' | 'confidence' | 'reason'> = {
    specFile: meta.specSlug,
    failedSelector: meta.failedSelector,
  };

  if (!meta.failedSelector) {
    return { ...base, healed: false, newSelector: '', locatorFile: '', confidence: 0, reason: 'Could not extract failed selector from error context' };
  }

  // Open the page in a real browser so DomExtractor can query live DOM
  let domSlice = '';
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(meta.pageUrl, { waitUntil: 'domcontentloaded', timeout: config.pageTimeout });
    const error = new Error(meta.errorMessage);
    const extraction = await domExtractor.extractForFailedSelector(page, meta.failedSelector, error);
    domSlice = extraction.html;
    await page.close();
  } catch (err) {
    logger.warn(`[HEAL] Could not load page ${meta.pageUrl}: ${(err as Error).message}`);
  }

  // Ask Gemini for alternative locators
  let suggestion: SelectorSuggestion | undefined;
  try {
    suggestion = await geminiClient.generateJson<SelectorSuggestion>(
      {
        action: 'heal-failed-locator',
        failedSelector: meta.failedSelector,
        error: meta.errorMessage,
        appPatterns,
        domSlice: domSlice || '(DOM not available)',
        task: [
          'The selector below failed in a Playwright test.',
          'Suggest 3 alternative Playwright locators ranked by reliability.',
          'Prefer getByRole > getByTestId > CSS selectors.',
          'Return ONLY JSON: { suggestedSelectors: string[], reason: string, confidence: number (0-1) }',
        ].join(' '),
      },
      { maxOutputTokens: 1200 },
    );
  } catch (err) {
    return { ...base, healed: false, newSelector: '', locatorFile: '', confidence: 0, reason: `Gemini call failed: ${(err as Error).message}` };
  }

  if (!suggestion || !suggestion.suggestedSelectors?.length) {
    return { ...base, healed: false, newSelector: '', locatorFile: '', confidence: 0, reason: 'Gemini returned no suggestions' };
  }

  if (suggestion.confidence < 0.7) {
    return {
      ...base,
      healed: false,
      newSelector: suggestion.suggestedSelectors[0] || '',
      locatorFile: '',
      confidence: suggestion.confidence,
      reason: `Confidence too low (${suggestion.confidence.toFixed(2)}) – manual review needed`,
    };
  }

  // Try to write the best suggestion back into the uistore
  for (const selector of suggestion.suggestedSelectors) {
    const file = tryWriteLocatorReplacement(meta.failedSelector, selector);
    if (file) {
      return {
        ...base,
        healed: true,
        newSelector: selector,
        locatorFile: file,
        confidence: suggestion.confidence,
        reason: suggestion.reason,
      };
    }
  }

  return {
    ...base,
    healed: false,
    newSelector: suggestion.suggestedSelectors[0] || '',
    locatorFile: '',
    confidence: suggestion.confidence,
    reason: 'Suggested selectors could not be matched to any line in src/uistore – manual update required',
  };
}

// ---------------------------------------------------------------------------
// Locator file rewriter  (same algorithm as PlaywrightHelper.tryWriteLocatorReplacement)
// ---------------------------------------------------------------------------

function tryWriteLocatorReplacement(failedSelector: string, replacement: string): string | undefined {
  const oldFragments = getSelectorFragments(failedSelector);
  if (!oldFragments.length) return undefined;

  const locatorDir = path.resolve('src', 'uistore');
  if (!fs.existsSync(locatorDir)) return undefined;

  const files = fs.readdirSync(locatorDir).filter((f) => f.endsWith('Locators.ts'));

  for (const file of files) {
    const filePath = path.join(locatorDir, file);
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    const lineIndex = lines.findIndex((line) =>
      oldFragments.some((fragment) => line.includes(fragment)),
    );

    if (lineIndex === -1) continue;

    const replacementExpression = `this.page.${replacement.replace(/^page\./, '')}`;
    const original = lines[lineIndex];

    lines[lineIndex] = original.includes('return ')
      ? original.replace(/return\s+.*;/, `return ${replacementExpression};`)
      : original.replace(/this\.page\..*/, `${replacementExpression};`);

    // Only write if something actually changed
    if (lines[lineIndex] === original) continue;

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    logger.info(`[HEAL] Updated locator in ${file} (line ${lineIndex + 1})`);
    return file;
  }

  return undefined;
}

function getSelectorFragments(selector: string): string[] {
  const locatorMatch = selector.match(/locator\(['"]([^'"]+)['"]\)/);
  if (locatorMatch?.[1]) {
    return [locatorMatch[1], `locator('${locatorMatch[1]}')`, `locator("${locatorMatch[1]}")`];
  }

  const normalized = selector.replace(/^page\./, '').trim();
  const fragments = [normalized];
  if (normalized.includes('(')) fragments.push(`this.page.${normalized}`);
  return fragments.filter(Boolean);
}

// ---------------------------------------------------------------------------
// Rerun
// ---------------------------------------------------------------------------

function runRerun(): number {
  logger.info('[HEAL] Running: npx playwright test --last-failed');
  const result = spawnSync('npx', ['playwright', 'test', '--last-failed'], {
    env: process.env,
    shell: true,
    stdio: 'inherit',
  });
  return result.status ?? 1;
}

// ---------------------------------------------------------------------------
// Persist heal summary
// ---------------------------------------------------------------------------

function persistHealSummary(records: HealRecord[]): void {
  fs.mkdirSync('reports', { recursive: true });
  const summaryPath = path.resolve('reports', 'heal-summary.json');
  const existing: HealRecord[] = fs.existsSync(summaryPath)
    ? (readJson<HealRecord[]>(summaryPath) ?? [])
    : [];

  const updated = [
    ...existing,
    ...records.map((r) => ({ ...r, timestamp: new Date().toISOString() })),
  ].slice(-200); // keep last 200 records

  fs.writeFileSync(summaryPath, JSON.stringify(updated, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}