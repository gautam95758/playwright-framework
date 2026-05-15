import { loadEnvFile } from './loadEnv';

loadEnvFile();

export const config = {
  baseUrl: "https://www.reliancejewels.com/",
  excelPath: "./excel/data.xlsx",
  browser: process.env.BROWSER || "chromium",
  headless: false,
  pageTimeout: 60000,
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    apiUrl: process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta",
    timeout: Number(process.env.GEMINI_TIMEOUT_MS || 30000),
    locatorAnalysisEnabled: process.env.GEMINI_LOCATOR_ANALYSIS !== "false",
    locatorContextLimit: Number(process.env.GEMINI_LOCATOR_CONTEXT_LIMIT || 40),
  },
};
