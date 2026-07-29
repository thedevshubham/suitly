import { z } from 'zod';

export const shopperFeedbackSchema = z.enum(['liked', 'disliked', 'would-buy']);

export const feedbackRequestSchema = z.object({
  recommendationId: z.string().trim().min(1),
  productId: z.string().trim().min(1),
  feedback: shopperFeedbackSchema,
});

export type ShopperFeedback = z.infer<typeof shopperFeedbackSchema>;
export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;
