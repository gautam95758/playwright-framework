import fs from 'fs';
import path from 'path';
import { config } from '../../config/config';
import { geminiClient } from './GeminiClient';
import logger from './Logger';

export class GeminiVisionAnalyzer {
  async compareOrCreateBaseline(scenarioName: string, currentScreenshot: Buffer): Promise<string> {
    const baselineDir = path.resolve('screenshots', 'baseline');
    fs.mkdirSync(baselineDir, { recursive: true });

    const baselinePath = path.join(baselineDir, `${scenarioName}.png`);
    if (!fs.existsSync(baselinePath)) {
      fs.writeFileSync(baselinePath, currentScreenshot);
      return 'Baseline screenshot created for this scenario.';
    }

    if (!geminiClient.isConfigured()) {
      return 'Gemini Vision comparison skipped because GEMINI_API_KEY is not configured.';
    }

    if (!config.gemini.visualDiffEnabled) {
      return 'Gemini Vision comparison skipped because GEMINI_VISUAL_DIFF is not enabled.';
    }

    const baseline = fs.readFileSync(baselinePath);
    try {
      const diff = await geminiClient.generateVisionText(
        'describe any visual differences between these two screenshots in plain English - focus on layout changes, missing elements, moved buttons, colour changes',
        [
          { data: baseline, mimeType: 'image/png' },
          { data: currentScreenshot, mimeType: 'image/png' },
        ],
      );

      logger.info(`Gemini visual diff generated for scenario "${scenarioName}"`);
      return diff;
    } catch (error) {
      const message = (error as Error).message;
      logger.error(`Gemini visual diff skipped for scenario "${scenarioName}" | Error: ${message}`);
      return `Gemini Vision comparison skipped: ${message}`;
    }
  }
}

export const geminiVisionAnalyzer = new GeminiVisionAnalyzer();
