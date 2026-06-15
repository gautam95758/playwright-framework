import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from '../utils/World';
import { GeminiClient } from '../utils/GeminiClient';
import logger from '../utils/Logger';

const { When, Then } = createBdd(test);

let geminiResponse = '';

When('the user asks Gemini {string}', async (_fixtures, prompt: string) => {
  const gemini = new GeminiClient();
  geminiResponse = await gemini.generateText(prompt);
  logger.info(`Gemini response: ${geminiResponse}`);
});

Then('the Gemini response should contain {string}', async (_fixtures, expectedText: string) => {
  expect(geminiResponse).toContain(expectedText);
});
