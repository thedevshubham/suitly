import type {
  CanonicalProduct,
  CanonicalVariant,
  ProductIntelligence,
} from '@suitly/core';

export type EnrichedCatalogueProduct = {
  product: CanonicalProduct;
  intelligence: ProductIntelligence;
};

export type RecommendationRequest = {
  merchantId: string;
  heightCm: number;
  weightKg: number;
  preferredColours: string[];
  category: ProductIntelligence['category'];
  maximumPriceMinor?: number;
  allowAlternativeColours?: boolean;
};

export type ScoreComponents = {
  colour: number;
  heightLength: number;
  productConfidence: number;
  sizeEvidence: number;
  merchandising: number;
};

export type ScoredCandidate = {
  product: CanonicalProduct;
  intelligence: ProductIntelligence;
  variant: CanonicalVariant;
  deterministicScore: number;
  scoreComponents: ScoreComponents;
};

export type HydratedRecommendation = {
  productId: string;
  variantId: string;
  title: string;
  handle: string;
  imageUrl: string;
  productUrl: string;
  price: number;
  currency: string;
  colour?: string | undefined;
  size?: string | undefined;
  recommendedSize?: string | undefined;
  styleScore: number;
  styleConfidence: number;
  sizeConfidence: number;
  reasons: string[];
  fitRisk?: string | undefined;
  source: 'ai' | 'deterministic-fallback';
  deterministicScore: number;
  scoreComponents: ScoreComponents;
};

export type RecommendationResponse = {
  recommendations: HydratedRecommendation[];
  warnings: string[];
  usedFallback: boolean;
};
