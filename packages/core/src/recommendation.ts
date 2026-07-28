import { z } from 'zod';

export const aiRankedRecommendationSchema = z.object({
  productId: z.string().trim().min(1),
  variantId: z.string().trim().min(1),
  styleScore: z.number().int().min(0).max(100),
  styleConfidence: z.number().min(0).max(1),
  sizeConfidence: z.number().min(0).max(1),
  reasons: z.array(z.string().trim().min(1)).min(1).max(3),
  fitRisk: z.string().trim().min(1).optional(),
});

export const aiRecommendationResultSchema = z.object({
  shopperProfile: z.object({
    imageValid: z.boolean(),
    imageIssues: z.array(z.string().trim().min(1)).max(8),
    visibleBuild: z.enum([
      'lean',
      'average',
      'athletic',
      'broad',
      'heavy',
      'unclear',
    ]),
    shoulderProfile: z.enum([
      'narrow',
      'balanced',
      'moderately-broad',
      'broad',
      'unclear',
    ]),
    shoulderToHipProfile: z.enum(['low', 'balanced', 'high', 'unclear']),
    torsoProportion: z.enum(['short', 'balanced', 'long', 'unclear']),
    legProportion: z.enum(['short', 'balanced', 'long', 'unclear']),
    recommendedSilhouettes: z.array(z.string().trim().min(1)).max(8),
    lessSuitableSilhouettes: z.array(z.string().trim().min(1)).max(8),
    styleConfidence: z.number().min(0).max(1),
    geometryConfidence: z.number().min(0).max(1),
  }),
  recommendations: z.array(aiRankedRecommendationSchema).max(3),
});

export type AIRankedRecommendation = z.infer<
  typeof aiRankedRecommendationSchema
>;
export type AIRecommendationResult = z.infer<
  typeof aiRecommendationResultSchema
>;
