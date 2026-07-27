import type { CanonicalProduct, ProductIntelligence } from '@suitly/core';

export type ProductIntelligenceInput = {
  product: CanonicalProduct;
};

export interface ProductIntelligenceProvider {
  readonly model: string;
  readonly promptVersion: string;
  enrichProduct(input: ProductIntelligenceInput): Promise<ProductIntelligence>;
}

export type EnrichedProduct = {
  product: CanonicalProduct;
  intelligence: ProductIntelligence;
  contentHash: string;
  model: string;
  promptVersion: string;
  analysedAt: string;
};

export type ProductEnrichmentFailure = {
  productId: string;
  handle: string;
  message: string;
};

export type ProductEnrichmentReport = {
  totalProducts: number;
  analysedProducts: number;
  cachedProducts: number;
  failedProducts: number;
  lowConfidenceProducts: number;
  model: string;
  promptVersion: string;
  failures: ProductEnrichmentFailure[];
};

export type ProductEnrichmentResult = {
  products: EnrichedProduct[];
  report: ProductEnrichmentReport;
};

export type EnrichProductsOptions = {
  existing?: EnrichedProduct[];
  lowConfidenceThreshold?: number;
  now?: () => Date;
  onProductProcessed?: (
    result: ProductEnrichmentResult,
  ) => Promise<void> | void;
};
