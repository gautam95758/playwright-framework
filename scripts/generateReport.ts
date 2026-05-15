import fs from 'fs';
import path from 'path';

type Status = 'passed' | 'failed' | 'skipped' | 'pending' | 'undefined' | 'ambiguous' | 'unknown';

type CucumberEmbedding = {
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
  screenshots: string[];
};

const rootDir = process.cwd();
const jsonPath = path.resolve(rootDir, 'reports', 'test-results.json');
const reportDir = path.resolve(rootDir, 'reports', 'html');
const artifactsDir = path.join(reportDir, 'artifacts');
const screenshotArtifactDir = path.join(artifactsDir, 'screenshots');
const reportPath = path.join(reportDir, 'index.html');

if (!fs.existsSync(jsonPath)) {
  throw new Error(`Test results JSON not found at ${jsonPath}. Run npm test first.`);
}

resetDirectory(reportDir);
fs.mkdirSync(screenshotArtifactDir, { recursive: true });

const features = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as CucumberFeature[];
const scenarios = flattenScenarios(features);
const copiedScreenshots = copyFiles(path.resolve(rootDir, 'screenshots'), screenshotArtifactDir, ['.png', '.jpg', '.jpeg']);
const summary = buildSummary(scenarios);
const featureSummary = buildFeatureSummary(scenarios);

fs.writeFileSync(reportPath, renderReport(scenarios, summary, featureSummary), 'utf8');

console.log(`Custom HTML report generated: ${reportPath}`);

function flattenScenarios(features: CucumberFeature[]): ScenarioReport[] {
  let id = 1;
  const reports: ScenarioReport[] = [];

  features.forEach((feature, featureIndex) => {
    (feature.elements || [])
      .filter((element) => (element.keyword || '').toLowerCase().includes('scenario'))
      .forEach((scenario, scenarioIndex) => {
        const steps = (scenario.steps || []).filter((step) => !step.hidden);
        const statuses = steps.map((step) => normalizeStatus(step.result?.status));
        const status = getScenarioStatus(statuses);
        const anchor = slug(`${feature.name || 'feature'}-${scenario.name || 'scenario'}-${featureIndex}-${scenarioIndex}`);
        const passedSteps = steps.filter((step) => normalizeStatus(step.result?.status) === 'passed').length;
        const error = steps.map((step) => step.result?.error_message).find(Boolean);

        reports.push({
          id: id++,
          anchor,
          name: scenario.name || 'Unnamed Scenario',
          feature: feature.name || 'Unnamed Feature',
          featureUri: feature.uri || '',
          line: scenario.line,
          status,
          duration: steps.reduce((total, step) => total + (step.result?.duration || 0), 0),
          steps,
          totalSteps: steps.length,
          passedSteps,
          tags: (scenario.tags || []).map((tag) => tag.name || '').filter(Boolean),
          error,
          screenshots: extractScenarioScreenshots(anchor, steps),
        });
      });
  });

  return reports;
}

function extractScenarioScreenshots(scenarioId: string, steps: CucumberStep[]): string[] {
  let imageIndex = 1;
  const screenshots: string[] = [];

  steps.forEach((step) => {
    (step.embeddings || [])
      .filter((embedding) => getMimeType(embedding).startsWith('image/') && embedding.data)
      .forEach((embedding) => {
        const extension = getMimeType(embedding).includes('jpeg') ? 'jpg' : 'png';
        const fileName = `${scenarioId}-${imageIndex++}.${extension}`;
        const destination = path.join(screenshotArtifactDir, fileName);
        fs.writeFileSync(destination, Buffer.from(embedding.data || '', 'base64'));
        screenshots.push(toWebPath(path.relative(reportDir, destination)));
      });
  });

  return screenshots;
}

function buildSummary(scenarios: ScenarioReport[]) {
  const total = scenarios.length;
  const passed = scenarios.filter((scenario) => scenario.status === 'passed').length;
  const failed = scenarios.filter((scenario) => scenario.status === 'failed').length;
  const skipped = scenarios.filter((scenario) => isSkippedLike(scenario.status)).length;
  const duration = scenarios.reduce((totalDuration, scenario) => totalDuration + scenario.duration, 0);
  const passRate = total ? Math.round((passed / total) * 100) : 0;
  const steps = scenarios.reduce((count, scenario) => count + scenario.totalSteps, 0);
  const featureCount = new Set(scenarios.map((scenario) => scenario.feature)).size;
  const averageDuration = total ? duration / total : 0;

  return { total, passed, failed, skipped, duration, passRate, steps, featureCount, averageDuration };
}

