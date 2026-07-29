import type { FeedbackRequest } from '@suitly/core';
import type { RecommendationAudience } from '@suitly/recommendation';

export type RecommendationEvaluationEvent = {
  type: 'recommendation-created';
  recommendationId: string;
  merchantId: string;
  audience: RecommendationAudience;
  category: string;
  productIds: string[];
  photoStatus: 'valid' | 'invalid' | 'analysis-unavailable';
  usedFallback: boolean;
  totalMs: number;
  createdAt: string;
};

export type FeedbackEvaluationEvent = FeedbackRequest & {
  type: 'shopper-feedback';
  createdAt: string;
};

export type EvaluationEvent =
  | RecommendationEvaluationEvent
  | FeedbackEvaluationEvent;

export interface EvaluationRepository {
  recordRecommendation(event: RecommendationEvaluationEvent): Promise<void>;
  recommendationContainsProduct(
    recommendationId: string,
    productId: string,
  ): Promise<boolean>;
  recordFeedback(event: FeedbackEvaluationEvent): Promise<void>;
  listEvents(): Promise<EvaluationEvent[]>;
}
