import fs from 'fs';
import path from 'path';
import { geminiClient } from '../src/utils/GeminiClient';
import logger from '../src/utils/Logger';

void main();

async function main(): Promise<void> {
  if (!geminiClient.isConfigured()) {
    throw new Error('GEMINI_API_KEY is required to generate missing tests');
  }

  const trendReport = readText('reports/ai-trend-report.json');
  const features = fs
    .readdirSync('features')
    .filter((file) => file.endsWith('.feature'))
    .map((file) => `# ${file}\n${readText(path.join('features', file))}`)
    .join('\n\n');

  const generated = await geminiClient.generateText(
    [
      'based on these failure patterns and existing feature files for a jewellery e-commerce site, what are the top 3 missing test scenarios?',
      'generate complete .feature file content for each. return only valid Gherkin feature text.',
      'failure patterns:',
      trendReport,
      'existing features:',
      features,
    ].join('\n'),
    { maxOutputTokens: 2400 },
  );

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join('features', `AI_Generated_${timestamp}.feature`);
  fs.writeFileSync(filePath, generated, 'utf8');
  logger.info(`[AI-GEN] 3 new scenarios written to ${filePath} - review before running`);
}

function readText(filePath: string): string {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}
