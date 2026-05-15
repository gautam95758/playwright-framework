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
  line?: number;
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
  id: string;
  serial: number;
  featureName: string;
  featureUri: string;
  keyword: string;
  name: string;
  line?: number;
  tags: string[];
  steps: CucumberStep[];
  status: Status;
  duration: number;
  screenshots: string[];
  errors: string[];
};

const rootDir = process.cwd();
const jsonPath = path.resolve(rootDir, 'reports', 'cucumber-report.json');
const reportDir = path.resolve(rootDir, 'reports', 'html');
const artifactsDir = path.join(reportDir, 'artifacts');
const logArtifactDir = path.join(artifactsDir, 'logs');
const screenshotArtifactDir = path.join(artifactsDir, 'screenshots');
const reportPath = path.join(reportDir, 'index.html');

if (!fs.existsSync(jsonPath)) {
  throw new Error(`Cucumber JSON report not found at ${jsonPath}. Run npm test first.`);
}

resetDirectory(reportDir);
fs.mkdirSync(logArtifactDir, { recursive: true });
fs.mkdirSync(screenshotArtifactDir, { recursive: true });

const features = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as CucumberFeature[];
const scenarios = flattenScenarios(features);
const summary = buildSummary(scenarios);
const copiedLogs = copyFiles(path.resolve(rootDir, 'logs'), logArtifactDir, ['.log']);
const copiedScreenshots = copyFiles(path.resolve(rootDir, 'screenshots'), screenshotArtifactDir, ['.png', '.jpg', '.jpeg']);

fs.writeFileSync(reportPath, renderReport(scenarios, summary, copiedLogs, copiedScreenshots), 'utf8');

console.log(`Custom HTML report generated: ${reportPath}`);

function flattenScenarios(features: CucumberFeature[]): ScenarioReport[] {
  let serial = 1;

  return features.flatMap((feature, featureIndex) =>
    (feature.elements || [])
      .filter((element) => (element.keyword || '').toLowerCase().includes('scenario'))
      .map((scenario, scenarioIndex) => {
        const id = slug(`${feature.name || 'feature'}-${scenario.name || 'scenario'}-${featureIndex}-${scenarioIndex}`);
        const steps = scenario.steps || [];
        const executableSteps = steps.filter((step) => !step.hidden);
        const statuses = steps.map((step) => normalizeStatus(step.result?.status));
        const status = getScenarioStatus(statuses);
        const screenshots = extractScenarioScreenshots(id, steps);
        const errors = steps
          .map((step) => step.result?.error_message)
          .filter((message): message is string => Boolean(message));

        return {
          id,
          serial: serial++,
          featureName: feature.name || 'Unnamed Feature',
          featureUri: feature.uri || '',
          keyword: scenario.keyword || 'Scenario',
          name: scenario.name || 'Unnamed Scenario',
          line: scenario.line,
          tags: (scenario.tags || []).map((tag) => tag.name || '').filter(Boolean),
          steps: executableSteps,
          status,
          duration: steps.reduce((total, step) => total + (step.result?.duration || 0), 0),
          screenshots,
          errors,
        };
      })
  );
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
  const other = scenarios.filter((scenario) => ['skipped', 'pending', 'undefined', 'ambiguous', 'unknown'].includes(scenario.status)).length;
  const duration = scenarios.reduce((totalDuration, scenario) => totalDuration + scenario.duration, 0);
  const passRate = total ? Math.round((passed / total) * 100) : 0;

  return { total, passed, failed, other, duration, passRate };
}

