import {
  productIntelligenceSchema,
  type ProductIntelligence,
} from '@suitly/core';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import type {
  ProductIntelligenceInput,
  ProductIntelligenceProvider,
} from './types.js';

const systemPrompt = `
You classify fashion products for a recommendation system.
Use only the supplied catalogue facts and product images.
Return "unknown" whenever evidence is insufficient.
Do not infer shopper attributes, identity, or sensitive characteristics.
Do not invent fabric, fit, construction, or commerce facts.
Evidence must name the supplied sources that support the classification.
Visual effects must describe garment appearance neutrally and must not promote
an ideal body shape.
`.trim();

export class OpenAIProductIntelligenceProvider
  implements ProductIntelligenceProvider
{
  public readonly promptVersion = 'product-intelligence-v1';
  private readonly client: OpenAI;

  public constructor(
    public readonly model: string,
    apiKey: string,
  ) {
    this.client = new OpenAI({ apiKey });
  }

  public async enrichProduct(
    input: ProductIntelligenceInput,
  ): Promise<ProductIntelligence> {
    const product = input.product;
    const text = JSON.stringify(
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
    const image = product.images[0]?.url;
    const content: OpenAI.Responses.ResponseInputContent[] = [
      {
        type: 'input_text',
        text: `Analyse this product:\n${text}`,
      },
    ];

    if (image !== undefined) {
      content.push({
        type: 'input_image',
        image_url: image,
        detail: 'low',
      });
    }

    const response = await this.client.responses.parse({
      model: this.model,
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ],
      text: {
        format: zodTextFormat(
          productIntelligenceSchema,
          'product_intelligence',
        ),
      },
    });

    if (response.output_parsed === null) {
      throw new Error('OpenAI returned no parsed product intelligence.');
    }

    return productIntelligenceSchema.parse(response.output_parsed);
  }
}
