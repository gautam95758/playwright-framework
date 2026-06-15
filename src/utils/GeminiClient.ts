import { config } from '../../config/config';
import logger from './Logger';

type GeminiTextPart = { text: string };
type GeminiInlineDataPart = { inlineData: { mimeType: string; data: string } };
type GeminiPart = GeminiTextPart | GeminiInlineDataPart;
type GeminiContent = { parts?: GeminiTextPart[] };
type GeminiCandidate = { content?: GeminiContent; finishReason?: string };
type GeminiGenerateContentResponse = {
  candidates?: GeminiCandidate[];
  error?: { message?: string; code?: number; status?: string };
};

export type GeminiGenerateOptions = {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: 'application/json' | 'text/plain';
};

export class GeminiClient {
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly defaultModel: string;
  private readonly visionModel: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryBaseDelayMs: number;
  private readonly retryMaxDelayMs: number;

  constructor() {
    this.apiKey = config.gemini.apiKey;
    this.apiUrl = config.gemini.apiUrl;
    this.defaultModel = config.gemini.model;
    this.visionModel = config.gemini.visionModel;
    this.timeout = config.gemini.timeout;
    this.maxRetries = Math.max(0, config.gemini.maxRetries);
    this.retryBaseDelayMs = Math.max(0, config.gemini.retryBaseDelayMs);
    this.retryMaxDelayMs = Math.max(0, config.gemini.retryMaxDelayMs);
  }

  isConfigured(): boolean {
    return this.apiKey.trim().length > 0;
  }

  async generateText(prompt: string, options: GeminiGenerateOptions = {}): Promise<string> {
    return this.generateContent([{ text: prompt }], options);
  }

  async generateJson<T>(payload: unknown, options: GeminiGenerateOptions = {}): Promise<T> {
    const jsonInstruction =
      '\n\nCRITICAL: Your entire response must be a single valid JSON value only. ' +
      'Do NOT wrap it in markdown code fences. Do NOT add any text before or after the JSON.';

    const raw = await this.generateContent([{ text: JSON.stringify(payload) + jsonInstruction }], {
      temperature: 0.1,
      maxOutputTokens: 1200,
      responseMimeType: 'application/json',
      ...options,
    });

    return parseJsonResponse<T>(raw);
  }

  async generateVisionText(
    prompt: string,
    images: Array<{ data: Buffer; mimeType: string }>,
    options: GeminiGenerateOptions = {},
  ): Promise<string> {
    const parts: GeminiPart[] = [
      { text: prompt },
      ...images.map((image) => ({
        inlineData: { mimeType: image.mimeType, data: image.data.toString('base64') },
      })),
    ];

    return this.generateContent(parts, {
      model: options.model || this.visionModel,
      temperature: options.temperature ?? 0.1,
      maxOutputTokens: options.maxOutputTokens ?? 1200,
    });
  }

