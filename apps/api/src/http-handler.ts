import { ZodError } from 'zod';

import {
  recommendShopper,
  type RecommendShopperDependencies,
} from './recommend-shopper.js';

export function createRecommendHttpHandler(
  dependencies: RecommendShopperDependencies,
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method !== 'POST') {
      return jsonResponse(
        { error: { code: 'method_not_allowed', message: 'Use POST.' } },
        405,
        { Allow: 'POST' },
      );
    }

    try {
      const form = await request.formData();
      const photo = form.get('photo');
      if (!(photo instanceof Blob)) {
        return jsonResponse(
          {
            error: {
              code: 'invalid_request',
              message: 'A shopper photo is required.',
            },
          },
          400,
        );
      }

      const result = await recommendShopper(
        {
          fields: parseFields(form),
          photo: Buffer.from(await photo.arrayBuffer()),
        },
        dependencies,
      );
      return jsonResponse(result, result.photoStatus === 'invalid' ? 422 : 200);
    } catch (error) {
      if (error instanceof ZodError) {
        return jsonResponse(
          {
            error: {
              code: 'invalid_request',
              message: 'Recommendation input is invalid.',
              issues: error.issues.map((issue) => ({
                path: issue.path.join('.'),
                message: issue.message,
              })),
            },
          },
          400,
        );
      }
      if (error instanceof Error && isSafePhotoError(error.message)) {
        return jsonResponse(
          {
            error: {
              code: 'invalid_photo',
              message: error.message,
            },
          },
          400,
        );
      }
      return jsonResponse(
        {
          error: {
            code: 'recommendation_failed',
            message: 'The recommendation could not be completed.',
          },
        },
        500,
      );
    }
  };
}

function parseFields(form: FormData): unknown {
  return {
    merchantId: form.get('merchantId'),
    heightCm: toNumber(form.get('heightCm')),
    weightKg: toNumber(form.get('weightKg')),
    preferredColours: form
      .getAll('preferredColours')
      .filter((value): value is string => typeof value === 'string'),
    category: form.get('category'),
    maximumPriceMinor: toOptionalNumber(form.get('maximumPriceMinor')),
    allowAlternativeColours:
      form.get('allowAlternativeColours') === null
        ? undefined
        : form.get('allowAlternativeColours') === 'true',
  };
}

function toNumber(value: string | Blob | null): number {
  return typeof value === 'string' ? Number(value) : Number.NaN;
}

function toOptionalNumber(value: string | Blob | null): number | undefined {
  return value === null || value === '' ? undefined : toNumber(value);
}

function isSafePhotoError(message: string): boolean {
  return (
    message.startsWith('Shopper photo') ||
    message.includes('photo dimensions') ||
    message.includes('Input buffer')
  );
}

function jsonResponse(
  value: unknown,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return Response.json(value, {
    status,
    headers: { ...headers, 'cache-control': 'no-store' },
  });
}
