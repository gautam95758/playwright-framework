import { Then, When } from '@cucumber/cucumber';
import { GeminiClient } from '../utils/GeminiClient';
import logger from '../utils/Logger';

let geminiResponse = '';

When('the user asks Gemini {string}', async function (prompt: string) {
  const gemini = new GeminiClient();
  geminiResponse = await gemini.generateText(prompt);
  logger.info(`Gemini response: ${geminiResponse}`);
});

Then('the Gemini response should contain {string}', async function (expectedText: string) {
  if (!geminiResponse.includes(expectedText)) {
    throw new Error(`Expected Gemini response to contain "${expectedText}", but got "${geminiResponse}"`);
  }
});
