import {
  createEvaluationSummaryHttpHandler,
  JsonCatalogueRepository,
  JsonlEvaluationRepository,
} from '@suitly/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const cataloguePath =
  process.env.SUITLY_CATALOGUE_PATH ??
  '../../data/generated/products.enriched.ollama-qwen.json';
const evaluationPath =
  process.env.SUITLY_EVALUATION_PATH ??
  '../../data/generated/recommendation-evaluation.jsonl';
const summary = createEvaluationSummaryHttpHandler(
  new JsonlEvaluationRepository(evaluationPath),
  new JsonCatalogueRepository(cataloguePath),
  'sample-merchant',
);

export async function GET(request: Request): Promise<Response> {
  return summary(request);
}
