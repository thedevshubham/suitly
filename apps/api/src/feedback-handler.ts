import { feedbackRequestSchema } from '@suitly/core';
import { ZodError } from 'zod';

import type { EvaluationRepository } from './evaluation-types.js';

export function createFeedbackHttpHandler(
  evaluation: EvaluationRepository,
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method !== 'POST') {
      return json(
        { error: { code: 'method_not_allowed', message: 'Use POST.' } },
        405,
        { Allow: 'POST' },
      );
    }

    try {
      const input = feedbackRequestSchema.parse(await request.json());
      const isKnownProduct = await evaluation.recommendationContainsProduct(
        input.recommendationId,
        input.productId,
      );
      if (!isKnownProduct) {
        return json(
          {
            error: {
              code: 'unknown_recommendation_product',
              message:
                'That product does not belong to the supplied recommendation.',
            },
          },
          404,
        );
      }

      await evaluation.recordFeedback({
        type: 'shopper-feedback',
        ...input,
        createdAt: new Date().toISOString(),
      });
      return json({ accepted: true }, 201);
    } catch (error) {
      if (error instanceof ZodError) {
        return json(
          {
            error: {
              code: 'invalid_feedback',
              message: 'Feedback input is invalid.',
            },
          },
          400,
        );
      }
      return json(
        {
          error: {
            code: 'feedback_failed',
            message: 'Feedback could not be recorded.',
          },
        },
        500,
      );
    }
  };
}

function json(
  value: unknown,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return Response.json(value, {
    status,
    headers: { ...headers, 'cache-control': 'no-store' },
  });
}
