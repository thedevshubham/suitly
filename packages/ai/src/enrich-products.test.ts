import { canonicalProductSchema, type ProductIntelligence } from '@suitly/core';
import { describe, expect, it } from 'vitest';

import { enrichProducts } from './enrich-products.js';
import type {
  ProductIntelligenceInput,
  ProductIntelligenceProvider,
} from './types.js';

const product = canonicalProductSchema.parse({
  id: 'prd_test',
  merchantId: 'merchant_test',
  source: 'shopify_csv',
  handle: 'test-tee',
  title: 'Test Tee',
  descriptionText: 'A regular cotton crew-neck T-shirt.',
  tags: ['men'],
  published: true,
  status: 'active',
  images: [{ url: 'https://example.com/test-tee.jpg' }],
  variants: [
    {
      id: 'var_test',
      options: [
        { name: 'Size', value: 'M' },
        { name: 'Color', value: 'Black' },
      ],
      size: 'M',
      colour: 'Black',
      price: { amountMinor: 2500, currency: 'USD' },
      inventory: { quantity: 1 },
      available: true,
    },
  ],
});

const intelligence: ProductIntelligence = {
  category: 't-shirt',
  fit: 'regular',
  shoulderConstruction: 'standard',
  silhouette: 'straight',
  length: 'standard',
  neckline: 'crew',
  sleeveFit: 'regular',
  fabricWeight: 'unknown',
  stretch: 'unknown',
  styleContexts: ['casual'],
  visualEffects: ['Creates a straight torso line.'],
  confidence: 0.85,
  evidence: ['title', 'description'],
};

class MockProvider implements ProductIntelligenceProvider {
  public readonly model = 'mock-model';
  public readonly promptVersion = 'mock-v1';
  public calls = 0;

  public constructor(
    private readonly implementation: (
      input: ProductIntelligenceInput,
    ) => Promise<ProductIntelligence> = () => Promise.resolve(intelligence),
  ) {}

  public async enrichProduct(
    input: ProductIntelligenceInput,
  ): Promise<ProductIntelligence> {
    this.calls += 1;
    return this.implementation(input);
  }
}

describe('enrichProducts', () => {
  it('enriches and records product metadata', async () => {
    const provider = new MockProvider();
    const result = await enrichProducts([product], provider, {
      now: () => new Date('2026-07-27T00:00:00.000Z'),
    });

    expect(provider.calls).toBe(1);
    expect(result.products).toHaveLength(1);
    expect(result.products[0]).toMatchObject({
      product,
      intelligence,
      model: 'mock-model',
      promptVersion: 'mock-v1',
      analysedAt: '2026-07-27T00:00:00.000Z',
    });
    expect(result.report).toMatchObject({
      totalProducts: 1,
      analysedProducts: 1,
      cachedProducts: 0,
      failedProducts: 0,
      lowConfidenceProducts: 0,
    });
  });

  it('reuses an unchanged cached result', async () => {
    const provider = new MockProvider();
    const initial = await enrichProducts([product], provider);
    const secondProvider = new MockProvider();
    const second = await enrichProducts([product], secondProvider, {
      existing: initial.products,
    });

    expect(secondProvider.calls).toBe(0);
    expect(second.report.cachedProducts).toBe(1);
    expect(second.report.analysedProducts).toBe(0);
  });

  it('reanalyses a changed product', async () => {
    const provider = new MockProvider();
    const initial = await enrichProducts([product], provider);
    const changed = { ...product, title: 'Changed Test Tee' };
    const secondProvider = new MockProvider();
    const second = await enrichProducts([changed], secondProvider, {
      existing: initial.products,
    });

    expect(secondProvider.calls).toBe(1);
    expect(second.report.analysedProducts).toBe(1);
    expect(second.report.cachedProducts).toBe(0);
  });

  it('isolates provider failures and continues', async () => {
    const failingProduct = {
      ...product,
      id: 'prd_failure',
      handle: 'failure',
    };
    const provider = new MockProvider(({ product: inputProduct }) => {
      if (inputProduct.id === 'prd_failure') {
        return Promise.reject(new Error('Provider unavailable'));
      }
      return Promise.resolve(intelligence);
    });
    const result = await enrichProducts([failingProduct, product], provider);

    expect(result.products).toHaveLength(1);
    expect(result.report.failedProducts).toBe(1);
    expect(result.report.failures).toEqual([
      {
        productId: 'prd_failure',
        handle: 'failure',
        message: 'Provider unavailable',
      },
    ]);
  });

  it('rejects provider output that violates the schema', async () => {
    const provider = new MockProvider(() =>
      Promise.resolve({
        ...intelligence,
        confidence: 2,
      } as unknown as ProductIntelligence),
    );
    const result = await enrichProducts([product], provider);

    expect(result.products).toEqual([]);
    expect(result.report.failedProducts).toBe(1);
  });

  it('reports low-confidence products', async () => {
    const provider = new MockProvider(() =>
      Promise.resolve({
        ...intelligence,
        confidence: 0.4,
      }),
    );
    const result = await enrichProducts([product], provider, {
      lowConfidenceThreshold: 0.6,
    });

    expect(result.report.lowConfidenceProducts).toBe(1);
  });

  it('checkpoints after every processed product', async () => {
    const checkpoints: number[] = [];
    const provider = new MockProvider();
    await enrichProducts(
      [product, { ...product, id: 'prd_second' }],
      provider,
      {
        onProductProcessed: (result) => {
          checkpoints.push(result.products.length);
        },
      },
    );

    expect(checkpoints).toEqual([1, 2]);
  });
});
