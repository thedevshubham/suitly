import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { loadEnvFile } from 'node:process';

import { withTemporaryShopperPhoto } from '@suitly/shopper-photo';

import { OllamaShopperVisionProvider } from './ollama-shopper-vision-provider.js';

if (existsSync('.env.local')) {
  loadEnvFile('.env.local');
}

const inputPath =
  process.argv[2] ?? 'tests/fixtures/shopper-full-body-synthetic.png';
const outputPath =
  process.argv[3] ?? 'data/generated/shopper-vision-benchmark.json';
const model = requiredEnvironment('PRODUCT_INTELLIGENCE_MODEL');
const baseUrl = process.env.OLLAMA_BASE_URL;
const provider = new OllamaShopperVisionProvider(model, { baseUrl });
const input = await readFile(resolve(inputPath));
let temporaryPath = '';
const startedAt = performance.now();
const result = await withTemporaryShopperPhoto(
  input,
  async (photo) => {
    temporaryPath = photo.path;
    const analysisStartedAt = performance.now();
    const profile = await provider.analyseShopper({
      heightCm: 178,
      weightKg: 75,
      preferredColours: ['navy'],
      photo,
    });

    return {
      profile,
      preparedPhoto: {
        mimeType: photo.mimeType,
        width: photo.width,
        height: photo.height,
        byteLength: photo.byteLength,
      },
      analysisDurationMs: Math.round(performance.now() - analysisStartedAt),
    };
  },
  {
    maximumWidth: 512,
    maximumHeight: 1024,
  },
);

const report = {
  ...result,
  model: provider.model,
  promptVersion: provider.promptVersion,
  totalDurationMs: Math.round(performance.now() - startedAt),
  temporaryPhotoDeleted: !existsSync(temporaryPath),
  fixtureSynthetic: true,
};
await writeJson(outputPath, report);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

function requiredEnvironment(key: string): string {
  const value = process.env[key];
  if (value === undefined || value.length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  const resolvedPath = resolve(path);
  await mkdir(dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
