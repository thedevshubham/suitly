import type { TemporaryShopperPhoto } from '@suitly/shopper-photo';
import { describe, expect, it, vi } from 'vitest';

import { OllamaShopperVisionProvider } from './ollama-shopper-vision-provider.js';

const photo: TemporaryShopperPhoto = {
  path: '/private/temporary/photo.jpg',
  mimeType: 'image/jpeg',
  width: 768,
  height: 1536,
  byteLength: 100,
};

const profile = {
  imageValid: true,
  imageIssues: [],
  visibleBuild: 'average',
  shoulderProfile: 'balanced',
  shoulderToHipProfile: 'balanced',
  torsoProportion: 'balanced',
  legProportion: 'balanced',
  recommendedSilhouettes: ['regular', 'relaxed'],
  lessSuitableSilhouettes: ['very-slim'],
  styleConfidence: 0.8,
  geometryConfidence: 0.7,
};

describe('OllamaShopperVisionProvider', () => {
  it('sends a private photo as base64 with structured output', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ message: { content: JSON.stringify(profile) } }),
      );
    const provider = new OllamaShopperVisionProvider('qwen3.5:4b', {
      fetchImplementation,
      readPhoto: () => Promise.resolve(Buffer.from([1, 2, 3])),
    });

    await expect(
      provider.analyseShopper({
        heightCm: 178,
        weightKg: 75,
        preferredColours: ['navy'],
        photo,
      }),
    ).resolves.toEqual(profile);

    const request = fetchImplementation.mock.calls[0]?.[1];
    if (typeof request?.body !== 'string') {
      throw new Error('Expected a JSON request body.');
    }
    const body = JSON.parse(request.body) as unknown;
    expect(body).toMatchObject({
      model: 'qwen3.5:4b',
      stream: false,
      think: false,
      format: { type: 'object' },
      messages: [{ role: 'system' }, { role: 'user', images: ['AQID'] }],
    });
  });

  it('rejects invalid shopper inputs before inference', async () => {
    const fetchImplementation = vi.fn<typeof fetch>();
    const provider = new OllamaShopperVisionProvider('qwen3.5:4b', {
      fetchImplementation,
      readPhoto: () => Promise.resolve(Buffer.from([1])),
    });

    await expect(
      provider.analyseShopper({
        heightCm: 50,
        weightKg: 75,
        preferredColours: ['navy'],
        photo,
      }),
    ).rejects.toThrow();
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it('rejects schema-invalid model output', async () => {
    const provider = new OllamaShopperVisionProvider('qwen3.5:4b', {
      fetchImplementation: vi.fn<typeof fetch>().mockResolvedValueOnce(
        Response.json({
          message: {
            content: JSON.stringify({ ...profile, geometryConfidence: 2 }),
          },
        }),
      ),
      readPhoto: () => Promise.resolve(Buffer.from([1])),
    });

    await expect(
      provider.analyseShopper({
        heightCm: 178,
        weightKg: 75,
        preferredColours: ['navy'],
        photo,
      }),
    ).rejects.toThrow();
  });
});