function buildFeatureSummary(scenarios: ScenarioReport[]) {
  const byFeature = new Map<string, { passed: number; failed: number; skipped: number }>();

  scenarios.forEach((scenario) => {
    const summary = byFeature.get(scenario.feature) || { passed: 0, failed: 0, skipped: 0 };
    if (scenario.status === 'passed') summary.passed += 1;
    else if (scenario.status === 'failed') summary.failed += 1;
    else summary.skipped += 1;
    byFeature.set(scenario.feature, summary);
  });

  return Array.from(byFeature.entries()).map(([feature, counts]) => ({ feature, ...counts }));
}

function renderReport(
  scenarios: ScenarioReport[],
  summary: ReturnType<typeof buildSummary>,
  featureSummary: ReturnType<typeof buildFeatureSummary>
): string {
  const generated = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

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
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-mono);
    min-height: 100vh;
    overflow-x: hidden;
  }
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(0,229,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,229,255,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
    z-index: 0;
  }

  .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; position: relative; z-index: 1; }
  header { padding: 48px 0 32px; border-bottom: 1px solid var(--border); margin-bottom: 40px; animation: fadeDown 0.6s ease both; }
  .header-inner { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
  .brand { display: flex; align-items: center; gap: 14px; }
  .logo-icon {
    width: 48px; height: 48px;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-head);
    font-weight: 800;
    color: #fff;
  }
  h1 {
    font-family: var(--font-head);
    font-size: clamp(1.6rem, 3vw, 2.4rem);
    font-weight: 800;
    letter-spacing: 0;
    background: linear-gradient(90deg, #fff 40%, var(--accent));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .subtitle { color: var(--muted); font-size: 0.78rem; margin-top: 4px; letter-spacing: 0.05em; }
  .run-meta { text-align: right; font-size: 0.75rem; color: var(--muted); line-height: 1.8; }
  .run-meta span { color: var(--accent); }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 16px;
    margin-bottom: 40px;
    animation: fadeUp 0.6s 0.1s ease both;
  }
  .stat-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 24px 20px;
    position: relative;
    overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
  }
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

  .charts-row {
    display: grid;
    grid-template-columns: 340px 1fr;
    gap: 20px;
    margin-bottom: 40px;
    animation: fadeUp 0.6s 0.2s ease both;
  }
  @media (max-width: 780px) { .charts-row { grid-template-columns: 1fr; } }
  .chart-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 28px; }
  .chart-title {
    font-family: var(--font-head);
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    margin-bottom: 20px;
  }
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
  .filter-btn {
    padding: 6px 14px;
    border-radius: 20px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .filter-btn.active, .filter-btn:hover { border-color: var(--accent); color: var(--accent); background: rgba(0,229,255,0.06); }
  .filter-btn.pass-btn.active { border-color: var(--pass); color: var(--pass); background: rgba(0,224,150,0.06); }
  .filter-btn.fail-btn.active { border-color: var(--fail); color: var(--fail); background: rgba(255,77,109,0.06); }
  .table-wrap { background: var(--card); border: 1px solid var(--border); border-radius: 16px; overflow-x: auto; margin-bottom: 40px; }
  table { width: 100%; border-collapse: collapse; min-width: 760px; }
  thead th {
    padding: 14px 20px;
    text-align: left;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--muted);
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    font-weight: 500;
  }
  tbody tr { border-bottom: 1px solid rgba(31,45,69,0.6); transition: background 0.15s; cursor: pointer; }
  tbody tr:last-child { border-bottom: none; }
  tbody tr:hover { background: rgba(0,229,255,0.04); }
  td { padding: 16px 20px; font-size: 0.8rem; vertical-align: middle; }
  .scenario-link { color: var(--text); text-decoration: none; font-weight: 500; display: flex; align-items: center; gap: 10px; transition: color 0.15s; }
  .scenario-link:hover { color: var(--accent); }
  .scenario-icon { font-size: 1rem; flex-shrink: 0; }
  .feature-tag {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 0.66rem;
    background: rgba(124,58,237,0.15);
    color: #a78bfa;
    border: 1px solid rgba(124,58,237,0.3);
    white-space: nowrap;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .badge.pass { background: rgba(0,224,150,0.12); color: var(--pass); border: 1px solid rgba(0,224,150,0.3); }
  .badge.fail { background: rgba(255,77,109,0.12); color: var(--fail); border: 1px solid rgba(255,77,109,0.3); }
  .badge.skip { background: rgba(255,209,102,0.12); color: var(--skip); border: 1px solid rgba(255,209,102,0.3); }
  .duration-cell { color: var(--muted); font-size: 0.75rem; }
  .steps-bar { width: 80px; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; display: inline-block; }
  .steps-fill { height: 100%; border-radius: 3px; background: var(--pass); }
  .steps-fill.fail { background: var(--fail); }
  .tag-row { margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap; }
  .tag {
    font-size: 0.62rem;
    color: var(--muted);
    background: rgba(255,255,255,0.04);
    padding: 1px 7px;
    border-radius: 10px;
    border: 1px solid var(--border);
  }

  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(6px);
    z-index: 100;
    display: flex; align-items: center; justify-content: center;
    opacity: 0; pointer-events: none;
    transition: opacity 0.25s;
    padding: 24px;
  }
  .modal-overlay.open { opacity: 1; pointer-events: all; }
  .modal {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 20px;
    width: 100%;
    max-width: 760px;
    max-height: 85vh;
    overflow-y: auto;
    transform: translateY(20px);
    transition: transform 0.25s;
    box-shadow: 0 40px 80px rgba(0,0,0,0.6);
  }
  .modal-overlay.open .modal { transform: translateY(0); }
  .modal-header { padding: 28px 28px 0; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  .modal-title { font-family: var(--font-head); font-size: 1.1rem; font-weight: 700; line-height: 1.3; }
  .modal-close {
    background: var(--border);
    border: none;
    color: var(--muted);
    width: 32px; height: 32px;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s, color 0.15s;
  }
  .modal-close:hover { background: var(--fail); color: #fff; }
  .modal-body { padding: 20px 28px 28px; }
  .modal-meta { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
  .meta-chip {
    padding: 4px 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    font-size: 0.7rem;
    color: var(--muted);
  }
  .meta-chip span { color: var(--text); }
  .steps-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
  .step-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 16px;
    background: var(--surface);
    border-radius: 10px;
    border-left: 3px solid transparent;
    font-size: 0.78rem;
  }
  .step-item.passed { border-color: var(--pass); }
  .step-item.failed { border-color: var(--fail); }
  .step-item.skipped, .step-item.pending, .step-item.undefined, .step-item.ambiguous, .step-item.unknown { border-color: var(--skip); }
  .step-icon { flex-shrink: 0; margin-top: 1px; }
  .step-text { line-height: 1.5; }
  .screenshot-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-top: 18px; }
  .screenshot-grid a { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; background: var(--surface); }
  .screenshot-grid img { display: block; width: 100%; height: 160px; object-fit: contain; background: #080a0e; }
  .error-block {
    background: rgba(255,77,109,0.08);
    border: 1px solid rgba(255,77,109,0.2);
    border-radius: 10px;
    padding: 14px 16px;
    margin-top: 16px;
    font-size: 0.74rem;
    color: var(--fail);
    line-height: 1.6;
    font-family: var(--font-mono);
    white-space: pre-wrap;
  }
  .error-label { font-weight: 600; margin-bottom: 6px; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; }

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
      <button class="modal-close" onclick="closeModalDirect()">x</button>
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

  <div class="stats-grid">
    <div class="stat-card total">
      <div class="stat-label">Total Scenarios</div>
      <div class="stat-value">${summary.total}</div>
      <div class="stat-sub">Across ${summary.featureCount} features</div>
    </div>
    <div class="stat-card passed">
      <div class="stat-label">Passed</div>
      <div class="stat-value">${summary.passed}</div>
      <div class="stat-sub">${summary.passRate}% pass rate</div>
    </div>
    <div class="stat-card failed">
      <div class="stat-label">Failed</div>
      <div class="stat-value">${summary.failed}</div>
      <div class="stat-sub">${summary.failed ? 'Needs attention' : 'No failures'}</div>
    </div>
    <div class="stat-card skipped">
      <div class="stat-label">Skipped</div>
      <div class="stat-value">${summary.skipped}</div>
      <div class="stat-sub">Skipped or pending</div>
    </div>
    <div class="stat-card duration">
      <div class="stat-label">Total Duration</div>
      <div class="stat-value">${formatDuration(summary.duration)}</div>
      <div class="stat-sub">Avg ${formatDuration(summary.averageDuration)}/scenario</div>
    </div>
  </div>

  <div class="charts-row">
    <div class="chart-card">
      <div class="chart-title">Pass / Fail Breakdown</div>
      <div class="pie-wrap">
        <canvas id="pieChart" width="200" height="200" style="max-width:200px;max-height:200px;"></canvas>
        <div class="pie-center">
          <span class="pie-pct">${summary.passRate}%</span>
          <span class="pie-pct-label">Pass Rate</span>
        </div>
      </div>
      <div class="legend">
        <div class="legend-item"><div class="legend-dot" style="background:var(--pass)"></div>Passed (${summary.passed})</div>
        <div class="legend-item"><div class="legend-dot" style="background:var(--fail)"></div>Failed (${summary.failed})</div>
        <div class="legend-item"><div class="legend-dot" style="background:var(--skip)"></div>Skipped (${summary.skipped})</div>
      </div>
    </div>

    <div class="chart-card">
      <div class="chart-title">Results by Feature</div>
      <div class="bar-chart-wrap">
        <canvas id="barChart"></canvas>
      </div>
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
        <thead>
          <tr>
            <th>#</th>
            <th>Scenario</th>
            <th>Feature</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Steps</th>
          </tr>
        </thead>
        <tbody id="tableBody"></tbody>
      </table>
    </div>
  </div>
</div>

<footer>
  <div class="container">
    Designed by <span>Gautam Rawat (Quality Engineer)</span>
  </div>
</footer>

<script>
const scenarios = ${JSON.stringify(toClientScenarios(scenarios))};
const featureData = ${JSON.stringify(featureSummary)};

const pieCtx = document.getElementById('pieChart').getContext('2d');
new Chart(pieCtx, {
  type: 'doughnut',
  data: {
    labels: ['Passed','Failed','Skipped'],
    datasets: [{
      data: [${summary.passed}, ${summary.failed}, ${summary.skipped}],
      backgroundColor: ['#00e096','#ff4d6d','#ffd166'],
      borderWidth: 0,
      hoverOffset: 6
    }]
  },
  options: {
    cutout: '72%',
    plugins: { legend: { display: false }, tooltip: {
      callbacks: { label: ctx => ' ' + ctx.label + ': ' + ctx.raw + ' scenarios' }
    }},
    animation: { animateRotate: true, duration: 900 }
  }
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
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color:'#64748b', font:{ size:11 }, boxWidth:10, boxHeight:10 } } },
    scales: {
      x: { stacked: true, ticks:{ color:'#64748b', font:{size:10} }, grid:{ color:'rgba(31,45,69,0.5)' } },
      y: { stacked: true, ticks:{ color:'#64748b', stepSize:1, font:{size:10} }, grid:{ color:'rgba(31,45,69,0.5)' }, beginAtZero:true }
    },
    animation: { duration: 900 }
  }
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
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderTable(filter);
}

