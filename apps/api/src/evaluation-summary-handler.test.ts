import { canonicalProductSchema, type ProductIntelligence } from '@suitly/core';
import { describe, expect, it, vi } from 'vitest';

import { createEvaluationSummaryHttpHandler } from './evaluation-summary-handler.js';
import type { EvaluationRepository } from './evaluation-types.js';
import type { CatalogueRepository } from './types.js';

const intelligence: ProductIntelligence = {
  category: 'jacket',
  fit: 'regular',
  shoulderConstruction: 'standard',
  silhouette: 'straight',
  length: 'standard',
  neckline: 'collared',
  sleeveFit: 'regular',
  fabricWeight: 'medium',
  stretch: 'unknown',
  styleContexts: ['casual'],
  visualEffects: ['Creates a straight line.'],
  confidence: 0.9,
  evidence: ['image'],
};

describe('evaluation summary handler', () => {
  it('hydrates product feedback with trusted catalogue titles', async () => {
    const handler = createEvaluationSummaryHttpHandler(
      evaluationRepository(),
      catalogueRepository(),
      'merchant_test',
    );

    const response = await handler(
      new Request('http://localhost/api/evaluation'),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toMatchObject({
      recommendationCount: 1,
      feedbackCount: 1,
      feedback: { liked: 1 },
      productFeedback: [
        {
          productId: 'product_one',
          title: 'Trusted product title',
          liked: 1,
        },
      ],
    });
  });

  it('allows only GET requests', async () => {
    const response = await createEvaluationSummaryHttpHandler(
      evaluationRepository(),
      catalogueRepository(),
      'merchant_test',
    )(
      new Request('http://localhost/api/evaluation', {
        method: 'POST',
      }),
    );

    expect(response.status).toBe(405);
  });
});

function evaluationRepository(): EvaluationRepository {
  return {
    recordRecommendation: vi.fn().mockResolvedValue(undefined),
    recommendationContainsProduct: vi.fn().mockResolvedValue(true),
    recordFeedback: vi.fn().mockResolvedValue(undefined),
    listEvents: vi.fn().mockResolvedValue([
      {
        type: 'recommendation-created',
        recommendationId: 'rec_one',
        merchantId: 'merchant_test',
        audience: 'men',
        category: 'jacket',
        productIds: ['product_one'],
        photoStatus: 'valid',
        usedFallback: false,
        totalMs: 7000,
        createdAt: '2026-07-29T00:00:00.000Z',
      },
      {
        type: 'shopper-feedback',
        recommendationId: 'rec_one',
        productId: 'product_one',
        feedback: 'liked',
        createdAt: '2026-07-29T00:01:00.000Z',
      },
    ]),
  };
}

function catalogueRepository(): CatalogueRepository {
  return {
    loadEnrichedProducts: vi.fn().mockResolvedValue([
      {
        product: canonicalProductSchema.parse({
          id: 'product_one',
          merchantId: 'merchant_test',
          source: 'shopify_csv',
          handle: 'product-one',
          title: 'Trusted product title',
          tags: ['men'],
          published: true,
          status: 'active',
          images: [{ url: 'https://example.com/product.jpg' }],
          variants: [
            {
              id: 'variant_one',
              options: [{ name: 'Size', value: 'M' }],
              size: 'M',
              price: { amountMinor: 5000, currency: 'USD' },
              inventory: { quantity: 1 },
              available: true,
            },
          ],
        }),
        intelligence,
      },
    ]),
  };
}
