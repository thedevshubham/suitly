import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { loadEnvFile } from 'node:process';

import {
  canonicalProductSchema,
  productIntelligenceSchema,
  type AIRecommendationResult,
} from '@suitly/core';
import {
  buildScoredCandidates,
  deterministicFallback,
  hydrateRecommendations,
  type EnrichedCatalogueProduct,
} from '@suitly/recommendation';
import { withTemporaryShopperPhoto } from '@suitly/shopper-photo';
import { z } from 'zod';

import { OllamaRecommendationProvider } from './ollama-recommendation-provider.js';

if (existsSync('.env.local')) {
  loadEnvFile('.env.local');
}

const cataloguePath =
  process.argv[2] ?? 'data/generated/products.enriched.ollama-qwen.json';
const photoPath =
  process.argv[3] ?? 'tests/fixtures/shopper-full-body-synthetic.png';
const outputPath =
  process.argv[4] ?? 'data/generated/recommendation-benchmark.json';
const storedEntrySchema = z.object({
  product: canonicalProductSchema,
  intelligence: productIntelligenceSchema,
});
const catalogue = storedEntrySchema
  .array()
  .parse(JSON.parse(await readFile(resolve(cataloguePath), 'utf8')) as unknown)
  .map((entry) => entry satisfies EnrichedCatalogueProduct);
const request = {
  merchantId: catalogue[0]?.product.merchantId ?? 'merchant_sample',
  audience: 'men',
  heightCm: 178,
  weightKg: 75,
  preferredColours: ['Black'],
  category: 'jacket',
} as const;
const candidates = buildScoredCandidates(catalogue, {
  ...request,
  preferredColours: [...request.preferredColours],
});
const provider = new OllamaRecommendationProvider(
  requiredEnvironment('PRODUCT_INTELLIGENCE_MODEL'),
  { baseUrl: process.env.OLLAMA_BASE_URL },
);
const photo = await readFile(resolve(photoPath));
const totalStartedAt = performance.now();
let aiDurationMs = 0;
let aiResult: AIRecommendationResult | undefined;
let aiFailure: string | undefined;
const response = await withTemporaryShopperPhoto(
  photo,
  async (temporaryPhoto) => {
    const aiStartedAt = performance.now();
    try {
      aiResult = await provider.analyseAndRank({
        heightCm: request.heightCm,
        weightKg: request.weightKg,
        preferredColours: [...request.preferredColours],
        photo: temporaryPhoto,
        candidates: candidates.slice(0, 15),
      });
      aiDurationMs = Math.round(performance.now() - aiStartedAt);
      return hydrateRecommendations(candidates, aiResult, 3);
    } catch (error) {
      aiDurationMs = Math.round(performance.now() - aiStartedAt);
      aiFailure = error instanceof Error ? error.message : 'Unknown AI error';
      return deterministicFallback(candidates, 3);
    }
  },
  { maximumWidth: 512, maximumHeight: 1024 },
);
const report = {
  model: provider.model,
  promptVersion: provider.promptVersion,
  request,
  eligibleCandidateCount: candidates.length,
  candidateIds: candidates.map((candidate) => candidate.product.id),
  aiDurationMs,
  totalDurationMs: Math.round(performance.now() - totalStartedAt),
  aiFailure,
  shopperProfile: aiResult?.shopperProfile,
  response,
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
