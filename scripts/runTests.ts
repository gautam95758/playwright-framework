import { spawnSync } from 'child_process';

const env = { ...process.env, PLAYWRIGHT_BROWSERS_PATH: '0' };

const cucumberResult = spawnSync('npx', ['cucumber-js', '--config', 'cucumber.config.js'], {
  env,
  shell: true,
  stdio: 'inherit',
});

const reportResult = spawnSync('npm', ['run', 'report:html'], {
  env,
  shell: true,
  stdio: 'inherit',
});

if (reportResult.status && reportResult.status !== 0) {
  process.exit(reportResult.status);
}

process.exit(cucumberResult.status || 0);
