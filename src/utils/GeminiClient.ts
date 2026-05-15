import { config } from '../../config/config';
import logger from './Logger';

type GeminiTextPart = {
  text: string;
};

type GeminiContent = {
  parts?: GeminiTextPart[];
};

type GeminiCandidate = {
  content?: GeminiContent;
};

type GeminiGenerateContentResponse = {
  candidates?: GeminiCandidate[];
  error?: {
    message?: string;
  };
};

export type GeminiGenerateOptions = {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
};

export class GeminiClient {
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly defaultModel: string;
  private readonly timeout: number;

  constructor() {
    this.apiKey = config.gemini.apiKey;
    this.apiUrl = config.gemini.apiUrl.replace(/\/$/, '');
    this.defaultModel = config.gemini.model;
    this.timeout = config.gemini.timeout;
  }

  isConfigured(): boolean {
    return this.apiKey.trim().length > 0;
  }

  async generateText(prompt: string, options: GeminiGenerateOptions = {}): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is required to call the Gemini API');
    }

    const model = options.model || this.defaultModel;
    const endpoint = `${this.apiUrl}/models/${model}:generateContent?key=${this.apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    logger.info(`Calling Gemini API | Model: "${model}"`);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: options.temperature ?? 0.2,
            maxOutputTokens: options.maxOutputTokens ?? 1024,
          },
        }),
        signal: controller.signal,
      });

      const data = (await response.json()) as GeminiGenerateContentResponse;

      if (!response.ok) {
        const message = data.error?.message || response.statusText;
        throw new Error(`Gemini API request failed (${response.status}): ${message}`);
      }

      const text = data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text)
        .filter(Boolean)
        .join('\n')
        .trim();

      if (!text) {
        throw new Error('Gemini API returned an empty response');
      }

      logger.info('Gemini API response received successfully');
      return text;
    } catch (e) {
      logger.error(`Gemini API call failed | Error: ${(e as Error).message}`);
      throw e;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const geminiClient = new GeminiClient();
