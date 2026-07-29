import type { CanonicalVariant } from '@suitly/core';

import type {
  EnrichedCatalogueProduct,
  RecommendationRequest,
  ScoredCandidate,
  ScoreComponents,
} from './types.js';

export function buildScoredCandidates(
  enrichedProducts: EnrichedCatalogueProduct[],
  request: RecommendationRequest,
): ScoredCandidate[] {
  return enrichedProducts
    .flatMap((entry) => {
      const variant = selectEligibleVariant(entry, request);
      if (variant === undefined) {
        return [];
      }

      const scoreComponents = scoreCandidate(entry, variant, request);
      return [
        {
          ...entry,
          variant,
          scoreComponents,
          deterministicScore: weightedScore(scoreComponents),
        },
      ];
    })
    .sort(
      (left, right) =>
        right.deterministicScore - left.deterministicScore ||
        left.product.id.localeCompare(right.product.id),
    );
}

function selectEligibleVariant(
  entry: EnrichedCatalogueProduct,
  request: RecommendationRequest,
): CanonicalVariant | undefined {
  const product = entry.product;
  if (
    product.merchantId !== request.merchantId ||
    product.status !== 'active' ||
    !product.published ||
    !product.tags.some(
      (tag) => tag.toLowerCase() === request.audience.toLowerCase(),
    ) ||
    product.images.length === 0 ||
    entry.intelligence.category !== request.category
  ) {
    return undefined;
  }

  const available = product.variants.filter(
    (variant) =>
      variant.available &&
      (request.maximumPriceMinor === undefined ||
        variant.price.amountMinor <= request.maximumPriceMinor),
  );
  const preferred = available.find((variant) =>
    request.preferredColours.some(
      (colour) => colour.toLowerCase() === variant.colour?.toLowerCase(),
    ),
  );

  return (
    preferred ??
    (request.preferredColours.length === 0 ||
    request.allowAlternativeColours === true
      ? available[0]
      : undefined)
  );
}

function scoreCandidate(
  entry: EnrichedCatalogueProduct,
  variant: CanonicalVariant,
  request: RecommendationRequest,
): ScoreComponents {
  const colour =
    request.preferredColours.length === 0
      ? 0.5
      : request.preferredColours.some(
            (preferred) =>
              preferred.toLowerCase() === variant.colour?.toLowerCase(),
          )
        ? 1
        : 0;
  const heightLength = scoreHeightLength(
    request.heightCm,
    entry.intelligence.length,
  );
  const sizeEvidence = variant.size === undefined ? 0 : 0.5;

  return {
    colour,
    silhouetteCompatibility: scoreSilhouetteCompatibility(entry, request),
    heightLength,
    productConfidence: entry.intelligence.confidence,
    sizeEvidence,
    merchandising: 0.5,
  };
}

function scoreSilhouetteCompatibility(
  entry: EnrichedCatalogueProduct,
  request: RecommendationRequest,
): number {
  const recommended = new Set(
    (request.shopperProfile?.recommendedSilhouettes ?? []).map((value) =>
      value.toLowerCase(),
    ),
  );
  const lessSuitable = new Set(
    (request.shopperProfile?.lessSuitableSilhouettes ?? []).map((value) =>
      value.toLowerCase(),
    ),
  );
  if (
    lessSuitable.has(entry.intelligence.fit.toLowerCase()) ||
    lessSuitable.has(entry.intelligence.silhouette.toLowerCase())
  ) {
    return 0;
  }
  if (recommended.size === 0) {
    return 0.5;
  }
  return recommended.has(entry.intelligence.fit.toLowerCase()) ||
    recommended.has(entry.intelligence.silhouette.toLowerCase())
    ? 1
    : 0.5;
}

function scoreHeightLength(
  heightCm: number,
  length: EnrichedCatalogueProduct['intelligence']['length'],
): number {
  if (length === 'unknown' || length === 'not-applicable') {
    return 0.5;
  }
  if (heightCm >= 185) {
    return length === 'long' ? 1 : length === 'standard' ? 0.8 : 0.4;
  }
  if (heightCm <= 165) {
    return length === 'cropped' || length === 'short'
      ? 1
      : length === 'standard'
        ? 0.8
        : 0.4;
  }
  return length === 'standard' ? 1 : 0.7;
}

function weightedScore(components: ScoreComponents): number {
  return Math.round(
    (components.colour * 0.25 +
      components.silhouetteCompatibility * 0.3 +
      components.heightLength * 0.15 +
      components.productConfidence * 0.15 +
      components.sizeEvidence * 0.1 +
      components.merchandising * 0.05) *
      100,
  );
}
