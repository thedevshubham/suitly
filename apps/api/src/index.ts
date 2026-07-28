export { createRecommendHttpHandler } from './http-handler.js';
export { JsonCatalogueRepository } from './json-catalogue-repository.js';
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
