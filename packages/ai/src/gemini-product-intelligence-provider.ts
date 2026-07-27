import { GoogleGenAI } from '@google/genai';
import {
  productIntelligenceSchema,
  type ProductIntelligence,
} from '@suitly/core';

import type {
  ProductIntelligenceInput,
  ProductIntelligenceProvider,
} from './types.js';

const maximumImageBytes = 8 * 1024 * 1024;

const systemPrompt = `
You classify fashion products for a recommendation system.
Use only the supplied catalogue facts and product image.
Return "unknown" whenever evidence is insufficient.
Do not infer shopper attributes, identity, or sensitive characteristics.
Do not invent fabric, fit, construction, or commerce facts.
Evidence must name the supplied sources that support the classification.
Visual effects must describe garment appearance neutrally and must not promote
an ideal body shape.
`.trim();

const productIntelligenceJsonSchema = {
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

type GeminiClient = Pick<GoogleGenAI, 'models'>;
type FetchImage = (url: string) => Promise<{
  data: string;
  mimeType: string;
}>;

export type GeminiProductIntelligenceProviderOptions = {
  client?: GeminiClient;
  fetchImage?: FetchImage;
};

export class GeminiProductIntelligenceProvider
  implements ProductIntelligenceProvider
{
  public readonly promptVersion = 'product-intelligence-v1';
  private readonly client: GeminiClient;
  private readonly fetchImage: FetchImage;

  public constructor(
    public readonly model: string,
    apiKey: string,
    options: GeminiProductIntelligenceProviderOptions = {},
  ) {
    this.client = options.client ?? new GoogleGenAI({ apiKey });
    this.fetchImage = options.fetchImage ?? downloadImage;
  }

  public async enrichProduct(
    input: ProductIntelligenceInput,
  ): Promise<ProductIntelligence> {
    const product = input.product;
    const catalogueFacts = JSON.stringify(
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
    const parts: Array<
      { text: string } | { inlineData: { data: string; mimeType: string } }
    > = [
      { text: `${systemPrompt}\n\nAnalyse this product:\n${catalogueFacts}` },
    ];
    const imageUrl = product.images[0]?.url;

    if (imageUrl !== undefined) {
      parts.push({ inlineData: await this.fetchImage(imageUrl) });
    }

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [{ role: 'user', parts }],
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: productIntelligenceJsonSchema,
      },
    });
    const text = response.text;

    if (text === undefined || text.length === 0) {
      throw new Error('Gemini returned no product intelligence.');
    }

    return productIntelligenceSchema.parse(JSON.parse(text) as unknown);
  }
}

async function downloadImage(
  url: string,
): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    throw new Error(`Unable to download product image (${response.status}).`);
  }

  const mimeType = response.headers.get('content-type')?.split(';')[0];
  if (
    mimeType !== 'image/jpeg' &&
    mimeType !== 'image/png' &&
    mimeType !== 'image/webp'
  ) {
    throw new Error(
      `Unsupported product image type: ${mimeType ?? 'unknown'}.`,
    );
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength > maximumImageBytes) {
    throw new Error('Product image exceeds the 8 MB enrichment limit.');
  }

  return { data: bytes.toString('base64'), mimeType };
}
