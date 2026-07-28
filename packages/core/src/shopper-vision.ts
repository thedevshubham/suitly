import { z } from 'zod';

export const shopperVisionInputSchema = z.object({
  heightCm: z.number().min(120).max(230),
  weightKg: z.number().min(35).max(250),
  preferredColours: z.array(z.string().trim().min(1)).min(1).max(8),
});

export const shopperVisualProfileSchema = z.object({
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
});

export type ShopperVisionInput = z.infer<typeof shopperVisionInputSchema>;
export type ShopperVisualProfile = z.infer<typeof shopperVisualProfileSchema>;
