# Reliance Playwright Test Suite

BDD automation framework for Reliance Jewels using Playwright, TypeScript, and feature files.

## Project Structure

```text
features/               Test scenarios
src/pages/              Page object classes
src/stepdefinition/     Step definitions and hooks
src/uistore/            Locator files
src/utils/              Helpers, logger, Excel reader, Gemini utilities
excel/data.xlsx         Test data
reports/                Test results and custom HTML report
screenshots/            Screenshots captured during execution
```

Generated folders such as `.features-gen/`, `reports/`, `test-results/`, `logs/`, and `screenshots/` are ignored by git and can be safely recreated by a test run.

## Setup

Install project dependencies:

```bash
npm install
```

Install Playwright browsers locally for this project:

```bash
npx cross-env PLAYWRIGHT_BROWSERS_PATH=0 playwright install
```

## Run Tests

Run the full test suite and generate the custom report:

```bash
npm test
```

The test command runs these phases in order:

```text
1. BDD spec generation
2. Playwright execution
3. AI trend summary
4. Custom HTML report generation
```

Run the optional locator health scan separately when you want locator diagnostics:

```bash
npm run scan
```

Run in headed mode:

```bash
npm run test:headed
```

Generate only the custom HTML report from the latest test results:

```bash
npm run report:html
```

## Reports

The test run writes raw result data to:

```text
reports/test-results.json
```

The custom dashboard report is generated at:

```text
reports/html/index.html
```

The report includes scenario totals, pass/fail charts, feature breakdowns, step details, screenshots, and failure information.

The old Cucumber HTML report has been removed. The framework keeps only the Cucumber JSON output because the custom dashboard uses it as input.

## Current Feature Files

```text
features/BuyPendentAndRingFeature.feature
features/Chainanddiamond.feature
features/Earrings.feature
features/footerPoliciesAndNecklace.feature
features/PlatinumRing.feature
features/Vivaham.feature
```

## Notes

- `npm test` always generates the custom report after the run, even if a scenario fails.
- Screenshots are saved under `screenshots/` and copied into the report artifacts.
- Gemini failure analysis is skipped unless `GEMINI_API_KEY` is configured.
- Gemini visual diff is opt-in with `GEMINI_VISUAL_DIFF=true` so quota errors do not block normal execution.

Designed by Gautam Rawat (Quality Engineer)