function openModal(s) {
  document.getElementById('modal-title').textContent = s.name;
  const statusColor = s.statusGroup === 'pass' ? 'var(--pass)' : s.statusGroup === 'fail' ? 'var(--fail)' : 'var(--skip)';
  const meta = \`
    <div class="modal-meta">
      <div class="meta-chip">Feature: <span>\${escapeHtml(s.feature)}</span></div>
      <div class="meta-chip">Status: <span style="color:\${statusColor}">\${escapeHtml(s.status.toUpperCase())}</span></div>
      <div class="meta-chip">Duration: <span>\${escapeHtml(s.duration)}</span></div>
      <div class="meta-chip">Steps: <span>\${s.passedSteps}/\${s.totalSteps}</span></div>
      \${s.featureUri ? \`<div class="meta-chip">Source: <span>\${escapeHtml(s.featureUri)}\${s.line ? ':' + s.line : ''}</span></div>\` : ''}
    </div>\`;
  const stepsHtml = '<ul class="steps-list">' +
    s.steps.map((st,i) => \`
      <li class="step-item \${st.status}">
        <span class="step-icon" style="color:\${stepColor[st.status]}">\${stepIcon[st.status]}</span>
        <span class="step-text"><strong style="color:var(--muted);font-size:0.68rem">Step \${i+1} · \${escapeHtml(st.keyword)}</strong><br/>\${escapeHtml(st.name)}</span>
      </li>\`).join('') + '</ul>';
  const shotsHtml = s.screenshots.length
    ? '<div class="screenshot-grid">' + s.screenshots.map((src,i) => \`<a href="\${escapeHtml(src)}" target="_blank"><img src="\${escapeHtml(src)}" alt="Screenshot \${i + 1}"></a>\`).join('') + '</div>'
    : '';
  const errorHtml = s.error ? \`<div class="error-block"><div class="error-label">Failure Reason</div>\${escapeHtml(s.error)}</div>\` : '';
  document.getElementById('modal-body').innerHTML = meta + stepsHtml + shotsHtml + errorHtml;
  document.getElementById('modal').classList.add('open');
}

function closeModal(event) {
  if (event.target === document.getElementById('modal')) closeModalDirect();
}

function closeModalDirect() {
  document.getElementById('modal').classList.remove('open');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeModalDirect();
});

renderTable();
</script>
</body>
</html>`;
}

