import type { ProductIntelligence } from '@suitly/core';

const nonGarmentCategories = new Set<ProductIntelligence['category']>([
  'bag',
  'shoes',
]);
const lowerBodyCategories = new Set<ProductIntelligence['category']>([
  'skirt',
  'trousers',
]);
const garmentCategories = new Set<ProductIntelligence['category']>([
  'dress',
  'jacket',
  'jumper',
  'shirt',
  't-shirt',
  'top',
]);

export function normalizeProductIntelligence(
  intelligence: ProductIntelligence,
): ProductIntelligence {
  if (nonGarmentCategories.has(intelligence.category)) {
    return {
      ...intelligence,
      fit: 'unknown',
      shoulderConstruction: 'not-applicable',
      silhouette: 'not-applicable',
      length: 'not-applicable',
      neckline: 'not-applicable',
      sleeveFit: 'not-applicable',
      fabricWeight: 'not-applicable',
      stretch: 'not-applicable',
    };
  }

  if (lowerBodyCategories.has(intelligence.category)) {
    return {
      ...intelligence,
      shoulderConstruction: 'not-applicable',
      neckline: 'not-applicable',
      sleeveFit: 'not-applicable',
      silhouette: unknownWhenNotApplicable(intelligence.silhouette),
      length: unknownWhenNotApplicable(intelligence.length),
      fabricWeight: unknownWhenNotApplicable(intelligence.fabricWeight),
      stretch: unknownWhenNotApplicable(intelligence.stretch),
    };
  }

  if (garmentCategories.has(intelligence.category)) {
    return {
      ...intelligence,
      shoulderConstruction: unknownWhenNotApplicable(
        intelligence.shoulderConstruction,
      ),
      silhouette: unknownWhenNotApplicable(intelligence.silhouette),
      length: unknownWhenNotApplicable(intelligence.length),
      neckline: unknownWhenNotApplicable(intelligence.neckline),
      sleeveFit: unknownWhenNotApplicable(intelligence.sleeveFit),
      fabricWeight: unknownWhenNotApplicable(intelligence.fabricWeight),
      stretch: unknownWhenNotApplicable(intelligence.stretch),
    };
  }

  return intelligence;
}

function unknownWhenNotApplicable<T extends string>(
  value: T,
): Exclude<T, 'not-applicable'> | 'unknown' {
  return value === 'not-applicable'
    ? 'unknown'
    : (value as Exclude<T, 'not-applicable'>);
}
