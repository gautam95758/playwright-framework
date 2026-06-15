/**
 * generateReport.ts  (updated)
 *
 * Changes vs original:
 *  - Loads reports/ai-failure-report.json (written by the updated hooks.ts)
 *    and merges full Gemini analysis into each scenario card.
 *  - Failed scenarios now show a dedicated "🤖 Gemini AI Root-Cause Analysis"
 *    panel with: root cause, category, suggested fix, confidence, and whether
 *    a missing-await was detected.
 *  - The panel style uses an eye-catching amber/purple gradient that stands out
 *    clearly from the existing error block.
 *  - All other existing behaviour (charts, summary stats, screenshots, step list,
 *    filter tabs) is preserved exactly.
 */

import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Status = 'passed' | 'failed' | 'skipped' | 'pending' | 'undefined' | 'ambiguous' | 'unknown';

type CucumberEmbedding = {
  name?: string;
  data?: string;
  mime_type?: string;
  media?: { type?: string };
};

type CucumberStep = {
  keyword?: string;
  name?: string;
  hidden?: boolean;
  result?: {
    status?: Status;
    duration?: number;
    error_message?: string;
  };
  embeddings?: CucumberEmbedding[];
};

type CucumberScenario = {
  keyword?: string;
  name?: string;
  line?: number;
  steps?: CucumberStep[];
  tags?: { name?: string }[];
};

type CucumberFeature = {
  name?: string;
  uri?: string;
  elements?: CucumberScenario[];
};

type GeminiAnalysis = {
  rootCause: string;
  category: string;
  file: string;
  step: string;
  suggestedFix: string;
  confidence: 'High' | 'Medium' | 'Low';
  missingAwaitDetected: boolean;
  commonCauseGroup: string;
};

type AiFailureEntry = {
  scenario: string;
  feature: string;
  failedStep: string;
  error: string;
  analysis: GeminiAnalysis;
  timestamp: string;
};

type AiFailureReport = {
  failures?: AiFailureEntry[];
};

type FailureInsight = {
  failedStep: string;
  reason: string;
  likelyIssue: string;
  whereToCheck: string;
  suggestedAction: string;
  // NEW – rich Gemini data when available
  geminiAnalysis?: GeminiAnalysis;
};

type ScenarioReport = {
  id: number;
  anchor: string;
  name: string;
  feature: string;
  featureUri: string;
  line?: number;
  status: Status;
  duration: number;
  steps: CucumberStep[];
  totalSteps: number;
  passedSteps: number;
  tags: string[];
  error?: string;
  failureInsight?: FailureInsight;
  screenshots: string[];
};

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const rootDir = process.cwd();
const jsonPath = path.resolve(rootDir, 'reports', 'test-results.json');
const reportDir = path.resolve(rootDir, 'reports', 'html');
const artifactsDir = path.join(reportDir, 'artifacts');
const screenshotArtifactDir = path.join(artifactsDir, 'screenshots');
const reportPath = path.join(reportDir, 'index.html');
const aiFailurePath = path.resolve(rootDir, 'reports', 'ai-failure-report.json');

if (!fs.existsSync(jsonPath)) {
  throw new Error(`Test results JSON not found at ${jsonPath}. Run npm test first.`);
}

// ---------------------------------------------------------------------------
// Load AI failure report and index by scenario name
// ---------------------------------------------------------------------------

