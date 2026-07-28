import {
  canonicalProductSchema,
  type AIRecommendationResult,
  type ProductIntelligence,
} from '@suitly/core';
import { describe, expect, it } from 'vitest';

import { buildScoredCandidates } from './candidates.js';
import { hydrateRecommendations } from './hydrate.js';
import type {
  EnrichedCatalogueProduct,
  RecommendationRequest,
} from './types.js';

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

function enrichedProduct(
  id: string,
  overrides: {
    merchantId?: string;
    colour?: string;
    available?: boolean;
    category?: ProductIntelligence['category'];
  } = {},
): EnrichedCatalogueProduct {
  return {
    product: canonicalProductSchema.parse({
      id,
      merchantId: overrides.merchantId ?? 'merchant_test',
      source: 'shopify_csv',
      handle: id,
      title: `Product ${id}`,
      tags: [],
      published: true,
      status: 'active',
      images: [{ url: `https://example.com/${id}.jpg` }],
      variants: [
        {
          id: `var_${id}`,
          options: [{ name: 'Size', value: 'M' }],
          size: 'M',
          colour: overrides.colour ?? 'Black',
          price: { amountMinor: 5000, currency: 'USD' },
          inventory: { quantity: 1 },
          available: overrides.available ?? true,
        },
      ],
    }),
    intelligence: {
      ...intelligence,
      category: overrides.category ?? intelligence.category,
    },
  };
}

const request: RecommendationRequest = {
  merchantId: 'merchant_test',
  heightCm: 178,
  weightKg: 75,
  preferredColours: ['Black'],
  category: 'jacket',
};

describe('buildScoredCandidates', () => {
  it('filters ownership, category, colour, and availability', () => {
    const candidates = buildScoredCandidates(
      [
        enrichedProduct('eligible'),
        enrichedProduct('wrong_merchant', { merchantId: 'other' }),
        enrichedProduct('wrong_category', { category: 'shirt' }),
        enrichedProduct('wrong_colour', { colour: 'Blue' }),
        enrichedProduct('unavailable', { available: false }),
      ],
      request,
    );

    expect(candidates.map((candidate) => candidate.product.id)).toEqual([
      'eligible',
    ]);
  });

  it('sorts candidates deterministically and records components', () => {
    const candidates = buildScoredCandidates(
      [enrichedProduct('b'), enrichedProduct('a')],
      request,
    );

    expect(candidates.map((candidate) => candidate.product.id)).toEqual([
      'a',
      'b',
    ]);
    expect(candidates[0]?.scoreComponents).toMatchObject({
      colour: 1,
      silhouetteCompatibility: 0.5,
      productConfidence: 0.9,
    });
  });

  it('uses the shopper profile to exclude poor silhouettes and boost matches', () => {
    const boxy = enrichedProduct('boxy');
    boxy.intelligence = {
      ...boxy.intelligence,
      silhouette: 'boxy',
    };
    const relaxed = enrichedProduct('relaxed');
    relaxed.intelligence = {
      ...relaxed.intelligence,
      fit: 'relaxed',
    };

    const candidates = buildScoredCandidates([boxy, relaxed], {
      ...request,
      shopperProfile: {
        imageValid: true,
        imageIssues: [],
        visibleBuild: 'average',
        shoulderProfile: 'balanced',
        shoulderToHipProfile: 'balanced',
        torsoProportion: 'balanced',
        legProportion: 'balanced',
        recommendedSilhouettes: ['relaxed'],
        lessSuitableSilhouettes: ['boxy'],
        styleConfidence: 0.8,
        geometryConfidence: 0.7,
      },
    });

    expect(candidates.map((candidate) => candidate.product.id)).toEqual([
      'relaxed',
    ]);
    expect(candidates[0]?.scoreComponents.silhouetteCompatibility).toBe(1);
  });
});

