import type { ShopperFeedback } from '@suitly/core';

import type { EvaluationEvent } from './evaluation-types.js';

export type EvaluationSummary = {
  recommendationCount: number;
  validPhotoCount: number;
  fallbackCount: number;
  latencyMs: {
    p50: number | null;
    p95: number | null;
    maximum: number | null;
  };
  feedbackCount: number;
  feedback: Record<ShopperFeedback, number>;
  productFeedback: Array<{
    productId: string;
    liked: number;
    disliked: number;
    wouldBuy: number;
  }>;
};

export function summarizeEvaluationEvents(
  events: EvaluationEvent[],
): EvaluationSummary {
  const recommendations = events.filter(
    (event) => event.type === 'recommendation-created',
  );
  const feedbackEvents = events.filter(
    (event) => event.type === 'shopper-feedback',
  );
  const latencies = recommendations
    .map((event) => event.totalMs)
    .sort((left, right) => left - right);
  const feedback: Record<ShopperFeedback, number> = {
    liked: 0,
    disliked: 0,
    'would-buy': 0,
  };
  const byProduct = new Map<
    string,
    { liked: number; disliked: number; wouldBuy: number }
  >();

  for (const event of feedbackEvents) {
    feedback[event.feedback] += 1;
    const product = byProduct.get(event.productId) ?? {
      liked: 0,
      disliked: 0,
      wouldBuy: 0,
    };
    if (event.feedback === 'would-buy') {
      product.wouldBuy += 1;
    } else {
      product[event.feedback] += 1;
    }
    byProduct.set(event.productId, product);
  }

  return {
    recommendationCount: recommendations.length,
    validPhotoCount: recommendations.filter(
      (event) => event.photoStatus === 'valid',
    ).length,
    fallbackCount: recommendations.filter((event) => event.usedFallback).length,
    latencyMs: {
      p50: percentile(latencies, 0.5),
      p95: percentile(latencies, 0.95),
      maximum: latencies.at(-1) ?? null,
    },
    feedbackCount: feedbackEvents.length,
    feedback,
    productFeedback: [...byProduct.entries()]
      .map(([productId, counts]) => ({ productId, ...counts }))
      .sort(
        (left, right) =>
          right.wouldBuy - left.wouldBuy ||
          right.liked - left.liked ||
          left.productId.localeCompare(right.productId),
      ),
  };
}

function percentile(values: number[], percentileValue: number): number | null {
  if (values.length === 0) {
    return null;
  }
  const index = Math.ceil(values.length * percentileValue) - 1;
  return values[Math.max(0, index)] ?? null;
}