function loadAiFailureIndex(): Map<string, GeminiAnalysis> {
  const index = new Map<string, GeminiAnalysis>();
  if (!fs.existsSync(aiFailurePath)) return index;

  try {
    const report = JSON.parse(fs.readFileSync(aiFailurePath, 'utf8')) as AiFailureReport;
    for (const entry of report.failures ?? []) {
      // Use the most recent analysis for each scenario name (last write wins)
      if (entry.scenario && entry.analysis) {
        index.set(entry.scenario, entry.analysis);
      }
    }
  } catch {
    console.warn('[REPORT] Could not parse ai-failure-report.json – AI panels will be skipped.');
  }

  return index;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

resetDirectory(reportDir);
fs.mkdirSync(screenshotArtifactDir, { recursive: true });

const aiIndex = loadAiFailureIndex();
const features = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as CucumberFeature[];
const scenarios = flattenScenarios(features, aiIndex);
copyFiles(path.resolve(rootDir, 'screenshots'), screenshotArtifactDir, ['.png', '.jpg', '.jpeg']);
const summary = buildSummary(scenarios);
const featureSummary = buildFeatureSummary(scenarios);

fs.writeFileSync(reportPath, renderReport(scenarios, summary, featureSummary), 'utf8');
console.log(`Custom HTML report generated: ${reportPath}`);

// ---------------------------------------------------------------------------
// Flatten scenarios
// ---------------------------------------------------------------------------

function flattenScenarios(
  features: CucumberFeature[],
  aiIndex: Map<string, GeminiAnalysis>,
): ScenarioReport[] {
  let id = 1;
  const reports: ScenarioReport[] = [];

  features.forEach((feature, fi) => {
    (feature.elements || [])
      .filter((el) => (el.keyword || '').toLowerCase().includes('scenario'))
      .forEach((scenario, si) => {
        const steps = (scenario.steps || []).filter((s) => !s.hidden);
        const statuses = steps.map((s) => normalizeStatus(s.result?.status));
        const status = getScenarioStatus(statuses);
        const anchor = slug(`${feature.name ?? 'feature'}-${scenario.name ?? 'scenario'}-${fi}-${si}`);
        const passedSteps = steps.filter((s) => normalizeStatus(s.result?.status) === 'passed').length;
        const error = steps.map((s) => s.result?.error_message).find(Boolean);
        const geminiAnalysis = scenario.name ? aiIndex.get(scenario.name) : undefined;
        const failureInsight = buildFailureInsight(feature, scenario, steps, error, geminiAnalysis);

        reports.push({
          id: id++,
          anchor,
          name: scenario.name || 'Unnamed Scenario',
          feature: feature.name || 'Unnamed Feature',
          featureUri: feature.uri || '',
          line: scenario.line,
          status,
          duration: steps.reduce((t, s) => t + (s.result?.duration || 0), 0),
          steps,
          totalSteps: steps.length,
          passedSteps,
          tags: (scenario.tags || []).map((t) => t.name || '').filter(Boolean),
          error,
          failureInsight,
          screenshots: extractScenarioScreenshots(anchor, steps),
        });
      });
  });

  return reports;
}

// ---------------------------------------------------------------------------
// Failure insight builder
// ---------------------------------------------------------------------------

function buildFailureInsight(
  feature: CucumberFeature,
  scenario: CucumberScenario,
  steps: CucumberStep[],
  error?: string,
  geminiAnalysis?: GeminiAnalysis,
): FailureInsight | undefined {
  if (!error) return undefined;

  const failedStep = steps.find((s) => normalizeStatus(s.result?.status) === 'failed');
  const failedStepText = formatStepText(failedStep);

  // Priority 1: rich Gemini data from ai-failure-report.json (new path)
  if (geminiAnalysis) {
    return {
      failedStep: failedStepText,
      reason: geminiAnalysis.rootCause || summarizeError(error),
      likelyIssue: geminiAnalysis.category
        ? `This looks like a ${geminiAnalysis.category} issue.`
        : classifyFailure(error).likelyIssue,
      whereToCheck: geminiAnalysis.file || formatSource(feature, scenario),
      suggestedAction: geminiAnalysis.suggestedFix || classifyFailure(error).suggestedAction,
      geminiAnalysis,
    };
  }

  // Priority 2: parse Gemini HTML attachment from the Playwright report (legacy path)
  const embeddedInsight = extractGeminiInsight(steps);
  if (embeddedInsight) {
    return {
      failedStep: failedStepText,
      reason: embeddedInsight.rootCause || summarizeError(error),
      likelyIssue: embeddedInsight.category
        ? `This looks like a ${embeddedInsight.category} issue.`
        : classifyFailure(error).likelyIssue,
      whereToCheck: embeddedInsight.file || formatSource(feature, scenario),
      suggestedAction: embeddedInsight.suggestedFix || classifyFailure(error).suggestedAction,
    };
  }

  // Fallback: rule-based classification
  const classification = classifyFailure(error);
  return {
    failedStep: failedStepText,
    reason: summarizeError(error),
    likelyIssue: classification.likelyIssue,
    whereToCheck: formatSource(feature, scenario),
    suggestedAction: classification.suggestedAction,
  };
}

function extractGeminiInsight(
  steps: CucumberStep[],
): Partial<{ rootCause: string; category: string; file: string; suggestedFix: string }> | undefined {
  const html = steps
    .flatMap((s) => s.embeddings || [])
    .filter((e) => getMimeType(e) === 'text/html' && e.data)
    .map((e) => decodeAttachmentText(e.data || ''))
    .find((v) => v.includes('Root cause summary'));

  if (!html) return undefined;

  const text = stripHtml(html);
  return {
    file: matchText(text, /File \+ step:\s*([^\n]+)/),
    suggestedFix: matchText(text, /Suggested fix:\s*([^\n]+)/),
    category: matchText(text, /category:\s*([^\n]+)/i),
    rootCause: matchText(text, /Root cause:\s*([^\n]+)/i),
  };
}

// ---------------------------------------------------------------------------
// Screenshots
// ---------------------------------------------------------------------------

function extractScenarioScreenshots(scenarioId: string, steps: CucumberStep[]): string[] {
  let imgIndex = 1;
  const shots: string[] = [];

  steps.forEach((step) => {
    (step.embeddings || [])
      .filter((e) => getMimeType(e).startsWith('image/') && e.data)
      .forEach((e) => {
        const ext = getMimeType(e).includes('jpeg') ? 'jpg' : 'png';
        const fileName = `${scenarioId}-${imgIndex++}.${ext}`;
        const dest = path.join(screenshotArtifactDir, fileName);
        fs.writeFileSync(dest, Buffer.from(e.data || '', 'base64'));
        shots.push(toWebPath(path.relative(reportDir, dest)));
      });
  });

  return shots;
}

// ---------------------------------------------------------------------------
// Summaries
// ---------------------------------------------------------------------------

function buildSummary(scenarios: ScenarioReport[]) {
  const total = scenarios.length;
  const passed = scenarios.filter((s) => s.status === 'passed').length;
  const failed = scenarios.filter((s) => s.status === 'failed').length;
  const skipped = scenarios.filter((s) => isSkippedLike(s.status)).length;
  const duration = scenarios.reduce((t, s) => t + s.duration, 0);
  const passRate = total ? Math.round((passed / total) * 100) : 0;
  const steps = scenarios.reduce((c, s) => c + s.totalSteps, 0);
  const featureCount = new Set(scenarios.map((s) => s.feature)).size;
  const averageDuration = total ? duration / total : 0;
  return { total, passed, failed, skipped, duration, passRate, steps, featureCount, averageDuration };
}

function buildFeatureSummary(scenarios: ScenarioReport[]) {
  const byFeature = new Map<string, { passed: number; failed: number; skipped: number }>();
  scenarios.forEach((s) => {
    const rec = byFeature.get(s.feature) || { passed: 0, failed: 0, skipped: 0 };
    if (s.status === 'passed') rec.passed += 1;
    else if (s.status === 'failed') rec.failed += 1;
    else rec.skipped += 1;
    byFeature.set(s.feature, rec);
  });
  return Array.from(byFeature.entries()).map(([feature, counts]) => ({ feature, ...counts }));
}

// ---------------------------------------------------------------------------
// HTML report renderer
// ---------------------------------------------------------------------------

function renderReport(
  scenarios: ScenarioReport[],
  summary: ReturnType<typeof buildSummary>,
  featureSummary: ReturnType<typeof buildFeatureSummary>,
): string {
  const generated = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });


  // Load heal summary if it exists
  const healSummaryPath = path.resolve(rootDir, 'reports', 'heal-summary.json');
  let healBannerHtml = '';
  if (fs.existsSync(healSummaryPath)) {
    try {
      type HealEntry = { specFile: string; failedSelector: string; newSelector: string; locatorFile: string; healed: boolean; confidence: number; reason: string; timestamp: string; };
      const allHeals = JSON.parse(fs.readFileSync(healSummaryPath, 'utf8')) as HealEntry[];
      // Only show heals from the last 2 hours
      const cutoff = Date.now() - 2 * 60 * 60 * 1000;
      const recent = allHeals.filter(h => new Date(h.timestamp).getTime() > cutoff);
      const healed = recent.filter(h => h.healed);
      const failed = recent.filter(h => !h.healed);
      if (recent.length > 0) {
        const rows = [
          ...healed.map(h => `<li>✅ <strong>${escapeHtml(h.failedSelector)}</strong> → <code>${escapeHtml(h.newSelector)}</code> in <strong>${escapeHtml(h.locatorFile)}</strong> (confidence: ${Math.round(h.confidence * 100)}%)</li>`),
          ...failed.map(h => `<li>⚠️ <strong>${escapeHtml(h.failedSelector)}</strong> — ${escapeHtml(h.reason)}</li>`),
        ].join('\n');
        healBannerHtml = `
  <div class="heal-banner">
    <div class="heal-banner-icon">🔧</div>
    <div class="heal-banner-body">
      <div class="heal-banner-title">Gemini Auto-Heal Summary — ${healed.length} of ${recent.length} selector(s) fixed this run</div>
      <ul>${rows}</ul>
    </div>
  </div>`;
      }
    } catch { /* ignore */ }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Playwright Test Report</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet"/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<style>
  :root {
    --bg: #0a0d12;
    --surface: #111520;
    --card: #161c2b;
    --border: #1f2d45;
    --accent: #00e5ff;
    --accent2: #7c3aed;
    --pass: #00e096;
    --fail: #ff4d6d;
    --skip: #ffd166;
    --text: #e2e8f0;
    --muted: #64748b;
    --font-head: 'Syne', sans-serif;
    --font-mono: 'DM Mono', monospace;
    --ai: #a78bfa;
    --ai-bg: rgba(124,58,237,0.10);
    --ai-border: rgba(167,139,250,0.30);
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: var(--bg); color: var(--text); font-family: var(--font-mono); min-height: 100vh; overflow-x: hidden; }
  body::before {
    content: ''; position: fixed; inset: 0;
    background-image: linear-gradient(rgba(0,229,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.03) 1px, transparent 1px);
    background-size: 40px 40px; pointer-events: none; z-index: 0;
  }

  .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; position: relative; z-index: 1; }
  header { padding: 48px 0 32px; border-bottom: 1px solid var(--border); margin-bottom: 40px; animation: fadeDown 0.6s ease both; }
  .header-inner { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
  .brand { display: flex; align-items: center; gap: 14px; }
  .logo-icon { width: 48px; height: 48px; background: linear-gradient(135deg, var(--accent), var(--accent2)); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-family: var(--font-head); font-weight: 800; color: #fff; }
  h1 { font-family: var(--font-head); font-size: clamp(1.6rem, 3vw, 2.4rem); font-weight: 800; background: linear-gradient(90deg, #fff 40%, var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .subtitle { color: var(--muted); font-size: 0.78rem; margin-top: 4px; letter-spacing: 0.05em; }
  .run-meta { text-align: right; font-size: 0.75rem; color: var(--muted); line-height: 1.8; }
  .run-meta span { color: var(--accent); }

  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 40px; animation: fadeUp 0.6s 0.1s ease both; }
  .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 24px 20px; position: relative; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; }
  .stat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.4); }
  .stat-card::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: 16px 16px 0 0; }
  .stat-card.total::after { background: var(--accent); }
  .stat-card.passed::after { background: var(--pass); }
  .stat-card.failed::after { background: var(--fail); }
  .stat-card.skipped::after { background: var(--skip); }
  .stat-card.duration::after { background: var(--accent2); }
  .stat-label { font-size: 0.7rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
  .stat-value { font-family: var(--font-head); font-size: 2.2rem; font-weight: 800; line-height: 1; }
  .stat-card.total .stat-value { color: var(--accent); }
  .stat-card.passed .stat-value { color: var(--pass); }
  .stat-card.failed .stat-value { color: var(--fail); }
  .stat-card.skipped .stat-value { color: var(--skip); }
  .stat-card.duration .stat-value { color: var(--accent2); font-size: 1.6rem; }
  .stat-sub { font-size: 0.72rem; color: var(--muted); margin-top: 6px; }

  .charts-row { display: grid; grid-template-columns: 340px 1fr; gap: 20px; margin-bottom: 40px; animation: fadeUp 0.6s 0.2s ease both; }
  @media (max-width: 780px) { .charts-row { grid-template-columns: 1fr; } }
  .chart-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 28px; }
  .chart-title { font-family: var(--font-head); font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 20px; }
  .pie-wrap { position: relative; height: 220px; display: flex; align-items: center; justify-content: center; }
  .pie-center { position: absolute; text-align: center; pointer-events: none; }
  .pie-pct { font-family: var(--font-head); font-size: 2rem; font-weight: 800; color: var(--pass); display: block; }
  .pie-pct-label { font-size: 0.68rem; color: var(--muted); text-transform: uppercase; }
  .legend { display: flex; gap: 20px; margin-top: 16px; flex-wrap: wrap; }
  .legend-item { display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: var(--muted); }
  .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .bar-chart-wrap { height: 220px; }

  .table-section { animation: fadeUp 0.6s 0.3s ease both; }
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
  .section-title { font-family: var(--font-head); font-size: 1.1rem; font-weight: 700; }
  .filter-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
  .filter-btn { padding: 6px 14px; border-radius: 20px; border: 1px solid var(--border); background: transparent; color: var(--muted); font-family: var(--font-mono); font-size: 0.72rem; cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.06em; }
  .filter-btn.active, .filter-btn:hover { border-color: var(--accent); color: var(--accent); background: rgba(0,229,255,0.06); }
  .filter-btn.pass-btn.active { border-color: var(--pass); color: var(--pass); background: rgba(0,224,150,0.06); }
  .filter-btn.fail-btn.active { border-color: var(--fail); color: var(--fail); background: rgba(255,77,109,0.06); }
  .table-wrap { background: var(--card); border: 1px solid var(--border); border-radius: 16px; overflow-x: auto; margin-bottom: 40px; }
  table { width: 100%; border-collapse: collapse; min-width: 760px; }
  thead th { padding: 14px 20px; text-align: left; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); background: var(--surface); border-bottom: 1px solid var(--border); font-weight: 500; }
  tbody tr { border-bottom: 1px solid rgba(31,45,69,0.6); transition: background 0.15s; cursor: pointer; }
  tbody tr:last-child { border-bottom: none; }
  tbody tr:hover { background: rgba(0,229,255,0.04); }
  td { padding: 16px 20px; font-size: 0.8rem; vertical-align: middle; }
  .scenario-link { color: var(--text); text-decoration: none; font-weight: 500; display: flex; align-items: center; gap: 10px; transition: color 0.15s; }
  .scenario-link:hover { color: var(--accent); }
  .scenario-icon { font-size: 1rem; flex-shrink: 0; }
  .feature-tag { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 0.66rem; background: rgba(124,58,237,0.15); color: #a78bfa; border: 1px solid rgba(124,58,237,0.3); white-space: nowrap; }
  .badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; border-radius: 20px; font-size: 0.68rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .badge.pass { background: rgba(0,224,150,0.12); color: var(--pass); border: 1px solid rgba(0,224,150,0.3); }
  .badge.fail { background: rgba(255,77,109,0.12); color: var(--fail); border: 1px solid rgba(255,77,109,0.3); }
  .badge.skip { background: rgba(255,209,102,0.12); color: var(--skip); border: 1px solid rgba(255,209,102,0.3); }
  .duration-cell { color: var(--muted); font-size: 0.75rem; }
  .steps-bar { width: 80px; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; display: inline-block; }
  .steps-fill { height: 100%; border-radius: 3px; background: var(--pass); }
  .steps-fill.fail { background: var(--fail); }
  .tag-row { margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap; }
  .tag { font-size: 0.62rem; color: var(--muted); background: rgba(255,255,255,0.04); padding: 1px 7px; border-radius: 10px; border: 1px solid var(--border); }

  /* Modal */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(6px); z-index: 100; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.25s; padding: 24px; }
  .modal-overlay.open { opacity: 1; pointer-events: all; }
  .modal { background: var(--card); border: 1px solid var(--border); border-radius: 20px; width: 100%; max-width: 800px; max-height: 88vh; overflow-y: auto; transform: translateY(20px); transition: transform 0.25s; box-shadow: 0 40px 80px rgba(0,0,0,0.6); }
  .modal-overlay.open .modal { transform: translateY(0); }
  .modal-header { padding: 28px 28px 0; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  .modal-title { font-family: var(--font-head); font-size: 1.1rem; font-weight: 700; line-height: 1.3; }
  .modal-close { background: var(--border); border: none; color: var(--muted); width: 32px; height: 32px; border-radius: 8px; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.15s, color 0.15s; }
  .modal-close:hover { background: var(--fail); color: #fff; }
  .modal-body { padding: 20px 28px 28px; }
  .modal-meta { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
  .meta-chip { padding: 4px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 20px; font-size: 0.7rem; color: var(--muted); }
  .meta-chip span { color: var(--text); }
  .steps-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
  .step-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; background: var(--surface); border-radius: 10px; border-left: 3px solid transparent; font-size: 0.78rem; }
  .step-item.passed { border-color: var(--pass); }
  .step-item.failed { border-color: var(--fail); }
  .step-item.skipped,.step-item.pending,.step-item.undefined,.step-item.ambiguous,.step-item.unknown { border-color: var(--skip); }
  .step-icon { flex-shrink: 0; margin-top: 1px; }
  .step-text { line-height: 1.5; }
  .screenshot-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-top: 18px; }
  .screenshot-grid a { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; background: var(--surface); }
  .screenshot-grid img { display: block; width: 100%; height: 160px; object-fit: contain; background: #080a0e; }
  .error-block { background: rgba(255,77,109,0.08); border: 1px solid rgba(255,77,109,0.2); border-radius: 10px; padding: 14px 16px; margin-top: 16px; font-size: 0.74rem; color: var(--fail); line-height: 1.6; font-family: var(--font-mono); white-space: pre-wrap; }
  .error-label { font-weight: 600; margin-bottom: 6px; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; }

  /* Simple heuristic insight block (unchanged) */
  .insight-block { background: rgba(255,209,102,0.08); border: 1px solid rgba(255,209,102,0.24); border-radius: 10px; padding: 14px 16px; margin-top: 16px; font-size: 0.76rem; line-height: 1.6; }
  .insight-title { color: var(--skip); font-weight: 700; margin-bottom: 8px; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.05em; }
  .insight-row { margin-top: 6px; }
  .insight-row strong { color: var(--text); }

  /* ── NEW: Gemini AI deep-analysis panel ── */
  .ai-panel {
    background: var(--ai-bg);
    border: 1px solid var(--ai-border);
    border-radius: 12px;
    padding: 16px 18px;
    margin-top: 16px;
    font-size: 0.76rem;
    line-height: 1.7;
    position: relative;
    overflow: hidden;
  }
  .ai-panel::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--accent2), var(--accent));
    border-radius: 12px 12px 0 0;
  }
  .ai-panel-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }
  .ai-panel-title {
    font-family: var(--font-head);
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--ai);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .ai-badge {
    font-size: 0.62rem;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .ai-badge.high { background: rgba(0,224,150,0.15); color: var(--pass); border: 1px solid rgba(0,224,150,0.3); }
  .ai-badge.medium { background: rgba(255,209,102,0.15); color: var(--skip); border: 1px solid rgba(255,209,102,0.3); }
  .ai-badge.low { background: rgba(255,77,109,0.15); color: var(--fail); border: 1px solid rgba(255,77,109,0.3); }
  .ai-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
  @media (max-width: 540px) { .ai-grid { grid-template-columns: 1fr; } }
  .ai-row { margin-top: 4px; }
  .ai-row label { display: block; font-size: 0.64rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 2px; }
  .ai-row span { color: var(--text); font-size: 0.76rem; }
  .ai-row.full { grid-column: 1 / -1; }
  .ai-row.fix-row span { color: var(--ai); }
  .await-flag { display: inline-flex; align-items: center; gap: 5px; margin-top: 8px; padding: 4px 10px; background: rgba(255,77,109,0.12); border: 1px solid rgba(255,77,109,0.3); border-radius: 8px; font-size: 0.68rem; color: var(--fail); }


  /* ── Heal confirmation banner ── */
  .heal-banner {
    background: rgba(0,224,150,0.08);
    border: 1px solid rgba(0,224,150,0.25);
    border-radius: 12px;
    padding: 14px 20px;
    margin-bottom: 28px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    font-size: 0.78rem;
    animation: fadeUp 0.6s 0.15s ease both;
  }
  .heal-banner-icon { font-size: 1.2rem; flex-shrink: 0; margin-top: 1px; }
  .heal-banner-body { line-height: 1.7; }
  .heal-banner-title { font-family: var(--font-head); font-size: 0.8rem; font-weight: 700; color: var(--pass); margin-bottom: 4px; }
  .heal-banner ul { margin: 6px 0 0 16px; display: flex; flex-direction: column; gap: 4px; }
  .heal-banner li { color: var(--muted); }
  .heal-banner li strong { color: var(--text); }
  .heal-banner code { font-family: var(--font-mono); background: rgba(255,255,255,0.06); padding: 1px 6px; border-radius: 4px; font-size: 0.72rem; color: var(--accent); }

  /* ── Report spacing fixes ── */
  .modal-body > * + * { margin-top: 14px; }
  .ai-grid { row-gap: 14px; }
  .steps-list { gap: 10px; }
  .step-item { padding: 14px 16px; }
  .modal-meta { margin-bottom: 16px; gap: 8px; }

  footer { border-top: 1px solid var(--border); padding: 24px 0; text-align: center; font-size: 0.72rem; color: var(--muted); animation: fadeUp 0.6s 0.4s ease both; }
  footer span { color: var(--accent); }
  @keyframes fadeDown { from { opacity:0; transform:translateY(-16px); } to { opacity:1; transform:none; } }
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
</style>
</head>
<body>
<div class="modal-overlay" id="modal" onclick="closeModal(event)">
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title" id="modal-title"></div>
      <button class="modal-close" onclick="closeModalDirect()">✕</button>
    </div>
    <div class="modal-body" id="modal-body"></div>
  </div>
</div>

<div class="container">
  <header>
    <div class="header-inner">
      <div class="brand">
        <div class="logo-icon">🎭</div>
        <div>
          <h1>Test Results</h1>
          <div class="subtitle">Playwright · Gemini AI · Test Suite</div>
        </div>
      </div>
      <div class="run-meta">
        <div>Branch <span>${escapeHtml(getBranchName())}</span></div>
        <div>Run ID <span>#${Date.now().toString().slice(-6)}</span></div>
        <div>Generated <span>${escapeHtml(generated)}</span></div>
        <div>Environment <span>${escapeHtml(process.env.TEST_ENV || process.env.NODE_ENV || 'Staging')}</span></div>
      </div>
    </div>
  </header>

  \${healBannerHtml}

  <div class="stats-grid">
    <div class="stat-card total"><div class="stat-label">Total Scenarios</div><div class="stat-value">${summary.total}</div><div class="stat-sub">Across ${summary.featureCount} features</div></div>
    <div class="stat-card passed"><div class="stat-label">Passed</div><div class="stat-value">${summary.passed}</div><div class="stat-sub">${summary.passRate}% pass rate</div></div>
    <div class="stat-card failed"><div class="stat-label">Failed</div><div class="stat-value">${summary.failed}</div><div class="stat-sub">${summary.failed ? 'Needs attention' : 'No failures'}</div></div>
    <div class="stat-card skipped"><div class="stat-label">Skipped</div><div class="stat-value">${summary.skipped}</div><div class="stat-sub">Skipped or pending</div></div>
    <div class="stat-card duration"><div class="stat-label">Total Duration</div><div class="stat-value">${formatDuration(summary.duration)}</div><div class="stat-sub">Avg ${formatDuration(summary.averageDuration)}/scenario</div></div>
  </div>

  <div class="charts-row">
    <div class="chart-card">
      <div class="chart-title">Pass / Fail Breakdown</div>
      <div class="pie-wrap">
        <canvas id="pieChart" width="200" height="200" style="max-width:200px;max-height:200px;"></canvas>
        <div class="pie-center"><span class="pie-pct">${summary.passRate}%</span><span class="pie-pct-label">Pass Rate</span></div>
      </div>
      <div class="legend">
        <div class="legend-item"><div class="legend-dot" style="background:var(--pass)"></div>Passed (${summary.passed})</div>
        <div class="legend-item"><div class="legend-dot" style="background:var(--fail)"></div>Failed (${summary.failed})</div>
        <div class="legend-item"><div class="legend-dot" style="background:var(--skip)"></div>Skipped (${summary.skipped})</div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title">Results by Feature</div>
      <div class="bar-chart-wrap"><canvas id="barChart"></canvas></div>
    </div>
  </div>

  <div class="table-section">
    <div class="section-header">
      <div class="section-title">Scenario Details</div>
      <div class="filter-tabs">
        <button class="filter-btn active" onclick="filterTable('all',this)">All</button>
        <button class="filter-btn pass-btn" onclick="filterTable('pass',this)">Passed</button>
        <button class="filter-btn fail-btn" onclick="filterTable('fail',this)">Failed</button>
        <button class="filter-btn" onclick="filterTable('skip',this)">Skipped</button>
      </div>
    </div>
    <div class="table-wrap">
      <table id="scenarioTable">
        <thead><tr><th>#</th><th>Scenario</th><th>Feature</th><th>Status</th><th>Duration</th><th>Steps</th></tr></thead>
        <tbody id="tableBody"></tbody>
      </table>
    </div>
  </div>
</div>

<footer><div class="container">Designed by <span>Gautam Rawat (Quality Engineer)</span></div></footer>

<script>
const scenarios = ${JSON.stringify(toClientScenarios(scenarios))};
const featureData = ${JSON.stringify(featureSummary)};

// Charts
const pieCtx = document.getElementById('pieChart').getContext('2d');
new Chart(pieCtx, {
  type: 'doughnut',
  data: { labels: ['Passed','Failed','Skipped'], datasets: [{ data: [${summary.passed},${summary.failed},${summary.skipped}], backgroundColor: ['#00e096','#ff4d6d','#ffd166'], borderWidth: 0, hoverOffset: 6 }] },
  options: { cutout: '72%', plugins: { legend: { display: false } }, animation: { animateRotate: true, duration: 900 } }
});

const barCtx = document.getElementById('barChart').getContext('2d');
new Chart(barCtx, {
  type: 'bar',
  data: {
    labels: featureData.map(f => f.feature),
    datasets: [
      { label:'Passed', data: featureData.map(f => f.passed), backgroundColor:'rgba(0,224,150,0.75)', borderRadius:4, barPercentage:0.6 },
      { label:'Failed', data: featureData.map(f => f.failed), backgroundColor:'rgba(255,77,109,0.75)', borderRadius:4, barPercentage:0.6 },
      { label:'Skipped', data: featureData.map(f => f.skipped), backgroundColor:'rgba(255,209,102,0.6)', borderRadius:4, barPercentage:0.6 }
    ]
  },
  options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color:'#64748b', font:{ size:11 }, boxWidth:10 } } }, scales: { x: { stacked:true, ticks:{color:'#64748b',font:{size:10}}, grid:{color:'rgba(31,45,69,0.5)'} }, y: { stacked:true, ticks:{color:'#64748b',stepSize:1,font:{size:10}}, grid:{color:'rgba(31,45,69,0.5)'}, beginAtZero:true } }, animation: { duration: 900 } }
});

