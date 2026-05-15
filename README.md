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
- Gemini analysis is skipped unless `GEMINI_API_KEY` is configured.

Designed by Gautam Rawat (Quality Engineer)
