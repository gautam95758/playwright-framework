/**
 * hooks.ts  (updated)
 *
 * Changes vs original:
 *  1. After each failed scenario the Gemini analysis is now ALSO written to
 *     reports/ai-failure-report.json (appended) so the HTML report generator
 *     and postRunAnalysis script can read rich AI data.
 *  2. The error-context.md file is written into the Playwright test-results
 *     directory for the geminiHealAndRerun script to consume.
 *  3. The HTML failure card written as an attachment is unchanged – it still
 *     appears in the Playwright HTML trace.
 */

import fs from 'fs';
import path from 'path';
import { createBdd } from 'playwright-bdd';
import { test, attachHtml, attachText, gotoBaseUrl } from '../utils/World';
import { geminiFailureAnalyzer, ScenarioFailureAnalysis } from '../utils/GeminiFailureAnalyzer';
import { geminiVisionAnalyzer } from '../utils/GeminiVisionAnalyzer';
import logger from '../utils/Logger';

const { BeforeAll, Before, After, AfterStep } = createBdd(test);

// ---- Directory bootstrap ---------------------------------------------------

BeforeAll(async () => {
  ensureDirectory('./screenshots');
  ensureDirectory('./screenshots/baseline');
  ensureDirectory('./reports');
  ensureDirectory('./logs');
});

// ---- Per-scenario setup ----------------------------------------------------

Before(async ({ page }) => {
  await gotoBaseUrl(page);
});

AfterStep(async ({ scenarioContext, $step }) => {
  scenarioContext.failedStepText = $step.title;
});

// ---- Per-scenario teardown -------------------------------------------------

After(async ({ page, scenarioContext, $testInfo }) => {
  const scenarioName = sanitizeFileName(scenarioContext.scenarioName);
  let visualDiff = '';

  // Screenshot
  if (!page.isClosed()) {
    const screenshotPath = path.join('screenshots', `${$testInfo.status}_${scenarioName}.png`);
    const screenshot = await page.screenshot({ path: screenshotPath, fullPage: true });
    scenarioContext.lastScreenshotPath = screenshotPath;
    await $testInfo.attach('scenario screenshot', { body: screenshot, contentType: 'image/png' });

    visualDiff = await geminiVisionAnalyzer.compareOrCreateBaseline(scenarioName, screenshot);
    await attachText($testInfo, 'Gemini visual diff', visualDiff);
  }

  // Only run AI analysis on genuine failures
  if ($testInfo.status !== $testInfo.expectedStatus && $testInfo.error) {
    const error = toError($testInfo.error);

    // --- 1. Gemini failure analysis ---
    const analysis = await geminiFailureAnalyzer.analyzeScenarioFailure({
      scenario: scenarioContext.scenarioName,
      feature: scenarioContext.featureFile,
      failedStepText: scenarioContext.failedStepText || 'Unknown step',
      error,
      page,
      consoleErrors: scenarioContext.consoleErrors,
      visualDiff,
    });

    // --- 2. Attach rich HTML card to Playwright trace (unchanged behaviour) ---
    await attachHtml(
      $testInfo,
      'Gemini failure analysis',
      geminiFailureAnalyzer.renderFailureCard(
        {
          scenario: scenarioContext.scenarioName,
          feature: scenarioContext.featureFile,
          failedStepText: scenarioContext.failedStepText || 'Unknown step',
          error,
          page,
          consoleErrors: scenarioContext.consoleErrors,
          visualDiff,
        },
        analysis,
      ),
    );

    // --- 3. NEW: persist analysis to ai-failure-report.json ------------------
    appendToFailureReport({
      scenario: scenarioContext.scenarioName,
      feature: scenarioContext.featureFile,
      failedStep: scenarioContext.failedStepText || 'Unknown step',
      error: error.message,
      pageUrl: page.isClosed() ? '<closed>' : page.url(),
      analysis,
      timestamp: new Date().toISOString(),
    });

    // --- 4. NEW: write error-context.md for geminiHealAndRerun script --------
    writeErrorContext({
      testResultsDir: $testInfo.outputDir,
      scenario: scenarioContext.scenarioName,
      feature: scenarioContext.featureFile,
      failedStep: scenarioContext.failedStepText || 'Unknown step',
      error,
      pageUrl: page.isClosed() ? config_baseUrl() : page.url(),
      analysis,
    });
  }
});

// ---------------------------------------------------------------------------
// Helpers – failure report
// ---------------------------------------------------------------------------

type FailureEntry = {
  scenario: string;
  feature: string;
  failedStep: string;
  error: string;
  pageUrl: string;
  analysis: ScenarioFailureAnalysis;
  timestamp: string;
};

type FailureReport = {
  failures: FailureEntry[];
};

function appendToFailureReport(entry: FailureEntry): void {
  const reportPath = path.resolve('reports', 'ai-failure-report.json');
  let report: FailureReport = { failures: [] };

  try {
    if (fs.existsSync(reportPath)) {
      report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as FailureReport;
      if (!Array.isArray(report.failures)) report.failures = [];
    }
  } catch {
    report = { failures: [] };
  }

  report.failures.push(entry);

  // Keep the file bounded – retain last 500 entries
  if (report.failures.length > 500) {
    report.failures = report.failures.slice(-500);
  }

  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// Helpers – error-context.md (consumed by geminiHealAndRerun)
// ---------------------------------------------------------------------------

type ErrorContextInput = {
  testResultsDir: string;
  scenario: string;
  feature: string;
  failedStep: string;
  error: Error;
  pageUrl: string;
  analysis: ScenarioFailureAnalysis;
};

function writeErrorContext(input: ErrorContextInput): void {
  try {
    fs.mkdirSync(input.testResultsDir, { recursive: true });
    const contextPath = path.join(input.testResultsDir, 'error-context.md');

    const lines = [
      `# Error Context`,
      ``,
      `## Scenario`,
      input.scenario,
      ``,
      `## Feature`,
      input.feature,
      ``,
      `## Failed Step`,
      input.failedStep,
      ``,
      `## Page URL`,
      input.pageUrl,
      ``,
      `## Error`,
      input.error.message,
      ``,
      `## Stack`,
      input.error.stack || '(no stack)',
      ``,
      `## AI Analysis`,
      `**Root Cause:** ${input.analysis.rootCause}`,
      `**Category:** ${input.analysis.category}`,
      `**Suggested Fix:** ${input.analysis.suggestedFix}`,
      `**Confidence:** ${input.analysis.confidence}`,
    ];

    fs.writeFileSync(contextPath, lines.join('\n'), 'utf8');
  } catch (err) {
    logger.warn(`[HOOKS] Could not write error-context.md: ${(err as Error).message}`);
  }
}

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

/** Reads BASE_URL from env without importing config (avoids circular deps) */
function config_baseUrl(): string {
  return process.env.BASE_URL || 'https://www.reliancejewels.com/';
}

function ensureDirectory(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`Created directory: ${dir}`);
  }
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 120);
}

function toError(error: { message?: string; stack?: string; value?: string }): Error {
  const converted = new Error(error.message || error.value || 'Unknown Playwright failure');
  converted.stack = error.stack;
  return converted;
}