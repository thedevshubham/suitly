import { OllamaShopperVisionProvider } from '@suitly/ai';

import { createRecommendHttpHandler } from './http-handler.js';
import { JsonCatalogueRepository } from './json-catalogue-repository.js';
import { JsonlEvaluationRepository } from './jsonl-evaluation-repository.js';

export type LocalRecommendHandlerOptions = {
  cataloguePath?: string;
  model?: string;
  ollamaBaseUrl?: string;
  evaluationPath?: string;
};

export function createLocalRecommendHandler(
  options: LocalRecommendHandlerOptions = {},
): (request: Request) => Promise<Response> {
  const model =
    options.model ?? process.env.PRODUCT_INTELLIGENCE_MODEL ?? 'qwen3.5:4b';
  return createRecommendHttpHandler({
    catalogue: new JsonCatalogueRepository(
      options.cataloguePath ??
        'data/generated/products.enriched.ollama-qwen.json',
    ),
    shopperVision: new OllamaShopperVisionProvider(model, {
      baseUrl: options.ollamaBaseUrl ?? process.env.OLLAMA_BASE_URL,
    }),
    evaluation: new JsonlEvaluationRepository(
      options.evaluationPath ??
        'data/generated/recommendation-evaluation.jsonl',
    ),
  });
}
