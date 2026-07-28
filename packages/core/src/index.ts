export {
  canonicalProductSchema,
  canonicalVariantSchema,
  inventorySchema,
  moneySchema,
  productImageSchema,
  productSourceSchema,
  productStatusSchema,
  variantOptionSchema,
} from './catalogue.js';

export type {
  CanonicalProduct,
  CanonicalVariant,
  Inventory,
  Money,
  ProductImage,
  ProductSource,
  ProductStatus,
  VariantOption,
} from './catalogue.js';

export { productIntelligenceSchema } from './product-intelligence.js';
export type { ProductIntelligence } from './product-intelligence.js';

export {
  shopperVisionInputSchema,
  shopperVisualProfileSchema,
} from './shopper-vision.js';
export type {
  ShopperVisionInput,
  ShopperVisualProfile,
} from './shopper-vision.js';

export {
  aiRankedRecommendationSchema,
  aiRecommendationResultSchema,
} from './recommendation.js';
export type {
  AIRankedRecommendation,
  AIRecommendationResult,
} from './recommendation.js';