  private async generateContent(parts: GeminiPart[], options: GeminiGenerateOptions): Promise<string> {
    if (!this.apiKey.trim()) {
      throw new Error('GEMINI_API_KEY is required to call the Gemini API');
    }

    const model = options.model || this.defaultModel;
    const endpoint = `${this.apiUrl}/models/${model}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const requestBody = JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxOutputTokens ?? 1024,
        ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
      },
    });

    logger.info(`Calling Gemini API | Model: "${model}"`);

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
          signal: controller.signal,
        });

        const data = await readGeminiResponse(response);

        if (!response.ok || data.error) {
          const errMsg = data.error?.message || response.statusText;
          const errCode = data.error?.code || response.status;

          if (isRetryableGeminiError(errCode) && attempt < this.maxRetries) {
            const retryDelayMs = this.getRetryDelayMs(response, errMsg, attempt);
            logger.warn(
              `Gemini API retryable error (${errCode}). Retrying in ${Math.ceil(
                retryDelayMs / 1000,
              )}s (${attempt + 1}/${this.maxRetries})`,
            );
            await sleep(retryDelayMs);
            continue;
          }

          throw new Error(`Gemini API error (${errCode}): ${errMsg}${getGeminiErrorHint(errCode, model)}`);
        }

        const text = data.candidates?.[0]?.content?.parts
          ?.map((part) => part.text)
          .filter(Boolean)
          .join('\n')
          .trim();

        if (!text) {
          const finishReason = data.candidates?.[0]?.finishReason;
          throw new Error(
            `Gemini returned empty response${finishReason ? ` (finishReason: ${finishReason})` : ''}`,
          );
        }

        logger.info('Gemini API response received successfully');
        return text;
      } catch (error) {
        if ((error as Error).name === 'AbortError' && attempt < this.maxRetries) {
          const retryDelayMs = this.getRetryDelayMs(undefined, undefined, attempt);
          logger.warn(
            `Gemini API request timed out. Retrying in ${Math.ceil(
              retryDelayMs / 1000,
            )}s (${attempt + 1}/${this.maxRetries})`,
          );
          await sleep(retryDelayMs);
          continue;
        }

        logger.error(`Gemini API call failed | Error: ${(error as Error).message}`);
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    throw new Error('Gemini API call failed after retry attempts');
  }

  private getRetryDelayMs(response: Response | undefined, message: string | undefined, attempt: number): number {
    const retryAfterHeader = response?.headers.get('retry-after');
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
    const retryInSeconds = message?.match(/retry in\s+([0-9.]+)s/i)?.[1];
    const messageDelayMs = retryInSeconds ? Number(retryInSeconds) * 1000 : NaN;
    const headerDelayMs = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1000 : NaN;
    const fallbackDelayMs = this.retryBaseDelayMs * 2 ** attempt;
    const delayMs = [messageDelayMs, headerDelayMs, fallbackDelayMs].find((value) =>
      Number.isFinite(value),
    ) as number;

    return Math.min(Math.max(delayMs, 0), this.retryMaxDelayMs);
  }
}

async function readGeminiResponse(response: Response): Promise<GeminiGenerateContentResponse> {
  const raw = await response.text();
  if (!raw) return {};

  try {
    return JSON.parse(raw) as GeminiGenerateContentResponse;
  } catch {
    return {
      error: {
        code: response.status,
        message: raw.slice(0, 1000),
        status: response.statusText,
      },
    };
  }
}

function isRetryableGeminiError(code: number): boolean {
  return code === 429 || code === 500 || code === 502 || code === 503 || code === 504;
}

function getGeminiErrorHint(code: number, model: string): string {
  if (code === 404) {
    return ` - model "${model}" was not found. Check GEMINI_MODEL in .env.`;
  }
  if (code === 400) {
    return ' - bad request. Verify GEMINI_API_KEY, GEMINI_MODEL, and the request payload.';
  }
  if (code === 401 || code === 403) {
    return ' - authentication failed. Verify GEMINI_API_KEY and API access for this project.';
  }
  if (code === 429) {
    return ' - quota or rate limit reached. Wait for the retry window, reduce Gemini calls, change model, or use a key/project with available quota.';
  }
  return '';
}

function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const jsonValue = extractFirstJsonValue(cleaned);

    if (jsonValue) {
      try {
        return JSON.parse(jsonValue) as T;
      } catch {
        // Fall through to the detailed error below.
      }
    }

    const selectorSuggestion = parseSelectorSuggestionFallback(cleaned);
    if (selectorSuggestion) {
      logger.warn('Gemini returned malformed JSON; recovered suggestedSelectors from the response text');
      return selectorSuggestion as T;
    }

    throw new Error(`Gemini response was not valid JSON.\n\nResponse:\n${cleaned.slice(0, 1000)}`);
  }
}

function parseSelectorSuggestionFallback(value: string): { suggestedSelectors: string[]; reason: string; confidence: number } | undefined {
  if (!/"suggestedSelectors"\s*:/.test(value)) {
    return undefined;
  }

  const selectors = Array.from(
    value.matchAll(/(?:page\.)?(getBy(?:Role|Placeholder|TestId|Text|Label|AltText|Title)\([^\n\r\]]+\)|locator\(\s*['"][^'"]+['"]\s*\)|[#.][a-z0-9_[\]="': -]+)/gi),
  )
    .map((match) => match[0].trim().replace(/,$/, ''))
    .filter((selector) => selector.includes('(') || /^[#.[]/.test(selector));

  const uniqueSelectors = Array.from(new Set(selectors));
  if (!uniqueSelectors.length) {
    return undefined;
  }

  const reason = value.match(/"reason"\s*:\s*"([^"]*)/)?.[1] || 'Recovered locator suggestions from malformed Gemini JSON.';
  const confidenceText = value.match(/"confidence"\s*:\s*([0-9.]+)/)?.[1];
  const confidence = confidenceText ? Number(confidenceText) : 0.8;

  return {
    suggestedSelectors: uniqueSelectors,
    reason,
    confidence: Number.isFinite(confidence) ? Math.min(Math.max(confidence, 0), 1) : 0.8,
  };
}

function extractFirstJsonValue(value: string): string | undefined {
  const start = value.search(/[\[{]/);
  if (start === -1) return undefined;

  const opener = value[start];
  const closer = opener === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < value.length; i++) {
    const char = value[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === opener) depth++;
    else if (char === closer) {
      depth--;
      if (depth === 0) return value.slice(start, i + 1);
    }
  }

  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const geminiClient = new GeminiClient();
