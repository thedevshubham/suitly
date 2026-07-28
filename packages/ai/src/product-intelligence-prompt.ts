import type { CanonicalProduct } from '@suitly/core';

export const productIntelligenceSystemPrompt = `
You classify fashion products for a recommendation system.
Use only the supplied catalogue facts and product image.
Return "unknown" whenever evidence is insufficient.
Do not infer shopper attributes, identity, or sensitive characteristics.
Do not invent fabric, fit, construction, or commerce facts.
Evidence must name the supplied sources that support the classification.
Visual effects must describe garment appearance neutrally and must not promote
an ideal body shape.

Field rules:
- fit describes the overall cut: slim, regular, relaxed, or oversized.
- shoulderConstruction describes an upper garment's shoulder seam:
  standard, drop-shoulder, raglan, or sleeveless.
- silhouette describes the visible garment outline.
- length is relative to a typical garment of the same category.
- sleeveFit describes sleeve volume, not sleeve length.
- fabricWeight and stretch require catalogue or visible evidence; otherwise use
  "unknown".
- Use "unknown" when a field applies but evidence is insufficient.
- Use "not-applicable" only when a field does not apply to that category.
- For shoes and bags, set fit to "unknown" and every other garment field to
  "not-applicable".
- For skirts and trousers, only shoulderConstruction, neckline, and sleeveFit
  are "not-applicable".
- For T-shirts, shirts, tops, jackets, jumpers, and dresses, garment fields
  apply. Never return "not-applicable" for them; return "unknown" when unsure.
`.trim();

export const productIntelligenceJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    category: {
      type: 'string',
      enum: [
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
      ],
    },
    fit: {
      type: 'string',
      enum: ['slim', 'regular', 'relaxed', 'oversized', 'unknown'],
    },
    shoulderConstruction: {
      type: 'string',
      enum: [
        'standard',
        'drop-shoulder',
        'raglan',
        'sleeveless',
        'not-applicable',
        'unknown',
      ],
    },
    silhouette: {
      type: 'string',
      enum: [
        'tapered',
        'straight',
        'boxy',
        'fitted',
        'flared',
        'not-applicable',
        'unknown',
      ],
    },
    length: {
      type: 'string',
      enum: [
        'cropped',
        'short',
        'standard',
        'long',
        'not-applicable',
        'unknown',
      ],
    },
    neckline: {
      type: 'string',
      enum: [
        'crew',
        'v-neck',
        'henley',
        'collared',
        'scoop',
        'high-neck',
        'not-applicable',
        'unknown',
      ],
    },
    sleeveFit: {
      type: 'string',
      enum: [
        'fitted',
        'regular',
        'loose',
        'sleeveless',
        'not-applicable',
        'unknown',
      ],
    },
    fabricWeight: {
      type: 'string',
      enum: ['light', 'medium', 'heavy', 'not-applicable', 'unknown'],
    },
    stretch: {
      type: 'string',
      enum: ['none', 'low', 'medium', 'high', 'not-applicable', 'unknown'],
    },
    styleContexts: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 8,
    },
    visualEffects: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 8,
    },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    evidence: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 8,
    },
  },
  required: [
    'category',
    'fit',
    'shoulderConstruction',
    'silhouette',
    'length',
    'neckline',
    'sleeveFit',
    'fabricWeight',
    'stretch',
    'styleContexts',
    'visualEffects',
    'confidence',
    'evidence',
  ],
} as const;

export function serializeProductFacts(product: CanonicalProduct): string {
  return JSON.stringify(
    {
      title: product.title,
      description: product.descriptionText,
      vendor: product.vendor,
      category: product.productCategory,
      type: product.productType,
      tags: product.tags,
      options: product.variants[0]?.options ?? [],
    },
    null,
    2,
  );
}