function renderReport(
  scenarios: ScenarioReport[],
  summary: ReturnType<typeof buildSummary>,
  copiedLogs: string[],
  copiedScreenshots: string[]
): string {
  const passAngle = Math.round((summary.passRate / 100) * 360);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Test Report</title>
  <style>
    :root {
      --page: #f7f8fb;
      --surface: #ffffff;
      --surface-2: #fbfcfe;
      --ink: #121826;
      --muted: #667085;
      --line: #e4e7ec;
      --brand: #9b1b46;
      --teal: #087f8c;
      --green: #0f8a61;
      --red: #c83532;
      --amber: #a66b00;
      --navy: #182230;
      --shadow: 0 18px 50px rgba(18, 24, 38, 0.08);
      --soft-shadow: 0 8px 24px rgba(18, 24, 38, 0.06);
      --radius: 8px;
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      background: var(--page);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, "Segoe UI", Roboto, Arial, Helvetica, sans-serif;
      line-height: 1.5;
    }
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      z-index: -1;
      background:
        radial-gradient(circle at 12% 8%, rgba(155, 27, 70, 0.10), transparent 28%),
        radial-gradient(circle at 88% 12%, rgba(8, 127, 140, 0.10), transparent 24%),
        linear-gradient(180deg, #ffffff 0%, var(--page) 44%);
    }

    a { color: var(--teal); font-weight: 760; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .wrap { max-width: 1240px; margin: 0 auto; padding: 24px 20px; }
    .shell { display: grid; gap: 22px; }
    .topbar {
      position: sticky;
      top: 0;
      z-index: 10;
      border-bottom: 1px solid rgba(228, 231, 236, 0.86);
      background: rgba(255, 255, 255, 0.88);
      backdrop-filter: blur(16px);
    }
    .topbar-inner {
      max-width: 1240px;
      margin: 0 auto;
      padding: 14px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
    }
    .brand-lockup { display: flex; align-items: center; gap: 12px; min-width: 220px; }
    .mark {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      display: grid;
      place-items: center;
      background: var(--brand);
      color: #fff;
      font-weight: 900;
      letter-spacing: .02em;
      box-shadow: var(--soft-shadow);
    }
    h1, h2, h3 { margin: 0; line-height: 1.16; letter-spacing: 0; }
    h1 { font-size: 27px; color: var(--ink); font-weight: 880; }
    h2 { font-size: 20px; font-weight: 830; }
    h3 { font-size: 16px; font-weight: 800; }
    .nav { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
    .nav a {
      padding: 8px 12px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--surface);
      color: var(--ink);
      font-size: 13px;
      box-shadow: 0 2px 8px rgba(18, 24, 38, 0.03);
    }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: 18px;
      align-items: stretch;
    }
    .panel {
      background: rgba(255, 255, 255, 0.94);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
    }
    .hero-main {
      padding: 22px;
      display: grid;
      align-content: space-between;
      min-height: 178px;
      overflow: hidden;
      position: relative;
    }
    .hero-main::after {
      content: "";
      position: absolute;
      right: 22px;
      top: 22px;
      width: 210px;
      height: 10px;
      border-radius: 999px;
      background: linear-gradient(90deg, var(--brand), var(--teal), var(--green));
      opacity: .88;
    }
    .eyebrow {
      color: var(--brand);
      font-size: 12px;
      font-weight: 880;
      letter-spacing: .08em;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .hero-title { max-width: 720px; font-size: 31px; font-weight: 900; }
    .hero-meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; color: var(--muted); font-size: 13px; }
    .hero-meta span {
      padding: 6px 10px;
      background: var(--surface-2);
      border: 1px solid var(--line);
      border-radius: 999px;
    }
    .score-panel {
      padding: 20px;
      display: grid;
      place-items: center;
      text-align: center;
    }
    .donut {
      width: 152px;
      height: 152px;
      border-radius: 50%;
      background: conic-gradient(var(--green) 0deg ${passAngle}deg, #edf1f5 ${passAngle}deg 360deg);
      display: grid;
      place-items: center;
      margin-bottom: 12px;
    }
    .donut-inner {
      width: 106px;
      height: 106px;
      border-radius: 50%;
      background: #fff;
      display: grid;
      place-items: center;
      box-shadow: inset 0 0 0 1px var(--line);
      font-size: 31px;
      font-weight: 900;
      color: var(--green);
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 14px;
    }
    .stat {
      padding: 16px;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      box-shadow: var(--soft-shadow);
    }
    .stat-label { color: var(--muted); font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
    .stat-value { display: block; margin-top: 8px; font-size: 30px; font-weight: 920; }
    .stat-note { margin-top: 6px; color: var(--muted); font-size: 13px; }

    section {
      scroll-margin-top: 90px;
      padding: 20px;
    }
    .section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 14px;
    }
    .section-kicker { color: var(--muted); font-size: 13px; }
    .table-wrap {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      overflow: auto;
      background: #fff;
    }
    table { width: 100%; min-width: 860px; border-collapse: separate; border-spacing: 0; }
    th, td { padding: 14px 14px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: middle; }
    th {
      position: sticky;
      top: 67px;
      z-index: 3;
      background: #f8fafc;
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .06em;
      font-weight: 860;
    }
    tbody tr:last-child td { border-bottom: 0; }
    tbody tr:hover { background: #fdf6f8; }
    .case-link { color: var(--ink); font-weight: 860; }
    .feature-text { color: var(--muted); font-size: 13px; }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 26px;
      padding: 4px 10px;
      border-radius: 999px;
      color: #fff;
      font-size: 12px;
      font-weight: 880;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .pill.passed { background: var(--green); }
    .pill.failed { background: var(--red); }
    .pill.skipped, .pill.pending, .pill.undefined, .pill.ambiguous, .pill.unknown { background: var(--amber); }
    .view-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 32px;
      padding: 6px 11px;
      border-radius: 999px;
      border: 1px solid #b7dfe3;
      background: #f0fbfc;
      color: var(--teal);
      font-size: 13px;
      font-weight: 860;
    }

    .scenario {
      padding: 0;
      overflow: hidden;
    }
    .scenario-header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 16px;
      padding: 18px 20px;
      background: linear-gradient(180deg, #ffffff, #fbfcfe);
      border-bottom: 1px solid var(--line);
    }
    .scenario-title { display: flex; gap: 12px; align-items: flex-start; }
    .serial {
      flex: 0 0 auto;
      width: 38px;
      height: 38px;
      border-radius: 8px;
      display: grid;
      place-items: center;
      background: var(--navy);
      color: #fff;
      font-size: 13px;
      font-weight: 900;
    }
    .scenario-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 9px; color: var(--muted); font-size: 13px; }
    .scenario-meta span, .scenario-meta a {
      padding: 5px 9px;
      border: 1px solid var(--line);
      background: #fff;
      border-radius: 999px;
    }
    .scenario-body {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(320px, .85fr);
      gap: 18px;
      padding: 20px;
    }
    .subpanel {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: #fff;
      overflow: hidden;
    }
    .subpanel h3 {
      padding: 14px 16px;
      border-bottom: 1px solid var(--line);
      background: #fbfcfe;
    }
    .step-list { display: grid; gap: 0; }
    .step-item {
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr) auto;
      gap: 12px;
      padding: 13px 16px;
      border-bottom: 1px solid var(--line);
      align-items: start;
    }
    .step-item:last-child { border-bottom: 0; }
    .step-index {
      width: 28px;
      height: 28px;
      display: grid;
      place-items: center;
      border-radius: 999px;
      background: #f2f4f7;
      color: var(--muted);
      font-size: 12px;
      font-weight: 850;
    }
    .step-keyword { color: var(--brand); font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: .05em; }
    .step-name { margin-top: 2px; font-weight: 700; overflow-wrap: anywhere; }
    .step-duration { color: var(--muted); font-size: 13px; white-space: nowrap; }
    .evidence-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      padding: 14px;
    }
    figure {
      margin: 0;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      overflow: hidden;
      background: #fff;
    }
    figure img {
      display: block;
      width: 100%;
      height: 240px;
      object-fit: contain;
      background: #101828;
    }
    figcaption {
      padding: 9px 10px;
      color: var(--muted);
      font-size: 13px;
      border-top: 1px solid var(--line);
      background: #fff;
    }
    .artifact-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 14px;
    }
    .logs-body { display: grid; gap: 16px; }
    .links { display: flex; flex-wrap: wrap; gap: 10px; }
    .links a {
      padding: 8px 11px;
      border-radius: 999px;
      border: 1px solid #b7dfe3;
      background: #f0fbfc;
      font-size: 13px;
    }
    pre {
      margin: 0;
      padding: 14px;
      max-height: 320px;
      overflow: auto;
      border-radius: var(--radius);
      background: #111827;
      color: #f8fafc;
      font-size: 12px;
      line-height: 1.55;
      white-space: pre-wrap;
    }
    .empty { padding: 16px; color: var(--muted); }
    footer {
      padding: 28px 20px 38px;
      text-align: center;
      color: var(--muted);
      font-size: 14px;
    }
    footer strong { color: var(--brand); }

    @media (max-width: 980px) {
      .hero, .scenario-body { grid-template-columns: 1fr; }
      .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .topbar-inner, .scenario-header { grid-template-columns: 1fr; display: grid; }
      .nav { justify-content: flex-start; }
      th { position: static; }
    }
    @media (max-width: 620px) {
      .wrap { padding: 18px 14px; }
      .topbar-inner { padding: 12px 14px; }
      .stats { grid-template-columns: 1fr; }
      .hero-title { font-size: 25px; }
      .hero-main::after { display: none; }
      .step-item { grid-template-columns: 30px minmax(0, 1fr); }
      .step-duration { grid-column: 2; }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="topbar-inner">
      <div class="brand-lockup">
        <div class="mark">TR</div>
        <h1>Test Report</h1>
      </div>
      <nav class="nav">
        <a href="#summary">Summary</a>
        <a href="#testcases">Test Cases</a>
        <a href="#details">Details</a>
        <a href="#logs">Logs</a>
        <a href="#screenshots">Screenshots</a>
      </nav>
    </div>
  </header>

  <main class="wrap shell">
    <div class="hero" id="summary">
      <section class="panel hero-main">
        <div>
          <div class="eyebrow">Automation Run</div>
          <div class="hero-title">${summary.failed === 0 ? 'All scenarios completed successfully.' : `${summary.failed} scenario${summary.failed === 1 ? '' : 's'} need attention.`}</div>
        </div>
        <div class="hero-meta">
          <span>${summary.total} scenarios</span>
          <span>${scenarios.reduce((count, scenario) => count + scenario.steps.length, 0)} steps</span>
          <span>${formatDuration(summary.duration)}</span>
          <span>${copiedScreenshots.length} screenshot artifacts</span>
        </div>
      </section>

      <aside class="panel score-panel">
        <div class="donut"><div class="donut-inner">${summary.passRate}%</div></div>
        <h2>Pass Rate</h2>
        <div class="section-kicker">${summary.passed} passed out of ${summary.total}</div>
      </aside>
    </div>

    <div class="stats">
      ${metricCard('Total', String(summary.total), 'Complete scenario count')}
      ${metricCard('Passed', String(summary.passed), 'Green and clean')}
      ${metricCard('Failed', String(summary.failed), 'Needs triage')}
      ${metricCard('Other', String(summary.other), 'Skipped or unknown')}
      ${metricCard('Duration', formatDuration(summary.duration), 'End-to-end run time')}
    </div>

    <section class="panel" id="testcases">
      <div class="section-head">
        <div>
          <h2>Test Cases</h2>
          <div class="section-kicker">Click any test case to jump to executed steps, evidence, and source details.</div>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Test Case</th>
              <th>Feature</th>
              <th>Status</th>
              <th>Steps</th>
              <th>Duration</th>
              <th>Evidence</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            ${scenarios.map(renderScenarioRow).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <div id="details"></div>
    ${scenarios.map(renderScenarioDetails).join('')}

    <section class="panel" id="logs">
      <div class="section-head">
        <div>
          <h2>Logs</h2>
          <div class="section-kicker">Latest run logs are copied beside this report for working local links.</div>
        </div>
      </div>
      <div class="logs-body">
        <div class="links">
          ${copiedLogs.length ? copiedLogs.map((file) => `<a href="${escapeHtml(file)}" target="_blank">${escapeHtml(path.basename(file))}</a>`).join('') : '<span class="empty">No log files found.</span>'}
        </div>
        ${copiedLogs.map(renderLogPreview).join('')}
      </div>
    </section>

    <section class="panel" id="screenshots">
      <div class="section-head">
        <div>
          <h2>Screenshots</h2>
          <div class="section-kicker">All PNG artifacts saved during execution.</div>
        </div>
      </div>
      <div class="artifact-grid">
        ${copiedScreenshots.length ? copiedScreenshots.map(renderScreenshotArtifact).join('') : '<p class="empty">No screenshot files found.</p>'}
      </div>
    </section>
  </main>

  <footer>
    Report made by <strong>gautam rawat</strong>
  </footer>
</body>
</html>`;
}

function renderScenarioRow(scenario: ScenarioReport): string {
  return `
    <tr>
      <td>${scenario.serial.toString().padStart(2, '0')}</td>
      <td>
        <a class="case-link" href="#${scenario.id}">${escapeHtml(scenario.name)}</a>
        <div class="feature-text">${escapeHtml(scenario.keyword)}${scenario.line ? ` - line ${scenario.line}` : ''}</div>
      </td>
      <td>${escapeHtml(scenario.featureName)}</td>
      <td><span class="pill ${scenario.status}">${escapeHtml(scenario.status)}</span></td>
      <td>${scenario.steps.length}</td>
      <td>${formatDuration(scenario.duration)}</td>
      <td>${scenario.screenshots.length} screenshot${scenario.screenshots.length === 1 ? '' : 's'}</td>
      <td><a class="view-link" href="#${scenario.id}">View</a></td>
    </tr>`;
}

function renderScenarioDetails(scenario: ScenarioReport): string {
  return `
    <section id="${scenario.id}" class="panel scenario">
      <div class="scenario-header">
        <div class="scenario-title">
          <div class="serial">${scenario.serial.toString().padStart(2, '0')}</div>
          <div>
            <h2>${escapeHtml(scenario.name)}</h2>
            <div class="scenario-meta">
              <span>${escapeHtml(scenario.featureName)}</span>
              <span>${formatDuration(scenario.duration)}</span>
              ${scenario.featureUri ? `<a href="${relativeLink(path.resolve(rootDir, scenario.featureUri))}" target="_blank">Feature file</a>` : ''}
              ${scenario.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
            </div>
          </div>
        </div>
        <span class="pill ${scenario.status}">${escapeHtml(scenario.status)}</span>
      </div>

      <div class="scenario-body">
        <div class="subpanel">
          <h3>Executed Steps</h3>
          <div class="step-list">
            ${scenario.steps.map(renderStepItem).join('')}
          </div>
        </div>

        <div class="subpanel">
          <h3>Evidence</h3>
          <div class="evidence-grid">
            ${
              scenario.screenshots.length
                ? scenario.screenshots
                    .map(
                      (src, index) => `
                        <figure>
                          <a href="${escapeHtml(src)}" target="_blank"><img src="${escapeHtml(src)}" alt="${escapeHtml(scenario.name)} screenshot ${index + 1}"></a>
                          <figcaption>Screenshot ${index + 1}</figcaption>
                        </figure>`
                    )
                    .join('')
                : '<p class="empty">No screenshot was attached for this scenario.</p>'
            }
            ${scenario.errors.length ? scenario.errors.map((error) => `<pre>${escapeHtml(error)}</pre>`).join('') : ''}
          </div>
        </div>
      </div>
    </section>`;
}

function renderStepItem(step: CucumberStep, index: number): string {
  const status = normalizeStatus(step.result?.status);

  return `
    <div class="step-item">
      <div class="step-index">${index + 1}</div>
      <div>
        <div class="step-keyword">${escapeHtml((step.keyword || '').trim())}</div>
        <div class="step-name">${escapeHtml(step.name || 'Hook')}</div>
      </div>
      <div class="step-duration">${formatDuration(step.result?.duration || 0)}</div>
    </div>`;
}

function renderLogPreview(relativeFile: string): string {
  const absoluteFile = path.join(reportDir, relativeFile);
  const content = fs.existsSync(absoluteFile) ? fs.readFileSync(absoluteFile, 'utf8') : '';
  const lines = content.trim().split(/\r?\n/).slice(-90).join('\n');

  return `
    <div class="subpanel">
      <h3>${escapeHtml(path.basename(relativeFile))}</h3>
      <pre>${escapeHtml(lines || 'Log file is empty.')}</pre>
    </div>`;
}

function renderScreenshotArtifact(relativeFile: string): string {
  const name = path.basename(relativeFile);

  return `
    <figure>
      <a href="${escapeHtml(relativeFile)}" target="_blank"><img src="${escapeHtml(relativeFile)}" alt="${escapeHtml(name)}"></a>
      <figcaption>${escapeHtml(name)}</figcaption>
    </figure>`;
}

function metricCard(label: string, value: string, note: string): string {
  return `
    <div class="stat">
      <span class="stat-label">${escapeHtml(label)}</span>
      <span class="stat-value">${escapeHtml(value)}</span>
      <div class="stat-note">${escapeHtml(note)}</div>
    </div>`;
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

function getMimeType(embedding: CucumberEmbedding): string {
  return embedding.mime_type || embedding.media?.type || 'application/octet-stream';
}

function formatDuration(nanoseconds: number): string {
  if (!nanoseconds) return '0 ms';

  const milliseconds = nanoseconds / 1_000_000;
  if (milliseconds < 1000) return `${Math.round(milliseconds)} ms`;

  const seconds = milliseconds / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

function relativeLink(absolutePath: string): string {
  return escapeHtml(toWebPath(path.relative(reportDir, absolutePath)));
}

function toWebPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
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

function resetDirectory(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}
