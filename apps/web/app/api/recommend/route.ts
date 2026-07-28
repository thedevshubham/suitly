import { createLocalRecommendHandler } from '@suitly/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const recommend = createLocalRecommendHandler({
  cataloguePath:
    process.env.SUITLY_CATALOGUE_PATH ??
    '../../data/generated/products.enriched.ollama-qwen.json',
});

export async function POST(request: Request): Promise<Response> {
  return recommend(request);
}
