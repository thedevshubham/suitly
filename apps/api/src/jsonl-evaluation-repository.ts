import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { feedbackRequestSchema } from '@suitly/core';
import { z } from 'zod';

import type {
  EvaluationEvent,
  EvaluationRepository,
  FeedbackEvaluationEvent,
  RecommendationEvaluationEvent,
} from './evaluation-types.js';

const recommendationEventSchema = z.object({
  type: z.literal('recommendation-created'),
  recommendationId: z.string().min(1),
  merchantId: z.string().min(1),
  audience: z.enum(['men', 'women']),
  category: z.string().min(1),
  productIds: z.array(z.string().min(1)),
  photoStatus: z.enum(['valid', 'invalid', 'analysis-unavailable']),
  usedFallback: z.boolean(),
  totalMs: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});

const feedbackEventSchema = feedbackRequestSchema.extend({
  type: z.literal('shopper-feedback'),
  createdAt: z.string().datetime(),
});

const evaluationEventSchema = z.discriminatedUnion('type', [
  recommendationEventSchema,
  feedbackEventSchema,
]);

export class JsonlEvaluationRepository implements EvaluationRepository {
  private readonly resolvedPath: string;

  public constructor(path: string) {
    this.resolvedPath = resolve(path);
  }

  public recordRecommendation(
    event: RecommendationEvaluationEvent,
  ): Promise<void> {
    return this.append(evaluationEventSchema.parse(event));
  }

  public async recommendationContainsProduct(
    recommendationId: string,
    productId: string,
  ): Promise<boolean> {
    const events = await this.listEvents();
    return events.some(
      (event) =>
        event.type === 'recommendation-created' &&
        event.recommendationId === recommendationId &&
        event.productIds.includes(productId),
    );
  }

  public recordFeedback(event: FeedbackEvaluationEvent): Promise<void> {
    return this.append(evaluationEventSchema.parse(event));
  }

  private async append(event: EvaluationEvent): Promise<void> {
    await mkdir(dirname(this.resolvedPath), { recursive: true });
    await appendFile(this.resolvedPath, `${JSON.stringify(event)}\n`, 'utf8');
  }

  public async listEvents(): Promise<EvaluationEvent[]> {
    let contents: string;
    try {
      contents = await readFile(this.resolvedPath, 'utf8');
    } catch (error) {
      if (isMissingFileError(error)) {
        return [];
      }
      throw error;
    }

    return contents
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line) => evaluationEventSchema.parse(JSON.parse(line) as unknown));
  }
}

function isMissingFileError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as Error & { code?: string }).code === 'ENOENT'
  );
}
