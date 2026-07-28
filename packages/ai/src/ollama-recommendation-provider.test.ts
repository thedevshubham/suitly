import type { ScoredCandidate } from '@suitly/recommendation';
import type { TemporaryShopperPhoto } from '@suitly/shopper-photo';
import { describe, expect, it, vi } from 'vitest';

import { OllamaRecommendationProvider } from './ollama-recommendation-provider.js';

const photo: TemporaryShopperPhoto = {
  path: '/private/photo.jpg',
  mimeType: 'image/jpeg',
  width: 512,
  height: 1024,
  byteLength: 100,
};
const candidate = {
  product: {
    id: 'prd_1',
    merchantId: 'merchant_test',
    source: 'shopify_csv',
    handle: 'test-jacket',
    title: 'Test Jacket',
    tags: [],
    published: true,
    status: 'active',
    images: [{ url: 'https://example.com/jacket.jpg' }],
    variants: [],
  },
  variant: {
    id: 'var_1',
    options: [{ name: 'Size', value: 'M' }],
    size: 'M',
    colour: 'Black',
    price: { amountMinor: 5000, currency: 'USD' },
    inventory: { quantity: 1 },
    available: true,
  },
  intelligence: {
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
  },
  deterministicScore: 85,
  scoreComponents: {
    colour: 1,
    heightLength: 1,
    productConfidence: 0.9,
    sizeEvidence: 0.5,
    merchandising: 0.5,
  },
} satisfies ScoredCandidate;

const result = {
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
      productId: 'prd_1',
      variantId: 'var_1',
      styleScore: 88,
      styleConfidence: 0.8,
      sizeConfidence: 0.2,
      reasons: ['Matches the visible proportions.'],
      fitRisk: 'Size chart unavailable.',
    },
  ],
};

describe('OllamaRecommendationProvider', () => {
  it('sends compact supplied candidates with one shopper image', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ message: { content: JSON.stringify(result) } }),
      );
    const provider = new OllamaRecommendationProvider('qwen3.5:4b', {
      fetchImplementation,
      readPhoto: () => Promise.resolve(Buffer.from([1, 2, 3])),
    });

    await expect(
      provider.analyseAndRank({
        heightCm: 178,
        weightKg: 75,
        preferredColours: ['Black'],
        photo,
        candidates: [candidate],
      }),
    ).resolves.toEqual(result);

    const request = fetchImplementation.mock.calls[0]?.[1];
    if (typeof request?.body !== 'string') {
      throw new Error('Expected a JSON request body.');
    }
    expect(JSON.parse(request.body) as unknown).toMatchObject({
      model: 'qwen3.5:4b',
      messages: [{ role: 'system' }, { role: 'user', images: ['AQID'] }],
      format: { type: 'object' },
    });
  });
});
