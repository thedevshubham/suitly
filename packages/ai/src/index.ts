export { createProductContentHash } from './content-hash.js';
export {
  createProductIntelligenceProvider,
  type ProductIntelligenceProviderName,
} from './create-product-intelligence-provider.js';
export { enrichProducts } from './enrich-products.js';
export {
  GeminiProductIntelligenceProvider,
  type GeminiProductIntelligenceProviderOptions,
} from './gemini-product-intelligence-provider.js';
export {
  OllamaProductIntelligenceProvider,
  type OllamaProductIntelligenceProviderOptions,
} from './ollama-product-intelligence-provider.js';
export { normalizeProductIntelligence } from './normalize-product-intelligence.js';
export { OpenAIProductIntelligenceProvider } from './openai-product-intelligence-provider.js';

export type {
  EnrichedProduct,
  EnrichProductsOptions,
  ProductEnrichmentFailure,
  ProductEnrichmentReport,
  ProductEnrichmentResult,
  ProductIntelligenceInput,
  ProductIntelligenceProvider,
} from './types.js';
