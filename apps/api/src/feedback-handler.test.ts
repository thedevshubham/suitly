import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { createFeedbackHttpHandler } from './feedback-handler.js';
import { summarizeEvaluationEvents } from './evaluation-summary.js';
import type { EvaluationEvent } from './evaluation-types.js';
import { JsonlEvaluationRepository } from './jsonl-evaluation-repository.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('feedback evaluation', () => {
  it('records feedback only for a product in the recommendation', async () => {
    const { path, repository } = await evaluationRepository();
    await repository.recordRecommendation({
      type: 'recommendation-created',
      recommendationId: 'rec_test',
      merchantId: 'merchant_test',
      audience: 'men',
      category: 'jacket',
      productIds: ['product_one'],
      photoStatus: 'valid',
      usedFallback: false,
      totalMs: 7000,
      createdAt: '2026-07-29T00:00:00.000Z',
    });

    const response = await createFeedbackHttpHandler(repository)(
      feedbackRequest('product_one', 'liked'),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ accepted: true });
    const events = (await readFile(path, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as unknown);
    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({
      type: 'shopper-feedback',
      recommendationId: 'rec_test',
      productId: 'product_one',
      feedback: 'liked',
    });
  });

  it('summarizes latency and shopper signals', () => {
    const events: EvaluationEvent[] = [
      recommendationEvent('rec_one', 1000),
      recommendationEvent('rec_two', 3000),
      {
        type: 'shopper-feedback',
        recommendationId: 'rec_one',
        productId: 'product_one',
        feedback: 'liked',
        createdAt: '2026-07-29T00:01:00.000Z',
      },
      {
        type: 'shopper-feedback',
        recommendationId: 'rec_two',
        productId: 'product_one',
        feedback: 'would-buy',
        createdAt: '2026-07-29T00:02:00.000Z',
      },
    ];

    expect(summarizeEvaluationEvents(events)).toMatchObject({
      recommendationCount: 2,
      validPhotoCount: 2,
      latencyMs: { p50: 1000, p95: 3000, maximum: 3000 },
      feedbackCount: 2,
      feedback: { liked: 1, disliked: 0, 'would-buy': 1 },
      productFeedback: [
        {
          productId: 'product_one',
          liked: 1,
          disliked: 0,
          wouldBuy: 1,
        },
      ],
    });
  });

  it('rejects feedback for an unrelated product', async () => {
    const { repository } = await evaluationRepository();
    await repository.recordRecommendation({
      type: 'recommendation-created',
      recommendationId: 'rec_test',
      merchantId: 'merchant_test',
      audience: 'women',
      category: 'top',
      productIds: ['product_one'],
      photoStatus: 'valid',
      usedFallback: false,
      totalMs: 7000,
      createdAt: '2026-07-29T00:00:00.000Z',
    });

    const response = await createFeedbackHttpHandler(repository)(
      feedbackRequest('invented_product', 'would-buy'),
    );

    expect(response.status).toBe(404);
  });

  it('rejects invalid feedback values', async () => {
    const { repository } = await evaluationRepository();
    const response = await createFeedbackHttpHandler(repository)(
      feedbackRequest('product_one', 'maybe'),
    );

    expect(response.status).toBe(400);
  });
});

async function evaluationRepository(): Promise<{
  path: string;
  repository: JsonlEvaluationRepository;
}> {
  const directory = await mkdtemp(join(tmpdir(), 'suitly-evaluation-test-'));
  temporaryDirectories.push(directory);
  const path = join(directory, 'events.jsonl');
  return { path, repository: new JsonlEvaluationRepository(path) };
}

function feedbackRequest(productId: string, feedback: string): Request {
  return new Request('http://localhost/api/feedback', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      recommendationId: 'rec_test',
      productId,
      feedback,
    }),
  });
}

function recommendationEvent(
  recommendationId: string,
  totalMs: number,
): EvaluationEvent {
  return {
    type: 'recommendation-created',
    recommendationId,
    merchantId: 'merchant_test',
    audience: 'men',
    category: 'jacket',
    productIds: ['product_one'],
    photoStatus: 'valid',
    usedFallback: false,
    totalMs,
    createdAt: '2026-07-29T00:00:00.000Z',
  };
}
