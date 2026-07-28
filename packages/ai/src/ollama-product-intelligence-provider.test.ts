import { canonicalProductSchema } from '@suitly/core';
import { describe, expect, it, vi } from 'vitest';

import { OllamaProductIntelligenceProvider } from './ollama-product-intelligence-provider.js';

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

describe('OllamaProductIntelligenceProvider', () => {
  it('sends images and a JSON schema to a local vision model', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), {
          headers: { 'content-type': 'image/jpeg' },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          message: { content: JSON.stringify(intelligence) },
          total_duration: 1_000_000,
        }),
      );
    const provider = new OllamaProductIntelligenceProvider('qwen3.5:4b', {
      fetchImplementation,
    });

    await expect(provider.enrichProduct({ product })).resolves.toEqual(
      intelligence,
    );
    const apiCall = fetchImplementation.mock.calls[1];
    expect(apiCall?.[0]).toBe('http://127.0.0.1:11434/api/chat');
    const request = apiCall?.[1];
    if (typeof request?.body !== 'string') {
      throw new Error('Expected a JSON request body.');
    }
    const body = JSON.parse(request.body) as unknown;
    expect(body).toMatchObject({
      model: 'qwen3.5:4b',
      stream: false,
      think: false,
      format: { type: 'object' },
      options: { temperature: 0 },
      messages: [{ role: 'system' }, { role: 'user', images: ['AQID'] }],
    });
  });

  it('supports text-only models without downloading an image', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValueOnce(
      Response.json({
        message: {
          content: JSON.stringify({
            ...intelligence,
            evidence: ['description'],
          }),
        },
      }),
    );
    const provider = new OllamaProductIntelligenceProvider('llama3.2:latest', {
      includeImages: false,
      fetchImplementation,
    });

    await provider.enrichProduct({ product });

    expect(fetchImplementation).toHaveBeenCalledOnce();
    const request = fetchImplementation.mock.calls[0]?.[1];
    if (typeof request?.body !== 'string') {
      throw new Error('Expected a JSON request body.');
    }
    const body = JSON.parse(request.body) as {
      messages: Array<{ images?: string[] }>;
    };
    expect(body.messages[1]?.images).toBeUndefined();
  });

  it('rejects schema-invalid local model output', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValueOnce(
      Response.json({
        message: {
          content: JSON.stringify({ ...intelligence, confidence: 2 }),
        },
      }),
    );
    const provider = new OllamaProductIntelligenceProvider('llama3.2:latest', {
      includeImages: false,
      fetchImplementation,
    });

    await expect(provider.enrichProduct({ product })).rejects.toThrow();
  });
});
