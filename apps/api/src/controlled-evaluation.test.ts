import {
  canonicalProductSchema,
  productIntelligenceSchema,
} from '@suitly/core';
import { describe, expect, it } from 'vitest';

import {
  controlledEvaluationCasesSchema,
  runControlledEvaluation,
} from './controlled-evaluation.js';

describe('runControlledEvaluation', () => {
  it('reports catalogue, stated-input, and photo-profile baselines', () => {
    const product = canonicalProductSchema.parse({
      id: 'product-1',
      merchantId: 'merchant-1',
      source: 'custom_api',
      handle: 'product-1',
      title: 'Product 1',
      tags: ['men'],
      published: true,
      status: 'active',
      images: [{ url: 'https://example.com/product.jpg' }],
      variants: [
        {
          id: 'variant-1',
          options: [{ name: 'Size', value: 'M' }],
          size: 'M',
          price: { amountMinor: 1000, currency: 'USD' },
          inventory: { quantity: 1 },
          available: true,
        },
      ],
    });
    const intelligence = productIntelligenceSchema.parse({
      category: 't-shirt',
      fit: 'regular',
      shoulderConstruction: 'standard',
      silhouette: 'straight',
      length: 'standard',
      neckline: 'crew',
      sleeveFit: 'regular',
      fabricWeight: 'medium',
      stretch: 'low',
      styleContexts: ['casual'],
      visualEffects: [],
      confidence: 0.9,
      evidence: ['title'],
    });
    const cases = controlledEvaluationCasesSchema.parse([
      {
        id: 'case-1',
        audience: 'men',
        category: 't-shirt',
        heightCm: 180,
        weightKg: 75,
        profilePreset: 'straight',
        minimumResults: 1,
      },
    ]);

    const report = runControlledEvaluation(
      [{ product, intelligence }],
      cases,
      'merchant-1',
    );

    expect(report.cases[0]).toMatchObject({
      catalogueOnlyProductIds: ['product-1'],
      baselineProductIds: ['product-1'],
      profileProductIds: ['product-1'],
      statedInputChangedRanking: false,
      photographChangedRanking: false,
    });
  });
});
