import fs from 'fs';
import path from 'path';

type Failure = {
  scenario: string;
  category: string;
  commonCauseGroup: string;
  missingAwaitDetected: boolean;
};

type FailureReport = {
  failures?: Failure[];
};

type SelectorMemory = {
  healedSelectors?: Record<string, { file?: string; successCount: number; confidence?: number }>;
};

type TrendReport = {
  generatedAt: string;
  unstableLocators: Array<{ selector: string; file: string; healCount: number; needsHumanReview: boolean }>;
  commonCauses: Array<{ group: string; count: number; scenarios: string[] }>;
  systemicIssues: Array<{ category: string; count: number; recommendation: string }>;
  missingAwaitFlags: Failure[];
  humanReviewRequired: unknown[];
};

const failureReport = readJson<FailureReport>('reports/ai-failure-report.json', {});
const selectorMemory = readJson<SelectorMemory>('reports/selector-memory.json', {});

const failures = failureReport.failures || [];
const commonCauses = groupBy(failures, (failure) => failure.commonCauseGroup || failure.category)
  .filter((group) => group.items.length > 1)
  .map((group) => ({
    group: group.key,
    count: group.items.length,
    scenarios: group.items.map((failure) => failure.scenario),
  }));

const systemicIssues = groupBy(failures, (failure) => failure.category)
  .filter((group) => group.items.length >= 3)
  .map((group) => ({
    category: group.key,
    count: group.items.length,
    recommendation: `Investigate shared ${group.key} test infrastructure before changing individual scenarios.`,
  }));

const unstableLocators = Object.entries(selectorMemory.healedSelectors || {})
  .filter(([, value]) => value.successCount >= 2)
  .map(([selector, value]) => ({
    selector,
    file: value.file || '',
    healCount: value.successCount,
    needsHumanReview: Boolean(value.confidence && value.confidence < 0.9),
  }));

const existingTrend = readJson<Partial<TrendReport>>('reports/ai-trend-report.json', {});
const report: TrendReport = {
  generatedAt: new Date().toISOString(),
  unstableLocators,
  commonCauses,
  systemicIssues,
  missingAwaitFlags: failures.filter((failure) => failure.missingAwaitDetected),
  humanReviewRequired: Array.isArray(existingTrend.humanReviewRequired) ? existingTrend.humanReviewRequired : [],
};

fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/ai-trend-report.json', JSON.stringify(report, null, 2), 'utf8');

function readJson<T>(filePath: string, fallback: T): T {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(absolutePath, 'utf8')) as T;
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Array<{ key: string; items: T[] }> {
  const groups = new Map<string, T[]>();
  items.forEach((item) => {
    const key = getKey(item) || 'unknown';
    groups.set(key, [...(groups.get(key) || []), item]);
  });
  return [...groups.entries()].map(([key, groupedItems]) => ({ key, items: groupedItems }));
}
