import {
  shopperVisualProfileSchema,
  type ShopperVisualProfile,
} from '@suitly/core';
import {
  buildScoredCandidates,
  type EnrichedCatalogueProduct,
  type RecommendationAudience,
} from '@suitly/recommendation';
import { z } from 'zod';

export const controlledEvaluationCaseSchema = z.object({
  id: z.string().trim().min(1),
  audience: z.enum(['men', 'women']),
  category: z.enum([
    't-shirt',
    'shirt',
    'top',
    'jacket',
    'jumper',
    'dress',
    'skirt',
    'trousers',
    'shoes',
    'bag',
    'other',
    'unknown',
  ]),
  heightCm: z.number().min(120).max(230),
  weightKg: z.number().min(35).max(250),
  profilePreset: z.enum(['balanced', 'straight', 'relaxed']),
  minimumResults: z.number().int().min(0).max(3),
});

export const controlledEvaluationCasesSchema = z
  .array(controlledEvaluationCaseSchema)
  .min(1);

export type ControlledEvaluationCase = z.infer<
  typeof controlledEvaluationCaseSchema
>;

export type ControlledEvaluationCaseResult = {
  id: string;
  passed: boolean;
  failures: string[];
  baselineProductIds: string[];
  profileProductIds: string[];
  rankingChanged: boolean;
};

export type ControlledEvaluationReport = {
  caseCount: number;
  passedCount: number;
  failedCount: number;
  rankingChangedCount: number;
  failurePatterns: Record<string, number>;
  cases: ControlledEvaluationCaseResult[];
};

export function runControlledEvaluation(
  catalogue: EnrichedCatalogueProduct[],
  cases: ControlledEvaluationCase[],
  merchantId: string,
): ControlledEvaluationReport {
  const results = cases.map((testCase) =>
    runCase(catalogue, testCase, merchantId),
  );
  const failurePatterns: Record<string, number> = {};
  for (const result of results) {
    for (const failure of result.failures) {
      const category = failure.split(':')[0] ?? failure;
      failurePatterns[category] = (failurePatterns[category] ?? 0) + 1;
    }
  }

  return {
    caseCount: results.length,
    passedCount: results.filter((result) => result.passed).length,
    failedCount: results.filter((result) => !result.passed).length,
    rankingChangedCount: results.filter((result) => result.rankingChanged)
      .length,
    failurePatterns,
    cases: results,
  };
}

function runCase(
  catalogue: EnrichedCatalogueProduct[],
  testCase: ControlledEvaluationCase,
  merchantId: string,
): ControlledEvaluationCaseResult {
  const commonRequest = {
    merchantId,
    audience: testCase.audience,
    category: testCase.category,
    heightCm: testCase.heightCm,
    weightKg: testCase.weightKg,
    preferredColours: [],
  };
  const baseline = buildScoredCandidates(catalogue, commonRequest).slice(0, 3);
  const withProfile = buildScoredCandidates(catalogue, {
    ...commonRequest,
    shopperProfile: profileFor(testCase.profilePreset),
  }).slice(0, 3);
  const failures = validateCandidates(withProfile, testCase, merchantId);
  const baselineProductIds = baseline.map((item) => item.product.id);
  const profileProductIds = withProfile.map((item) => item.product.id);

  return {
    id: testCase.id,
    passed: failures.length === 0,
    failures,
    baselineProductIds,
    profileProductIds,
    rankingChanged:
      JSON.stringify(baselineProductIds) !== JSON.stringify(profileProductIds),
  };
}

function validateCandidates(
  candidates: ReturnType<typeof buildScoredCandidates>,
  testCase: ControlledEvaluationCase,
  merchantId: string,
): string[] {
  const failures: string[] = [];
  if (candidates.length < testCase.minimumResults) {
    failures.push(
      `insufficient-results: expected at least ${testCase.minimumResults}, received ${candidates.length}`,
    );
  }
  if (candidates.length > 3) {
    failures.push(`too-many-results: received ${candidates.length}`);
  }

  for (const candidate of candidates) {
    if (candidate.product.merchantId !== merchantId) {
      failures.push(`wrong-merchant: ${candidate.product.id}`);
    }
    if (!hasAudience(candidate.product.tags, testCase.audience)) {
      failures.push(`wrong-audience: ${candidate.product.id}`);
    }
    if (candidate.intelligence.category !== testCase.category) {
      failures.push(`wrong-category: ${candidate.product.id}`);
    }
    if (!candidate.variant.available) {
      failures.push(`unavailable-variant: ${candidate.variant.id}`);
    }
    if (
      !candidate.product.variants.some(
        (variant) => variant.id === candidate.variant.id,
      )
    ) {
      failures.push(`foreign-variant: ${candidate.variant.id}`);
    }
  }

  return failures;
}

function hasAudience(
  tags: string[],
  audience: RecommendationAudience,
): boolean {
  return tags.some((tag) => tag.toLowerCase() === audience);
}

function profileFor(
  preset: ControlledEvaluationCase['profilePreset'],
): ShopperVisualProfile {
  const silhouettes =
    preset === 'balanced'
      ? ['straight', 'regular']
      : preset === 'straight'
        ? ['straight']
        : ['relaxed'];
  return shopperVisualProfileSchema.parse({
    imageValid: true,
    imageIssues: [],
    visibleBuild: 'average',
    shoulderProfile: 'balanced',
    shoulderToHipProfile: 'balanced',
    torsoProportion: 'balanced',
    legProportion: 'balanced',
    recommendedSilhouettes: silhouettes,
    lessSuitableSilhouettes: preset === 'relaxed' ? ['boxy'] : [],
    styleConfidence: 0.8,
    geometryConfidence: 0.7,
  });
}
