import { GoogleGenAI } from '@google/genai';
import {
  productIntelligenceSchema,
  type ProductIntelligence,
} from '@suitly/core';

import {
  productIntelligenceJsonSchema,
  productIntelligenceSystemPrompt,
  serializeProductFacts,
} from './product-intelligence-prompt.js';
import type {
  ProductIntelligenceInput,
  ProductIntelligenceProvider,
} from './types.js';

const maximumImageBytes = 8 * 1024 * 1024;

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
  public readonly promptVersion = 'product-intelligence-v3';
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
    const catalogueFacts = serializeProductFacts(product);
    const parts: Array<
      { text: string } | { inlineData: { data: string; mimeType: string } }
    > = [
      {
        text: `${productIntelligenceSystemPrompt}\n\nAnalyse this product:\n${catalogueFacts}`,
      },
    ];
    const imageUrl = product.images[0]?.url;

    if (imageUrl !== undefined) {
      parts.push({ inlineData: await this.fetchImage(imageUrl) });
    }

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [{ role: 'user', parts }],
      config: {
        httpOptions: {
          timeout: 60_000,
          retryOptions: { attempts: 2 },
        },
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
