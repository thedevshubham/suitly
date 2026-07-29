import { describe, expect, it } from 'vitest';
import {
  createStorefrontToken,
  FixedWindowRateLimiter,
  secureStorefrontHandler,
  verifyStorefrontToken,
} from './storefront-security.js';

const secret = 'a-secure-development-secret-with-32-bytes';

describe('storefront security', () => {
  it('signs, verifies, and expires merchant-scoped tokens', () => {
    const token = createStorefrontToken(
      { merchantId: 'merchant-1', exp: 20 },
      secret,
    );
    expect(verifyStorefrontToken(token, secret, 10).merchantId).toBe(
      'merchant-1',
    );
    expect(() => verifyStorefrontToken(token, secret, 20)).toThrow('expired');
  });

  it('enforces origin, bearer token, and rate limits', async () => {
    const token = createStorefrontToken(
      {
        merchantId: 'merchant-1',
        exp: Math.floor(Date.now() / 1000) + 60,
      },
      secret,
    );
    const secured = secureStorefrontHandler(
      () => Promise.resolve(Response.json({ ok: true })),
      {
        secret,
        allowedOrigins: ['https://shop.example'],
        rateLimiter: new FixedWindowRateLimiter(1, 60_000),
      },
    );
    const request = () =>
      new Request('https://api.example/recommend', {
        method: 'POST',
        headers: {
          origin: 'https://shop.example',
          authorization: `Bearer ${token}`,
        },
      });
    expect((await secured(request())).status).toBe(200);
    expect((await secured(request())).status).toBe(429);
  });
});
