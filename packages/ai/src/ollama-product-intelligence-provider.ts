import {
  productIntelligenceSchema,
  type ProductIntelligence,
} from '@suitly/core';
import { z } from 'zod';

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

const ollamaResponseSchema = z.object({
  message: z.object({
    content: z.string().min(1),
  }),
  total_duration: z.number().nonnegative().optional(),
  load_duration: z.number().nonnegative().optional(),
  prompt_eval_count: z.number().int().nonnegative().optional(),
  eval_count: z.number().int().nonnegative().optional(),
});

type FetchImplementation = typeof fetch;

export type OllamaProductIntelligenceProviderOptions = {
  baseUrl?: string | undefined;
  includeImages?: boolean;
  fetchImplementation?: FetchImplementation;
};

export class OllamaProductIntelligenceProvider
  implements ProductIntelligenceProvider
{
  public readonly promptVersion = 'product-intelligence-v3';
  private readonly baseUrl: string;
  private readonly includeImages: boolean;
  private readonly fetchImplementation: FetchImplementation;

  public constructor(
    public readonly model: string,
    options: OllamaProductIntelligenceProviderOptions = {},
  ) {
    this.baseUrl = (options.baseUrl ?? 'http://127.0.0.1:11434').replace(
      /\/$/,
      '',
    );
    this.includeImages = options.includeImages ?? true;
    this.fetchImplementation = options.fetchImplementation ?? fetch;
  }

  public async enrichProduct(
    input: ProductIntelligenceInput,
  ): Promise<ProductIntelligence> {
    const images: string[] = [];
    const imageUrl = input.product.images[0]?.url;

    if (this.includeImages && imageUrl !== undefined) {
      images.push(await this.downloadImage(imageUrl));
    }

    const response = await this.fetchImplementation(
      `${this.baseUrl}/api/chat`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: productIntelligenceSystemPrompt,
            },
            {
              role: 'user',
              content: `Analyse this product:\n${serializeProductFacts(
                input.product,
              )}`,
              ...(images.length > 0 ? { images } : {}),
            },
          ],
          format: productIntelligenceJsonSchema,
          stream: false,
          think: false,
          options: { temperature: 0 },
          keep_alive: '5m',
        }),
        signal: AbortSignal.timeout(120_000),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Ollama request failed (${response.status}): ${await response.text()}`,
      );
    }

    const ollamaResponse = ollamaResponseSchema.parse(await response.json());
    return productIntelligenceSchema.parse(
      JSON.parse(ollamaResponse.message.content) as unknown,
    );
  }

  private async downloadImage(url: string): Promise<string> {
    const response = await this.fetchImplementation(url, {
      signal: AbortSignal.timeout(15_000),
    });
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

    return bytes.toString('base64');
  }
}
