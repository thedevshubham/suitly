import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

import type { ShopperVisionAnalysisInput } from '@suitly/ai';
import {
  canonicalProductSchema,
  type ProductIntelligence,
  type ShopperVisualProfile,
} from '@suitly/core';
import type { EnrichedCatalogueProduct } from '@suitly/recommendation';
import type { TemporaryShopperPhoto } from '@suitly/shopper-photo';
import { describe, expect, it, vi } from 'vitest';

import { createRecommendHttpHandler } from './http-handler.js';
import { recommendShopper } from './recommend-shopper.js';
import type { CatalogueRepository } from './types.js';

const validProfile: ShopperVisualProfile = {
  imageValid: true,
  imageIssues: [],
  visibleBuild: 'athletic',
  shoulderProfile: 'balanced',
  shoulderToHipProfile: 'balanced',
  torsoProportion: 'balanced',
  legProportion: 'balanced',
  recommendedSilhouettes: ['straight'],
  lessSuitableSilhouettes: ['boxy'],
  styleConfidence: 0.8,
  geometryConfidence: 0.7,
};

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
  silhouette: ProductIntelligence['silhouette'] = 'straight',
): EnrichedCatalogueProduct {
  return {
    product: canonicalProductSchema.parse({
      id,
      merchantId: 'merchant_test',
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
          colour: 'Black',
          price: { amountMinor: 5000, currency: 'USD' },
          inventory: { quantity: 1 },
          available: true,
        },
      ],
    }),
    intelligence: { ...intelligence, silhouette },
  };
}

function catalogue(
  products = [enrichedProduct('straight'), enrichedProduct('boxy', 'boxy')],
): CatalogueRepository {
  return {
    loadEnrichedProducts: vi.fn().mockResolvedValue(products),
  };
}

function shopperVision(
  implementation: (
    photo: TemporaryShopperPhoto,
  ) => Promise<ShopperVisualProfile> = () => Promise.resolve(validProfile),
) {
  return {
    model: 'test-model',
    promptVersion: 'test-prompt',
    analyseShopper: vi.fn((input: ShopperVisionAnalysisInput) =>
      implementation(input.photo),
    ),
  };
}

async function fixturePhoto(): Promise<Buffer> {
  return readFile('tests/fixtures/shopper-full-body-synthetic.png');
}

const fields = {
  merchantId: 'merchant_test',
  heightCm: 178,
  weightKg: 75,
  preferredColours: ['Black'],
  category: 'jacket',
};

describe('recommendShopper', () => {
  it('analyses the private photo and returns profile-aware catalogue results', async () => {
    let temporaryPath = '';
    const result = await recommendShopper(
      { fields, photo: await fixturePhoto() },
      {
        catalogue: catalogue(),
        shopperVision: shopperVision((photo) => {
          temporaryPath = photo.path;
          expect(existsSync(photo.path)).toBe(true);
          return Promise.resolve(validProfile);
        }),
        createRecommendationId: () => 'rec_test',
      },
    );

    expect(result).toMatchObject({
      recommendationId: 'rec_test',
      photoStatus: 'valid',
      usedFallback: false,
      shopperProfileSummary: { visibleBuild: 'athletic' },
    });
    expect(result.recommendations.map((item) => item.productId)).toEqual([
      'straight',
    ]);
    expect(result.recommendations[0]?.source).toBe('deterministic');
    expect(existsSync(temporaryPath)).toBe(false);
  });

  it('returns actionable issues without products for an unusable photo', async () => {
    const result = await recommendShopper(
      { fields, photo: await fixturePhoto() },
      {
        catalogue: catalogue(),
        shopperVision: shopperVision(() =>
          Promise.resolve({
            ...validProfile,
            imageValid: false,
            imageIssues: ['Feet are not visible.'],
          }),
        ),
      },
    );

    expect(result.photoStatus).toBe('invalid');
    expect(result.recommendations).toEqual([]);
    expect(result.warnings).toEqual(['Feet are not visible.']);
  });

  it('falls back to preference-only ranking when local analysis fails', async () => {
    const result = await recommendShopper(
      { fields, photo: await fixturePhoto() },
      {
        catalogue: catalogue([enrichedProduct('fallback')]),
        shopperVision: shopperVision(() =>
          Promise.reject(new Error('Ollama is offline')),
        ),
      },
    );

    expect(result.photoStatus).toBe('analysis-unavailable');
    expect(result.recommendations[0]?.productId).toBe('fallback');
    expect(result.warnings[0]).toContain('analysis was unavailable');
  });
});

describe('createRecommendHttpHandler', () => {
  it('accepts multipart input and returns a no-store JSON response', async () => {
    const form = new FormData();
    form.set('merchantId', 'merchant_test');
    form.set('heightCm', '178');
    form.set('weightKg', '75');
    form.append('preferredColours', 'Black');
    form.set('category', 'jacket');
    form.set('photo', new Blob([await fixturePhoto()], { type: 'image/png' }));
    const handler = createRecommendHttpHandler({
      catalogue: catalogue([enrichedProduct('one')]),
      shopperVision: shopperVision(),
      createRecommendationId: () => 'rec_http',
    });

    const response = await handler(
      new Request('http://localhost/api/recommend', {
        method: 'POST',
        body: form,
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toMatchObject({
      recommendationId: 'rec_http',
      photoStatus: 'valid',
    });
  });

  it('rejects incomplete input without calling the provider', async () => {
    const provider = shopperVision();
    const handler = createRecommendHttpHandler({
      catalogue: catalogue(),
      shopperVision: provider,
    });
    const form = new FormData();
    form.set('photo', new Blob([await fixturePhoto()], { type: 'image/png' }));

    const response = await handler(
      new Request('http://localhost/api/recommend', {
        method: 'POST',
        body: form,
      }),
    );

    expect(response.status).toBe(400);
    expect(provider.analyseShopper).not.toHaveBeenCalled();
  });
});
