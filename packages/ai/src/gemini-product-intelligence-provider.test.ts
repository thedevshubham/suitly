import { canonicalProductSchema } from '@suitly/core';
import { describe, expect, it, vi } from 'vitest';

import { GeminiProductIntelligenceProvider } from './gemini-product-intelligence-provider.js';

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
      options: [{ name: 'Size', value: 'M' }],
      size: 'M',
      price: { amountMinor: 2500, currency: 'USD' },
      inventory: { quantity: 1 },
      available: true,
    },
  ],
});

const intelligence = {
  category: 't-shirt',
  fit: 'regular',
  shoulderConstruction: 'standard',
  silhouette: 'straight',
  length: 'standard',
  neckline: 'crew',
  sleeveFit: 'regular',
  fabricWeight: 'medium',
  stretch: 'unknown',
  styleContexts: ['casual'],
  visualEffects: ['Creates a straight torso line.'],
  confidence: 0.85,
  evidence: ['description', 'product image'],
};

describe('GeminiProductIntelligenceProvider', () => {
  it('sends catalogue facts and image bytes with a structured schema', async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify(intelligence),
    });
    const fetchImage = vi.fn().mockResolvedValue({
      data: 'aW1hZ2U=',
      mimeType: 'image/jpeg',
    });
    const provider = new GeminiProductIntelligenceProvider(
      'gemini-test',
      'test-key',
      {
        client: {
          models: { generateContent },
        } as never,
        fetchImage,
      },
    );

    await expect(provider.enrichProduct({ product })).resolves.toEqual(
      intelligence,
    );
    expect(fetchImage).toHaveBeenCalledWith('https://example.com/test-tee.jpg');
    expect(generateContent).toHaveBeenCalledOnce();
    expect(generateContent.mock.calls[0]?.[0] as unknown).toMatchObject({
      model: 'gemini-test',
      config: {
        httpOptions: {
          timeout: 60_000,
          retryOptions: { attempts: 2 },
        },
        responseMimeType: 'application/json',
        responseJsonSchema: { type: 'object' },
      },
    });
  });

  it('rejects malformed model output', async () => {
    const provider = new GeminiProductIntelligenceProvider(
      'gemini-test',
      'test-key',
      {
        client: {
          models: {
            generateContent: vi.fn().mockResolvedValue({
              text: JSON.stringify({ ...intelligence, confidence: 2 }),
            }),
          },
        } as never,
        fetchImage: vi.fn().mockResolvedValue({
          data: 'aW1hZ2U=',
          mimeType: 'image/jpeg',
        }),
      },
    );

    await expect(provider.enrichProduct({ product })).rejects.toThrow();
  });

  it('supports products without images', async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify(intelligence),
    });
    const fetchImage = vi.fn();
    const provider = new GeminiProductIntelligenceProvider(
      'gemini-test',
      'test-key',
      {
        client: {
          models: { generateContent },
        } as never,
        fetchImage,
      },
    );

    await provider.enrichProduct({
      product: { ...product, images: [] },
    });

    expect(fetchImage).not.toHaveBeenCalled();
  });
});
