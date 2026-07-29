import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const claimsSchema = z.object({
  merchantId: z.string().trim().min(1),
  exp: z.number().int().positive(),
});
export type StorefrontClaims = z.infer<typeof claimsSchema>;

export function createStorefrontToken(
  claims: StorefrontClaims,
  secret: string,
): string {
  assertSecret(secret);
  const payload = Buffer.from(
    JSON.stringify(claimsSchema.parse(claims)),
  ).toString('base64url');
  return `${payload}.${signature(payload, secret)}`;
}

export function verifyStorefrontToken(
  token: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): StorefrontClaims {
  assertSecret(secret);
  const [payload, supplied, extra] = token.split('.');
  if (!payload || !supplied || extra !== undefined)
    throw new Error('Invalid storefront token.');
  const expected = signature(payload, secret);
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right))
    throw new Error('Invalid storefront token.');
  const claims = claimsSchema.parse(
    JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as unknown,
  );
  if (claims.exp <= nowSeconds) throw new Error('Storefront token expired.');
  return claims;
}

export class FixedWindowRateLimiter {
  readonly #entries = new Map<string, { count: number; resetAt: number }>();
  constructor(
    readonly limit: number,
    readonly windowMs: number,
  ) {}

  consume(
    key: string,
    now = Date.now(),
  ): { allowed: boolean; retryAfter: number } {
    const current = this.#entries.get(key);
    if (!current || current.resetAt <= now) {
      this.#entries.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, retryAfter: 0 };
    }
    current.count += 1;
    return {
      allowed: current.count <= this.limit,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
}

export function secureStorefrontHandler(
  handler: (request: Request) => Promise<Response>,
  options: {
    secret: string;
    allowedOrigins: string[];
    rateLimiter: FixedWindowRateLimiter;
  },
): (request: Request) => Promise<Response> {
  return async (request) => {
    const origin = request.headers.get('origin');
    if (origin && !options.allowedOrigins.includes(origin)) {
      return Response.json(
        { error: { code: 'origin_denied' } },
        { status: 403 },
      );
    }
    const bearer = request.headers
      .get('authorization')
      ?.match(/^Bearer (.+)$/)?.[1];
    if (!bearer)
      return Response.json(
        { error: { code: 'unauthorized' } },
        { status: 401 },
      );
    try {
      const claims = verifyStorefrontToken(bearer, options.secret);
      const rate = options.rateLimiter.consume(claims.merchantId);
      if (!rate.allowed) {
        return Response.json(
          { error: { code: 'rate_limited' } },
          {
            status: 429,
            headers: { 'retry-after': String(rate.retryAfter) },
          },
        );
      }
      const response = await handler(request);
      const headers = new Headers(response.headers);
      if (origin) headers.set('access-control-allow-origin', origin);
      headers.set('vary', 'Origin');
      return new Response(response.body, { status: response.status, headers });
    } catch {
      return Response.json(
        { error: { code: 'unauthorized' } },
        { status: 401 },
      );
    }
  };
}

function signature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}
function assertSecret(secret: string): void {
  if (Buffer.byteLength(secret) < 32)
    throw new Error('Storefront token secret must contain at least 32 bytes.');
}
