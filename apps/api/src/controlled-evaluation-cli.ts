import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import {
  canonicalProductSchema,
  productIntelligenceSchema,
} from '@suitly/core';
import { z } from 'zod';

import {
  controlledEvaluationCasesSchema,
  runControlledEvaluation,
} from './controlled-evaluation.js';

const casesPath =
  process.argv[2] ?? 'tests/fixtures/recommendation-evaluation-cases.json';
const cataloguePath =
  process.argv[3] ?? 'data/generated/products.enriched.ollama-qwen.json';
const outputPath =
  process.argv[4] ?? 'data/generated/controlled-evaluation-report.json';
const catalogueSchema = z.array(
  z.object({
    product: canonicalProductSchema,
    intelligence: productIntelligenceSchema,
  }),
);
const cases = controlledEvaluationCasesSchema.parse(
  JSON.parse(await readFile(resolve(casesPath), 'utf8')) as unknown,
);
const catalogue = catalogueSchema.parse(
  JSON.parse(await readFile(resolve(cataloguePath), 'utf8')) as unknown,
);
const merchantId = catalogue[0]?.product.merchantId;
if (merchantId === undefined) {
  throw new Error('The evaluation catalogue is empty.');
}

const report = runControlledEvaluation(catalogue, cases, merchantId);
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(
  resolve(outputPath),
  `${JSON.stringify(report, null, 2)}\n`,
  'utf8',
);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (report.failedCount > 0) {
  process.exitCode = 1;
}
