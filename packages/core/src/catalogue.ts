import { z } from 'zod';

const optionalNonEmptyString = z.string().trim().min(1).optional();

export const productSourceSchema = z.enum([
  'shopify_csv',
  'shopify',
  'woocommerce',
  'bigcommerce',
  'magento',
  'custom_api',
]);

export const productStatusSchema = z.enum([
  'active',
  'draft',
  'archived',
  'unknown',
]);

export const moneySchema = z.object({
  amountMinor: z.number().int().nonnegative(),
  currency: z.string().regex(/^[A-Z]{3}$/),
});

export const productImageSchema = z.object({
  url: z.string().url(),
  position: z.number().int().positive().optional(),
  altText: optionalNonEmptyString,
});

export const variantOptionSchema = z.object({
  name: z.string().trim().min(1),
  value: z.string().trim().min(1),
});

export const inventorySchema = z.object({
  tracker: optionalNonEmptyString,
  quantity: z.number().int().optional(),
  policy: optionalNonEmptyString,
});

export const canonicalVariantSchema = z.object({
  id: z.string().trim().min(1),
  externalVariantId: optionalNonEmptyString,
  sku: optionalNonEmptyString,
  barcode: optionalNonEmptyString,
  options: z.array(variantOptionSchema).min(1),
  size: optionalNonEmptyString,
  colour: optionalNonEmptyString,
  price: moneySchema,
  compareAtPrice: moneySchema.optional(),
  inventory: inventorySchema,
  available: z.boolean(),
  imageUrl: z.string().url().optional(),
  weightGrams: z.number().nonnegative().optional(),
});

export const canonicalProductSchema = z.object({
  id: z.string().trim().min(1),
  merchantId: z.string().trim().min(1),
  source: productSourceSchema,
  externalProductId: optionalNonEmptyString,
  handle: z.string().trim().min(1),
  title: z.string().trim().min(1),
  descriptionHtml: optionalNonEmptyString,
  descriptionText: optionalNonEmptyString,
  vendor: optionalNonEmptyString,
  productCategory: optionalNonEmptyString,
  productType: optionalNonEmptyString,
  tags: z.array(z.string().trim().min(1)),
  published: z.boolean(),
  status: productStatusSchema,
  images: z.array(productImageSchema),
  variants: z.array(canonicalVariantSchema).min(1),
  sourceUpdatedAt: z.string().datetime().optional(),
});

export type ProductSource = z.infer<typeof productSourceSchema>;
export type ProductStatus = z.infer<typeof productStatusSchema>;
export type Money = z.infer<typeof moneySchema>;
export type ProductImage = z.infer<typeof productImageSchema>;
export type VariantOption = z.infer<typeof variantOptionSchema>;
export type Inventory = z.infer<typeof inventorySchema>;
export type CanonicalVariant = z.infer<typeof canonicalVariantSchema>;
export type CanonicalProduct = z.infer<typeof canonicalProductSchema>;
