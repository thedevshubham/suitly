import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { loadEnvFile } from 'node:process';

import {
  canonicalProductSchema,
  productIntelligenceSchema,
} from '@suitly/core';
import { z } from 'zod';

import { createProductIntelligenceProvider } from './create-product-intelligence-provider.js';
import { enrichProducts } from './enrich-products.js';
import type { EnrichedProduct } from './types.js';

const argumentsMap = parseArguments(process.argv.slice(2));
const inputPath = requiredArgument(argumentsMap, 'input');
const productsPath = requiredArgument(argumentsMap, 'products');
const reportPath = requiredArgument(argumentsMap, 'report');
const limit = parseLimit(requiredArgument(argumentsMap, 'limit'));

if (existsSync('.env.local')) {
  loadEnvFile('.env.local');
}

const inputProducts = canonicalProductSchema
  .array()
  .parse(await readJson(inputPath))
  .slice(0, limit);
const existing = await readExisting(productsPath);
const provider = createProductIntelligenceProvider(process.env);
const result = await enrichProducts(inputProducts, provider, { existing });

await Promise.all([
  writeJson(productsPath, result.products),
  writeJson(reportPath, result.report),
]);

process.stdout.write(
  [
    `Analysed ${result.report.analysedProducts}`,
    `cached ${result.report.cachedProducts}`,
    `failed ${result.report.failedProducts}`,
    `low confidence ${result.report.lowConfidenceProducts}`,
  ].join(', ') + '\n',
);

function parseArguments(args: string[]): Map<string, string> {
  const parsed = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (key?.startsWith('--') !== true || value === undefined) {
      throw new Error(`Invalid CLI arguments near: ${key ?? '<end>'}`);
    }
    parsed.set(key.slice(2), value);
  }
  return parsed;
}

function requiredArgument(args: Map<string, string>, key: string): string {
  const value = args.get(key);
  if (value === undefined || value.length === 0) {
    throw new Error(`Missing required argument: --${key}`);
  }
  return value;
}

function parseLimit(value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error('--limit must be a positive integer.');
  }
  return parsed;
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(resolve(path), 'utf8')) as unknown;
}

async function readExisting(path: string): Promise<EnrichedProduct[]> {
  if (!existsSync(resolve(path))) {
    return [];
  }

  const storedEntrySchema = z.object({
    product: canonicalProductSchema,
    intelligence: productIntelligenceSchema,
    contentHash: z.string(),
    model: z.string(),
    promptVersion: z.string(),
    analysedAt: z.string().datetime(),
  });
  const stored = storedEntrySchema.array().parse(await readJson(path));

  return stored satisfies EnrichedProduct[];
}

async function writeJson(path: string, value: unknown): Promise<void> {
  const resolvedPath = resolve(path);
  await mkdir(dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
