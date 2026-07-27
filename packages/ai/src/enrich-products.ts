import { productIntelligenceSchema, type CanonicalProduct } from '@suitly/core';

import { createProductContentHash } from './content-hash.js';
import type {
  EnrichedProduct,
  EnrichProductsOptions,
  ProductEnrichmentResult,
  ProductIntelligenceProvider,
} from './types.js';

export async function enrichProducts(
  products: CanonicalProduct[],
  provider: ProductIntelligenceProvider,
  options: EnrichProductsOptions = {},
): Promise<ProductEnrichmentResult> {
  const threshold = options.lowConfidenceThreshold ?? 0.6;
  const existingByProductId = new Map(
    (options.existing ?? []).map((entry) => [entry.product.id, entry]),
  );
  const enriched: EnrichedProduct[] = [];
  const failures: ProductEnrichmentResult['report']['failures'] = [];
  let analysedProducts = 0;
  let cachedProducts = 0;

  for (const product of products) {
    const contentHash = createProductContentHash(product);
    const cached = existingByProductId.get(product.id);

    if (
      cached?.contentHash === contentHash &&
      cached.model === provider.model &&
      cached.promptVersion === provider.promptVersion
    ) {
      enriched.push({ ...cached, product });
      cachedProducts += 1;
    } else {
      try {
        const intelligence = productIntelligenceSchema.parse(
          await provider.enrichProduct({ product }),
        );
        enriched.push({
          product,
          intelligence,
          contentHash,
          model: provider.model,
          promptVersion: provider.promptVersion,
          analysedAt: (options.now ?? (() => new Date()))().toISOString(),
        });
        analysedProducts += 1;
      } catch (error) {
        failures.push({
          productId: product.id,
          handle: product.handle,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    if (options.onProductProcessed !== undefined) {
      await options.onProductProcessed(
        buildResult(
          products.length,
          enriched,
          failures,
          analysedProducts,
          cachedProducts,
          threshold,
          provider,
        ),
      );
    }
  }

  return buildResult(
    products.length,
    enriched,
    failures,
    analysedProducts,
    cachedProducts,
    threshold,
    provider,
  );
}

function buildResult(
  totalProducts: number,
  products: EnrichedProduct[],
  failures: ProductEnrichmentResult['report']['failures'],
  analysedProducts: number,
  cachedProducts: number,
  threshold: number,
  provider: ProductIntelligenceProvider,
): ProductEnrichmentResult {
  return {
    products: [...products],
    report: {
      totalProducts,
      analysedProducts,
      cachedProducts,
      failedProducts: failures.length,
      lowConfidenceProducts: products.filter(
        (entry) => entry.intelligence.confidence < threshold,
      ).length,
      model: provider.model,
      promptVersion: provider.promptVersion,
      failures: [...failures],
    },
  };
}
