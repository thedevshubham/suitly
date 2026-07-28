import type { ProductIntelligence, ShopperVisualProfile } from '@suitly/core';
import type {
  EnrichedCatalogueProduct,
  HydratedRecommendation,
} from '@suitly/recommendation';

export type RecommendShopperFields = {
  merchantId: string;
  heightCm: number;
  weightKg: number;
  preferredColours: string[];
  category: ProductIntelligence['category'];
  maximumPriceMinor?: number | undefined;
  allowAlternativeColours?: boolean | undefined;
};

export type RecommendShopperInput = {
  fields: unknown;
  photo: Buffer;
};

export type ShopperProfileSummary = Pick<
  ShopperVisualProfile,
  | 'visibleBuild'
  | 'recommendedSilhouettes'
  | 'lessSuitableSilhouettes'
  | 'styleConfidence'
  | 'geometryConfidence'
>;

export type RecommendShopperResponse = {
  recommendationId: string;
  photoStatus: 'valid' | 'invalid' | 'analysis-unavailable';
  shopperProfileSummary?: ShopperProfileSummary;
  recommendations: HydratedRecommendation[];
  warnings: string[];
  usedFallback: boolean;
  timing: {
    analysisMs: number;
    totalMs: number;
  };
};

export type CatalogueRepository = {
  loadEnrichedProducts(merchantId: string): Promise<EnrichedCatalogueProduct[]>;
};