function toClientScenarios(scenarios: ScenarioReport[]) {
  return scenarios.map((scenario) => ({
    id: scenario.id,
    name: scenario.name,
    feature: scenario.feature,
    featureUri: scenario.featureUri,
    line: scenario.line,
    status: scenario.status,
    statusGroup: statusGroup(scenario.status),
    duration: formatDuration(scenario.duration),
    passedSteps: scenario.passedSteps,
    totalSteps: scenario.totalSteps,
    tags: scenario.tags,
    error: scenario.error,
    screenshots: scenario.screenshots,
    steps: scenario.steps.map((step) => ({
      keyword: (step.keyword || '').trim(),
      name: step.name || 'Hook',
      status: normalizeStatus(step.result?.status),
      duration: formatDuration(step.result?.duration || 0),
    })),
  }));
}

function copyFiles(sourceDir: string, destinationDir: string, extensions: string[]): string[] {
  if (!fs.existsSync(sourceDir)) {
    return [];
  }

  return fs
    .readdirSync(sourceDir)
    .filter((file) => extensions.includes(path.extname(file).toLowerCase()))
    .map((file) => {
      const source = path.join(sourceDir, file);
      const destination = path.join(destinationDir, file);
      fs.copyFileSync(source, destination);
      return toWebPath(path.relative(reportDir, destination));
    })
    .sort((a, b) => a.localeCompare(b));
}

