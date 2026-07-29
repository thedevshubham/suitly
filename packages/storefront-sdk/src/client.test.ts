import { describe, expect, it, vi } from 'vitest';

import { SuitlyClient } from './client.js';

describe('SuitlyClient', () => {
  it('sends a platform-neutral multipart recommendation request', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        recommendationId: 'rec-1',
        photoStatus: 'valid',
        recommendations: [],
        warnings: [],
      }),
    );
    const client = new SuitlyClient({
      apiBaseUrl: 'https://api.example.com',
      merchantId: 'merchant-1',
      sessionToken: 'token-1',
      fetch: request,
    });

    await client.recommend({
      audience: 'women',
      heightCm: 168,
      weightKg: 62,
      category: 'top',
      photo: new Blob(['image'], { type: 'image/jpeg' }),
    });

    const [url, init] = request.mock.calls[0] ?? [];
    expect(url).toBeInstanceOf(URL);
    expect((url as URL).href).toBe('https://api.example.com/api/recommend');
    expect(new Headers(init?.headers).get('authorization')).toBe(
      'Bearer token-1',
    );
    expect((init?.body as FormData).get('merchantId')).toBe('merchant-1');
    expect((init?.body as FormData).get('audience')).toBe('women');
  });
});