const statusIcon = { pass:'✅', fail:'❌', skip:'⏭️' };
const stepIcon = { passed:'✓', failed:'✗', skipped:'○', pending:'○', undefined:'○', ambiguous:'○', unknown:'○' };
const stepColor = { passed:'#00e096', failed:'#ff4d6d', skipped:'#ffd166', pending:'#ffd166', undefined:'#ffd166', ambiguous:'#ffd166', unknown:'#ffd166' };

function renderTable(filter='all') {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';
  const filtered = filter === 'all' ? scenarios : scenarios.filter(s => s.statusGroup === filter);
  filtered.forEach(s => {
    const pct = s.totalSteps ? Math.round((s.passedSteps / s.totalSteps) * 100) : 0;
    const tr = document.createElement('tr');
    tr.setAttribute('data-status', s.statusGroup);
    tr.onclick = () => openModal(s);
    tr.innerHTML = \`
      <td style="color:var(--muted);font-size:0.7rem">\${String(s.id).padStart(2,'0')}</td>
      <td>
        <a class="scenario-link" href="#" onclick="return false;">
          <span class="scenario-icon">\${statusIcon[s.statusGroup]}</span>
          <span>\${escapeHtml(s.name)}</span>
        </a>
        <div class="tag-row">\${s.tags.map(t=>\`<span class="tag">\${escapeHtml(t)}</span>\`).join('')}</div>
      </td>
      <td><span class="feature-tag">\${escapeHtml(s.feature)}</span></td>
      <td><span class="badge \${s.statusGroup}">\${s.statusGroup === 'pass' ? 'Pass' : s.statusGroup === 'fail' ? 'Fail' : 'Skip'}</span></td>
      <td class="duration-cell">\${s.duration}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="steps-bar"><div class="steps-fill \${s.statusGroup === 'fail'?'fail':''}" style="width:\${pct}%"></div></div>
          <span style="font-size:0.7rem;color:var(--muted)">\${s.passedSteps}/\${s.totalSteps}</span>
        </div>
      </td>
    \`;
    tbody.appendChild(tr);
  });
}

function filterTable(filter, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTable(filter);
}

function openModal(s) {
  document.getElementById('modal-title').textContent = s.name;
  const statusColor = s.statusGroup === 'pass' ? 'var(--pass)' : s.statusGroup === 'fail' ? 'var(--fail)' : 'var(--skip)';

  const meta = \`<div class="modal-meta">
    <div class="meta-chip">Feature: <span>\${escapeHtml(s.feature)}</span></div>
    <div class="meta-chip">Status: <span style="color:\${statusColor}">\${escapeHtml(s.status.toUpperCase())}</span></div>
    <div class="meta-chip">Duration: <span>\${escapeHtml(s.duration)}</span></div>
    <div class="meta-chip">Steps: <span>\${s.passedSteps}/\${s.totalSteps}</span></div>
    \${s.featureUri ? \`<div class="meta-chip">Source: <span>\${escapeHtml(s.featureUri)}\${s.line ? ':' + s.line : ''}</span></div>\` : ''}
  </div>\`;

  // ── Gemini AI deep-analysis panel (NEW) ──
  let aiPanelHtml = '';
  if (s.geminiAnalysis) {
    const ga = s.geminiAnalysis;
    const confClass = (ga.confidence || '').toLowerCase();
    aiPanelHtml = \`
    <div class="ai-panel">
      <div class="ai-panel-header">
        <span>🤖</span>
        <span class="ai-panel-title">Gemini AI Root-Cause Analysis</span>
        <span class="ai-badge \${confClass}">\${escapeHtml(ga.confidence || '')} confidence</span>
      </div>
      <div class="ai-grid">
        <div class="ai-row full">
          <label>Root Cause</label>
          <span>\${escapeHtml(ga.rootCause || '—')}</span>
        </div>
        <div class="ai-row">
          <label>Category</label>
          <span>\${escapeHtml(ga.category || '—')}</span>
        </div>
        <div class="ai-row">
          <label>Common Cause Group</label>
          <span>\${escapeHtml(ga.commonCauseGroup || '—')}</span>
        </div>
        <div class="ai-row full fix-row">
          <label>Suggested Fix</label>
          <span>\${escapeHtml(ga.suggestedFix || '—')}</span>
        </div>
        <div class="ai-row">
          <label>File / Step</label>
          <span>\${escapeHtml(ga.file || '—')} \${ga.step ? '· ' + escapeHtml(ga.step) : ''}</span>
        </div>
      </div>
      \${ga.missingAwaitDetected ? '<div class="await-flag">⚠️ Missing <code>await</code> detected</div>' : ''}
    </div>\`;
  }

  // Simple heuristic insight (always shown as fallback)
  const insightHtml = s.failureInsight && !s.geminiAnalysis ? \`
    <div class="insight-block">
      <div class="insight-title">Failure Summary</div>
      <div class="insight-row"><strong>Failed step:</strong> \${escapeHtml(s.failureInsight.failedStep)}</div>
      <div class="insight-row"><strong>Reason:</strong> \${escapeHtml(s.failureInsight.reason)}</div>
      <div class="insight-row"><strong>Likely issue:</strong> \${escapeHtml(s.failureInsight.likelyIssue)}</div>
      <div class="insight-row"><strong>Where to check:</strong> \${escapeHtml(s.failureInsight.whereToCheck)}</div>
      <div class="insight-row"><strong>Suggested action:</strong> \${escapeHtml(s.failureInsight.suggestedAction)}</div>
    </div>\` : '';

  const stepsHtml = '<ul class="steps-list">' +
    s.steps.map((st,i) => \`
      <li class="step-item \${st.status}">
        <span class="step-icon" style="color:\${stepColor[st.status]}">\${stepIcon[st.status]}</span>
        <span class="step-text"><strong style="color:var(--muted);font-size:0.68rem">Step \${i+1} · \${escapeHtml(st.keyword)}</strong><br/>\${escapeHtml(st.name)}</span>
      </li>\`).join('') + '</ul>';

  const shotsHtml = s.screenshots.length
    ? '<div class="screenshot-grid">' + s.screenshots.map((src,i) => \`<a href="\${escapeHtml(src)}" target="_blank"><img src="\${escapeHtml(src)}" alt="Screenshot \${i+1}"></a>\`).join('') + '</div>'
    : '';

  const errorHtml = s.error
    ? \`<div class="error-block"><div class="error-label">Failure Reason</div>\${escapeHtml(s.error)}</div>\`
    : '';

  document.getElementById('modal-body').innerHTML = meta + aiPanelHtml + insightHtml + stepsHtml + shotsHtml + errorHtml;
  document.getElementById('modal').classList.add('open');
}

function closeModal(event) { if (event.target === document.getElementById('modal')) closeModalDirect(); }
function closeModalDirect() { document.getElementById('modal').classList.remove('open'); }
function escapeHtml(value) { return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModalDirect(); });
renderTable();
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Client-side scenario shape
// ---------------------------------------------------------------------------

function toClientScenarios(scenarios: ScenarioReport[]) {
  return scenarios.map((s) => ({
    id: s.id,
    name: s.name,
    feature: s.feature,
    featureUri: s.featureUri,
    line: s.line,
    status: s.status,
    statusGroup: statusGroup(s.status),
    duration: formatDuration(s.duration),
    passedSteps: s.passedSteps,
    totalSteps: s.totalSteps,
    tags: s.tags,
    error: s.error,
    failureInsight: s.failureInsight
      ? { ...s.failureInsight, geminiAnalysis: undefined } // strip nested object; sent separately
      : undefined,
    geminiAnalysis: s.failureInsight?.geminiAnalysis ?? null,
    screenshots: s.screenshots,
    steps: s.steps.map((step) => ({
      keyword: (step.keyword || '').trim(),
      name: step.name || 'Hook',
      status: normalizeStatus(step.result?.status),
      duration: formatDuration(step.result?.duration || 0),
    })),
  }));
}

// ---------------------------------------------------------------------------
// Utility functions (unchanged from original)
// ---------------------------------------------------------------------------

function copyFiles(sourceDir: string, destinationDir: string, extensions: string[]): string[] {
  if (!fs.existsSync(sourceDir)) return [];
  return fs.readdirSync(sourceDir)
    .filter((file) => extensions.includes(path.extname(file).toLowerCase()))
    .map((file) => {
      const src = path.join(sourceDir, file);
      const dest = path.join(destinationDir, file);
      fs.copyFileSync(src, dest);
      return toWebPath(path.relative(reportDir, dest));
    })
    .sort((a, b) => a.localeCompare(b));
}

function getScenarioStatus(statuses: Status[]): Status {
  if (statuses.includes('failed')) return 'failed';
  if (statuses.includes('ambiguous')) return 'ambiguous';
  if (statuses.includes('undefined')) return 'undefined';
  if (statuses.includes('pending')) return 'pending';
  if (statuses.includes('skipped')) return 'skipped';
  if (statuses.length && statuses.every((s) => s === 'passed')) return 'passed';
  return 'unknown';
}

function normalizeStatus(status?: Status): Status { return status || 'unknown'; }
function statusGroup(status: Status): 'pass' | 'fail' | 'skip' { if (status === 'passed') return 'pass'; if (status === 'failed') return 'fail'; return 'skip'; }
function isSkippedLike(status: Status): boolean { return statusGroup(status) === 'skip'; }
function getMimeType(e: CucumberEmbedding): string { return e.mime_type || e.media?.type || 'application/octet-stream'; }

function formatDuration(ns: number): string {
  if (!ns) return '0 ms';
  const ms = ns / 1_000_000;
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s % 60)}s`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function slug(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100); }
function toWebPath(fp: string): string { return fp.split(path.sep).join('/'); }
function formatStepText(step?: CucumberStep): string { if (!step) return 'Unknown failed step'; return `${(step.keyword || '').trim()} ${step.name || 'Hook'}`.trim(); }
function formatSource(feature: CucumberFeature, scenario: CucumberScenario): string { const src = feature.uri || 'feature file'; return scenario.line ? `${src}:${scenario.line}` : src; }
function summarizeError(error: string): string { const firstLine = error.split(/\r?\n/).find((l) => l.trim()); return cleanLine(firstLine || error); }
function cleanLine(v: string): string { return v.replace(/\s+/g, ' ').trim(); }
function matchText(v: string, p: RegExp): string | undefined { return cleanLine(v.match(p)?.[1] || ''); }
function decodeAttachmentText(data: string): string { try { return Buffer.from(data, 'base64').toString('utf8'); } catch { return data; } }
function stripHtml(v: string): string { return v.replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\n{2,}/g,'\n').trim(); }

function classifyFailure(error: string): { likelyIssue: string; suggestedAction: string } {
  if (/timeout/i.test(error)) return { likelyIssue: 'The step waited too long. Most often this means the page did not load as expected, the locator did not match, or the site was slow.', suggestedAction: 'Check the failed step screenshot and trace, then verify the locator/page state used by that step.' };
  if (/locator|strict mode|not visible|not enabled|not attached|waiting for/i.test(error)) return { likelyIssue: 'The test could not find or use the expected UI element.', suggestedAction: 'Update the matching locator in src/uistore or adjust the step to wait for the correct page state.' };
  if (/expect|toBe|assert/i.test(error)) return { likelyIssue: 'The application showed a value or state different from what the test expected.', suggestedAction: 'Check whether the expected value is still correct, then update the assertion or test data if the product behavior changed.' };
  if (/net::|navigation|ERR_/i.test(error)) return { likelyIssue: 'The browser had trouble reaching or navigating the page.', suggestedAction: 'Check the site availability, network calls, redirects, and base URL for this run.' };
  return { likelyIssue: 'The failure is not clearly a locator problem. It may be test data, page state, environment, or an application change.', suggestedAction: 'Open the trace and screenshot for this failed scenario and check the failed step first.' };
}

function getBranchName(): string {
  const headPath = path.resolve(rootDir, '.git', 'HEAD');
  if (!fs.existsSync(headPath)) return 'Local';
  const head = fs.readFileSync(headPath, 'utf8').trim();
  return head.startsWith('ref: refs/heads/') ? head.replace('ref: refs/heads/', '') : 'Detached';
}

function resetDirectory(dir: string): void {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}