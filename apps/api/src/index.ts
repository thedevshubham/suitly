export { createRecommendHttpHandler } from './http-handler.js';
export { createFeedbackHttpHandler } from './feedback-handler.js';
export { JsonCatalogueRepository } from './json-catalogue-repository.js';
export { JsonlEvaluationRepository } from './jsonl-evaluation-repository.js';
export {
  summarizeEvaluationEvents,
  type EvaluationSummary,
} from './evaluation-summary.js';
export {
  createLocalRecommendHandler,
  type LocalRecommendHandlerOptions,
} from './local-handler.js';
export {
  recommendShopper,
  recommendShopperFieldsSchema,
  type RecommendShopperDependencies,
} from './recommend-shopper.js';
export type {
  CatalogueRepository,
  RecommendShopperFields,
  RecommendShopperInput,
  RecommendShopperResponse,
  ShopperProfileSummary,
} from './types.js';
export type {
  EvaluationEvent,
  EvaluationRepository,
  FeedbackEvaluationEvent,
  RecommendationEvaluationEvent,
} from './evaluation-types.js';
