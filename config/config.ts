import { loadEnvFile } from './loadEnv';

loadEnvFile();

const headed = process.env.HEADED?.toLowerCase() === 'true';
const headless = process.env.HEADLESS
  ? process.env.HEADLESS.toLowerCase() !== 'false'
  : !headed;

export const config = {
  baseUrl: process.env.BASE_URL || 'https://www.reliancejewels.com/',
  excelPath: process.env.EXCEL_PATH || './excel/data.xlsx',
  browser: process.env.BROWSER || 'chromium',
  headless,
  pageTimeout: Number(process.env.PAGE_TIMEOUT_MS || 60000),
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    // Fixed: "gemini-3.5-flash" does not exist — correct name is gemini-1.5-flash
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    visionModel: process.env.GEMINI_VISION_MODEL || process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    apiUrl: (process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, ''),
    timeout: Number(process.env.GEMINI_TIMEOUT_MS || 30000),
    maxRetries: Number(process.env.GEMINI_MAX_RETRIES || 2),
    retryBaseDelayMs: Number(process.env.GEMINI_RETRY_BASE_DELAY_MS || 1000),
    retryMaxDelayMs: Number(process.env.GEMINI_RETRY_MAX_DELAY_MS || 60000),
    locatorAnalysisEnabled: process.env.GEMINI_LOCATOR_ANALYSIS !== 'false',
    locatorContextLimit: Number(process.env.GEMINI_LOCATOR_CONTEXT_LIMIT || 40),
    selfHealEnabled: process.env.GEMINI_SELF_HEAL !== 'false',
    visualDiffEnabled: process.env.GEMINI_VISUAL_DIFF === 'true',
  },
};
