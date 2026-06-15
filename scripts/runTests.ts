import { spawnSync } from 'child_process';

const env = { ...process.env, LOG_RESET: 'true' };

const blockingPhases: Phase[] = [
  {
    name: 'Generate BDD specs',
    command: 'npx',
    args: ['bddgen'],
  },
];

for (const phase of blockingPhases) {
  const result = runPhase(phase);
  if (result !== 0) {
    printFailure(phase.name, result);
    process.exit(result);
  }
}

const playwrightResult = runPhase({
  name: 'Run Playwright tests',
  command: 'npx',
  args: ['playwright', 'test'],
});

const reportResult = runPhase({
  name: 'Generate custom HTML report',
  command: 'ts-node',
  args: ['scripts/generateReport.ts'],
});

printSummary(playwrightResult, reportResult);

process.exit(playwrightResult || reportResult);

type Phase = {
  name: string;
  command: string;
  args: string[];
};

function runPhase(phase: Phase): number {
  printHeader(phase.name, [phase.command, ...phase.args].join(' '));

  const result = spawnSync(phase.command, phase.args, {
    env,
    shell: true,
    stdio: 'inherit',
  });

  return result.status || 0;
}

function printHeader(name: string, command: string): void {
  console.log('\n============================================================');
  console.log(name);
  console.log(`> ${command}`);
  console.log('============================================================\n');
}

function printFailure(name: string, exitCode: number): void {
  console.error(`\n${name} failed with exit code ${exitCode}.`);
}

function printSummary(playwrightResult: number, reportResult: number): void {
  console.log('\n============================================================');
  console.log('Execution summary');
  console.log('============================================================');
  console.log(`Playwright tests: ${formatStatus(playwrightResult)}`);
  console.log(`Custom report: ${formatStatus(reportResult)}`);
  console.log('');
  console.log('Reports:');
  console.log('- Custom dashboard: reports/html/index.html');
  console.log('- Raw BDD JSON: reports/test-results.json');
}

function formatStatus(exitCode: number): string {
  return exitCode === 0 ? 'passed' : `failed (${exitCode})`;
}