describe('hydrateRecommendations', () => {
  it('rejects invented IDs and fills from deterministic ranking', () => {
    const candidates = buildScoredCandidates(
      [enrichedProduct('one'), enrichedProduct('two')],
      request,
    );
    const aiResult: AIRecommendationResult = {
      shopperProfile: {
        imageValid: true,
        imageIssues: [],
        visibleBuild: 'average',
        shoulderProfile: 'balanced',
        shoulderToHipProfile: 'balanced',
        torsoProportion: 'balanced',
        legProportion: 'balanced',
        recommendedSilhouettes: ['regular'],
        lessSuitableSilhouettes: [],
        styleConfidence: 0.8,
        geometryConfidence: 0.7,
      },
      recommendations: [
        {
          productId: 'invented',
          variantId: 'invented',
          styleScore: 99,
          styleConfidence: 0.9,
          sizeConfidence: 0.9,
          reasons: ['Invented.'],
        },
      ],
    };

    const result = hydrateRecommendations(candidates, aiResult, 2);

    expect(result.usedFallback).toBe(true);
    expect(result.recommendations).toHaveLength(2);
    expect(
      result.recommendations.every((item) => item.sizeConfidence === 0),
    ).toBe(true);
  });

  it('hydrates commerce facts locally and caps size confidence', () => {
    const candidates = buildScoredCandidates([enrichedProduct('one')], request);
    const aiResult: AIRecommendationResult = {
      shopperProfile: {
        imageValid: true,
        imageIssues: [],
        visibleBuild: 'average',
        shoulderProfile: 'balanced',
        shoulderToHipProfile: 'balanced',
        torsoProportion: 'balanced',
        legProportion: 'balanced',
        recommendedSilhouettes: ['regular'],
        lessSuitableSilhouettes: [],
        styleConfidence: 0.8,
        geometryConfidence: 0.7,
      },
      recommendations: [
        {
          productId: 'one',
          variantId: 'var_one',
          styleScore: 90,
          styleConfidence: 0.8,
          sizeConfidence: 0.9,
          reasons: ['Supplied candidate.'],
        },
      ],
    };

    const result = hydrateRecommendations(candidates, aiResult, 1);

    expect(result.usedFallback).toBe(false);
    expect(result.recommendations[0]).toMatchObject({
      title: 'Product one',
      productUrl: '/products/one',
      price: 5000,
      currency: 'USD',
      sizeConfidence: 0.2,
    });
  });

  it('sorts valid AI recommendations by style score', () => {
    const candidates = buildScoredCandidates(
      [enrichedProduct('one'), enrichedProduct('two')],
      request,
    );
    const result = hydrateRecommendations(
      candidates,
      {
        shopperProfile: {
          imageValid: true,
          imageIssues: [],
          visibleBuild: 'average',
          shoulderProfile: 'balanced',
          shoulderToHipProfile: 'balanced',
          torsoProportion: 'balanced',
          legProportion: 'balanced',
          recommendedSilhouettes: ['regular'],
          lessSuitableSilhouettes: [],
          styleConfidence: 0.8,
          geometryConfidence: 0.7,
        },
        recommendations: [
          {
            productId: 'one',
            variantId: 'var_one',
            styleScore: 50,
            styleConfidence: 0.6,
            sizeConfidence: 0,
            reasons: ['Lower score.'],
          },
          {
            productId: 'two',
            variantId: 'var_two',
            styleScore: 90,
            styleConfidence: 0.8,
            sizeConfidence: 0,
            reasons: ['Higher score.'],
          },
        ],
      },
      2,
    );

    expect(result.recommendations.map((item) => item.productId)).toEqual([
      'two',
      'one',
    ]);
  });

  it('falls back when AI output is invalid', () => {
    const candidates = buildScoredCandidates([enrichedProduct('one')], request);
    const result = hydrateRecommendations(candidates, { invalid: true }, 1);

    expect(result.usedFallback).toBe(true);
    expect(result.recommendations[0]?.source).toBe('deterministic-fallback');
  });

  it('rejects profile contradictions and gendered explanations', () => {
    const candidates = buildScoredCandidates(
      [enrichedProduct('one'), enrichedProduct('two')],
      request,
    );
    candidates[0] = {
      ...candidates[0]!,
      intelligence: {
        ...candidates[0]!.intelligence,
        silhouette: 'boxy',
      },
    };
    const result = hydrateRecommendations(
      candidates,
      {
        shopperProfile: {
          imageValid: true,
          imageIssues: [],
          visibleBuild: 'average',
          shoulderProfile: 'balanced',
          shoulderToHipProfile: 'balanced',
          torsoProportion: 'balanced',
          legProportion: 'balanced',
          recommendedSilhouettes: ['straight'],
          lessSuitableSilhouettes: ['boxy'],
          styleConfidence: 0.8,
          geometryConfidence: 0.7,
        },
        recommendations: [
          {
            productId: candidates[0].product.id,
            variantId: candidates[0].variant.id,
            styleScore: 90,
            styleConfidence: 0.8,
            sizeConfidence: 0,
            reasons: ['Complements his proportions.'],
          },
        ],
      },
      1,
    );

    expect(result.usedFallback).toBe(true);
    expect(result.recommendations[0]?.productId).toBe(
      candidates[1]!.product.id,
    );
  });
});
