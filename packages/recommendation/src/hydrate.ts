import {
  aiRecommendationResultSchema,
  type AIRecommendationResult,
} from '@suitly/core';

import type {
  HydratedRecommendation,
  RecommendationResponse,
  ScoredCandidate,
} from './types.js';

export function hydrateRecommendations(
  candidates: ScoredCandidate[],
  aiResult: unknown,
  limit = 3,
): RecommendationResponse {
  const parsed = aiRecommendationResultSchema.safeParse(aiResult);
  if (!parsed.success || !parsed.data.shopperProfile.imageValid) {
    return deterministicFallback(candidates, limit, [
      parsed.success
        ? 'Shopper image was not valid for AI ranking.'
        : 'AI ranking output was invalid.',
    ]);
  }

  const candidateByProductId = new Map(
    candidates.map((candidate) => [candidate.product.id, candidate]),
  );
  const hydrated: HydratedRecommendation[] = [];
  const seen = new Set<string>();
  let rejectedAIRecommendations = 0;

  const rankedRecommendations = [...parsed.data.recommendations].sort(
    (left, right) => right.styleScore - left.styleScore,
  );
  for (const ranked of rankedRecommendations) {
    const candidate = candidateByProductId.get(ranked.productId);
    if (
      candidate === undefined ||
      candidate.variant.id !== ranked.variantId ||
      !candidate.variant.available ||
      seen.has(ranked.productId) ||
      !isCandidateCompatibleWithProfile(
        candidate,
        parsed.data.shopperProfile.lessSuitableSilhouettes,
      ) ||
      containsDisallowedLanguage([...ranked.reasons, ranked.fitRisk ?? ''])
    ) {
      rejectedAIRecommendations += 1;
      continue;
    }
    seen.add(ranked.productId);
    hydrated.push(
      hydrate(
        candidate,
        {
          ...ranked,
          sizeConfidence: Math.min(ranked.sizeConfidence, 0.2),
        },
        'ai',
      ),
    );
    if (hydrated.length === limit) {
      break;
    }
  }

  if (hydrated.length < limit) {
    const fallback = deterministicFallback(
      candidates.filter(
        (candidate) =>
          !seen.has(candidate.product.id) &&
          isCandidateCompatibleWithProfile(
            candidate,
            parsed.data.shopperProfile.lessSuitableSilhouettes,
          ),
      ),
      limit - hydrated.length,
      [],
    );
    return {
      recommendations: [...hydrated, ...fallback.recommendations],
      warnings: [
        `AI ranking returned fewer valid recommendations; ${rejectedAIRecommendations} invalid or inconsistent result(s) were rejected and deterministic results filled the remainder.`,
      ],
      usedFallback: true,
    };
  }

  return { recommendations: hydrated, warnings: [], usedFallback: false };
}

function isCandidateCompatibleWithProfile(
  candidate: ScoredCandidate,
  lessSuitableSilhouettes: string[],
): boolean {
  const rejected = new Set(
    lessSuitableSilhouettes.map((value) => value.toLowerCase()),
  );
  return (
    !rejected.has(candidate.intelligence.silhouette.toLowerCase()) &&
    !rejected.has(candidate.intelligence.fit.toLowerCase())
  );
}

function containsDisallowedLanguage(values: string[]): boolean {
  return values.some(
    (value) =>
      /\b(?:he|him|his|she|her|hers)\b/i.test(value) ||
      /\bhigh[- ]risk\b/i.test(value),
  );
}

export function deterministicFallback(
  candidates: ScoredCandidate[],
  limit = 3,
  warnings = ['AI ranking was unavailable; deterministic ranking was used.'],
): RecommendationResponse {
  return {
    recommendations: candidates.slice(0, limit).map((candidate) =>
      hydrate(
        candidate,
        {
          productId: candidate.product.id,
          variantId: candidate.variant.id,
          styleScore: candidate.deterministicScore,
          styleConfidence: candidate.intelligence.confidence * 0.7,
          sizeConfidence: 0,
          reasons: [
            'Matches the requested category and available colour.',
            'Ranked using validated catalogue attributes.',
          ],
          fitRisk: 'No size-chart evidence is available for confident sizing.',
        },
        'deterministic-fallback',
      ),
    ),
    warnings,
    usedFallback: true,
  };
}

function hydrate(
  candidate: ScoredCandidate,
  ranking: AIRecommendationResult['recommendations'][number],
  source: HydratedRecommendation['source'],
): HydratedRecommendation {
  const imageUrl =
    candidate.variant.imageUrl ?? candidate.product.images[0]?.url;
  if (imageUrl === undefined) {
    throw new Error('Eligible recommendation is missing a trusted image.');
  }

  return {
    productId: candidate.product.id,
    variantId: candidate.variant.id,
    title: candidate.product.title,
    handle: candidate.product.handle,
    imageUrl,
    productUrl: `/products/${candidate.product.handle}`,
    price: candidate.variant.price.amountMinor,
    currency: candidate.variant.price.currency,
    colour: candidate.variant.colour,
    size: candidate.variant.size,
    styleScore: ranking.styleScore,
    styleConfidence: ranking.styleConfidence,
    sizeConfidence: ranking.sizeConfidence,
    reasons: ranking.reasons,
    fitRisk: ranking.fitRisk,
    source,
    deterministicScore: candidate.deterministicScore,
    scoreComponents: candidate.scoreComponents,
  };
}
