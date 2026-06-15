import { geminiClient } from '../src/utils/GeminiClient';

async function main(): Promise<void> {
  if (!geminiClient.isConfigured()) {
    throw new Error('GEMINI_API_KEY is not configured. Add it to .env before running this check.');
  }

  const response = await geminiClient.generateText('Reply with exactly: GEMINI_OK', {
    temperature: 0,
    maxOutputTokens: 128,
  });

  if (!response.includes('GEMINI_OK')) {
    throw new Error(`Unexpected Gemini health-check response: ${response}`);
  }

  console.log('Gemini API health check passed.');
}

main().catch((error) => {
  console.error(`Gemini API health check failed: ${(error as Error).message}`);
  process.exit(1);
});