function getScenarioStatus(statuses: Status[]): Status {
  if (statuses.includes('failed')) return 'failed';
  if (statuses.includes('ambiguous')) return 'ambiguous';
  if (statuses.includes('undefined')) return 'undefined';
  if (statuses.includes('pending')) return 'pending';
  if (statuses.includes('skipped')) return 'skipped';
  if (statuses.length && statuses.every((status) => status === 'passed')) return 'passed';
  return 'unknown';
}

function normalizeStatus(status?: Status): Status {
  return status || 'unknown';
}

function statusGroup(status: Status): 'pass' | 'fail' | 'skip' {
  if (status === 'passed') return 'pass';
  if (status === 'failed') return 'fail';
  return 'skip';
}

function isSkippedLike(status: Status): boolean {
  return statusGroup(status) === 'skip';
}

function getMimeType(embedding: CucumberEmbedding): string {
  return embedding.mime_type || embedding.media?.type || 'application/octet-stream';
}

function formatDuration(nanoseconds: number): string {
  if (!nanoseconds) return '0 ms';

  const milliseconds = nanoseconds / 1_000_000;
  if (milliseconds < 1000) return `${Math.round(milliseconds)} ms`;

  const seconds = milliseconds / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
}

function toWebPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function getBranchName(): string {
  const headPath = path.resolve(rootDir, '.git', 'HEAD');
  if (!fs.existsSync(headPath)) return 'Local';

  const head = fs.readFileSync(headPath, 'utf8').trim();
  return head.startsWith('ref: refs/heads/') ? head.replace('ref: refs/heads/', '') : 'Detached';
}

function resetDirectory(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}
