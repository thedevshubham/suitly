import { randomUUID } from 'node:crypto';

import type { ShopperVisionProvider } from '@suitly/ai';
import {
  productIntelligenceSchema,
  shopperVisionInputSchema,
} from '@suitly/core';
import {
  buildScoredCandidates,
  deterministicFallback,
  deterministicRecommendations,
} from '@suitly/recommendation';
import { withTemporaryShopperPhoto } from '@suitly/shopper-photo';
import { z } from 'zod';

import type {
  CatalogueRepository,
  RecommendShopperFields,
  RecommendShopperInput,
  RecommendShopperResponse,
} from './types.js';
import type { EvaluationRepository } from './evaluation-types.js';

const recommendShopperFieldsSchema = shopperVisionInputSchema.extend({
  merchantId: z.string().trim().min(1),
  audience: z.enum(['men', 'women']),
  category: productIntelligenceSchema.shape.category,
  maximumPriceMinor: z.number().int().nonnegative().optional(),
  allowAlternativeColours: z.boolean().optional(),
});

export type RecommendShopperDependencies = {
  catalogue: CatalogueRepository;
  shopperVision: ShopperVisionProvider;
  evaluation?: EvaluationRepository;
  createRecommendationId?: () => string;
  temporaryRoot?: string;
};

export async function recommendShopper(
  input: RecommendShopperInput,
  dependencies: RecommendShopperDependencies,
): Promise<RecommendShopperResponse> {
  const fields = recommendShopperFieldsSchema.parse(
    input.fields,
  ) satisfies RecommendShopperFields;
  const startedAt = performance.now();
  const catalogue = await dependencies.catalogue.loadEnrichedProducts(
    fields.merchantId,
  );

  const response = await withTemporaryShopperPhoto<RecommendShopperResponse>(
    input.photo,
    async (photo) => {
      const analysisStartedAt = performance.now();
      let profile;

      try {
        profile = await dependencies.shopperVision.analyseShopper({
          heightCm: fields.heightCm,
          weightKg: fields.weightKg,
          preferredColours: fields.preferredColours,
          photo,
        });
      } catch {
        const candidates = buildScoredCandidates(catalogue, fields);
        const fallback = deterministicFallback(candidates, 3, [
          'Local shopper analysis was unavailable; preference-based deterministic recommendations were used.',
        ]);
        return {
          recommendationId:
            dependencies.createRecommendationId?.() ?? `rec_${randomUUID()}`,
          photoStatus: 'analysis-unavailable',
          recommendations: fallback.recommendations,
          warnings: fallback.warnings,
          usedFallback: true,
          timing: {
            analysisMs: Math.round(performance.now() - analysisStartedAt),
            totalMs: Math.round(performance.now() - startedAt),
          },
        };
      }

      const analysisMs = Math.round(performance.now() - analysisStartedAt);
      if (!profile.imageValid) {
        return {
          recommendationId:
            dependencies.createRecommendationId?.() ?? `rec_${randomUUID()}`,
          photoStatus: 'invalid',
          shopperProfileSummary: summarizeProfile(profile),
          recommendations: [],
          warnings: profile.imageIssues,
          usedFallback: false,
          timing: {
            analysisMs,
            totalMs: Math.round(performance.now() - startedAt),
          },
        };
      }

      const candidates = buildScoredCandidates(catalogue, {
        ...fields,
        shopperProfile: profile,
      });
      const recommendations = deterministicRecommendations(candidates, 3, [
        'Recommendations use local shopper analysis and deterministic catalogue ranking.',
      ]);

      return {
        recommendationId:
          dependencies.createRecommendationId?.() ?? `rec_${randomUUID()}`,
        photoStatus: 'valid',
        shopperProfileSummary: summarizeProfile(profile),
        recommendations: recommendations.recommendations,
        warnings:
          recommendations.recommendations.length === 0
            ? ['No eligible products matched the supplied preferences.']
            : recommendations.warnings,
        usedFallback: false,
        timing: {
          analysisMs,
          totalMs: Math.round(performance.now() - startedAt),
        },
      };
    },
    {
      maximumWidth: 512,
      maximumHeight: 1024,
      ...(dependencies.temporaryRoot === undefined
        ? {}
        : { temporaryRoot: dependencies.temporaryRoot }),
    },
  );

  if (dependencies.evaluation !== undefined) {
    try {
      await dependencies.evaluation.recordRecommendation({
        type: 'recommendation-created',
        recommendationId: response.recommendationId,
        merchantId: fields.merchantId,
        audience: fields.audience,
        category: fields.category,
        productIds: response.recommendations.map((item) => item.productId),
        photoStatus: response.photoStatus,
        usedFallback: response.usedFallback,
        totalMs: response.timing.totalMs,
        createdAt: new Date().toISOString(),
      });
    } catch {
      response.warnings.push(
        'Recommendation feedback capture is temporarily unavailable.',
      );
    }
  }

  return response;
}

function summarizeProfile(
  profile: Awaited<ReturnType<ShopperVisionProvider['analyseShopper']>>,
): NonNullable<RecommendShopperResponse['shopperProfileSummary']> {
  return {
    visibleBuild: profile.visibleBuild,
    recommendedSilhouettes: profile.recommendedSilhouettes,
    lessSuitableSilhouettes: profile.lessSuitableSilhouettes,
    styleConfidence: profile.styleConfidence,
    geometryConfidence: profile.geometryConfidence,
  };
}

export { recommendShopperFieldsSchema };
