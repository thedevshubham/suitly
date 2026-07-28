import {
  shopperVisionInputSchema,
  shopperVisualProfileSchema,
  type ShopperVisualProfile,
} from '@suitly/core';
import {
  readTemporaryShopperPhoto,
  type TemporaryShopperPhoto,
} from '@suitly/shopper-photo';
import { z } from 'zod';

import type {
  ShopperVisionAnalysisInput,
  ShopperVisionProvider,
} from './shopper-vision-types.js';

const shopperVisionJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    imageValid: { type: 'boolean' },
    imageIssues: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 8,
    },
    visibleBuild: {
      type: 'string',
      enum: ['lean', 'average', 'athletic', 'broad', 'heavy', 'unclear'],
    },
    shoulderProfile: {
      type: 'string',
      enum: ['narrow', 'balanced', 'moderately-broad', 'broad', 'unclear'],
    },
    shoulderToHipProfile: {
      type: 'string',
      enum: ['low', 'balanced', 'high', 'unclear'],
    },
    torsoProportion: {
      type: 'string',
      enum: ['short', 'balanced', 'long', 'unclear'],
    },
    legProportion: {
      type: 'string',
      enum: ['short', 'balanced', 'long', 'unclear'],
    },
    recommendedSilhouettes: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 8,
    },
    lessSuitableSilhouettes: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 8,
    },
    styleConfidence: { type: 'number', minimum: 0, maximum: 1 },
    geometryConfidence: { type: 'number', minimum: 0, maximum: 1 },
  },
  required: [
    'imageValid',
    'imageIssues',
    'visibleBuild',
    'shoulderProfile',
    'shoulderToHipProfile',
    'torsoProportion',
    'legProportion',
    'recommendedSilhouettes',
    'lessSuitableSilhouettes',
    'styleConfidence',
    'geometryConfidence',
  ],
} as const;

const ollamaResponseSchema = z.object({
  message: z.object({ content: z.string().min(1) }),
  total_duration: z.number().nonnegative().optional(),
});

const prompt = `
You analyse a shopper photograph only for fashion styling.
First verify that exactly one adult is visible from head to feet in a usable,
front-facing standing pose without severe obstruction or perspective distortion.
Describe only visible, fashion-relevant geometry. Do not identify the person.
Do not infer age, ethnicity, health, disability, attractiveness, gender
identity, religion, or any other sensitive or identity attribute.
Height and weight are user-supplied context, not facts to infer from the image.
Do not claim exact body measurements or guaranteed clothing size.
If the image is unusable, set imageValid to false, explain issues, use "unclear"
geometry values, empty silhouette arrays, and low confidence.
Return neutral styling guidance without promoting an ideal body shape.
`.trim();

type ReadPhoto = (photo: TemporaryShopperPhoto) => Promise<Buffer>;

export type OllamaShopperVisionProviderOptions = {
  baseUrl?: string | undefined;
  fetchImplementation?: typeof fetch;
  readPhoto?: ReadPhoto;
};

export class OllamaShopperVisionProvider implements ShopperVisionProvider {
  public readonly promptVersion = 'shopper-vision-v1';
  private readonly baseUrl: string;
  private readonly fetchImplementation: typeof fetch;
  private readonly readPhoto: ReadPhoto;

  public constructor(
    public readonly model: string,
    options: OllamaShopperVisionProviderOptions = {},
  ) {
    this.baseUrl = (options.baseUrl ?? 'http://127.0.0.1:11434').replace(
      /\/$/,
      '',
    );
    this.fetchImplementation = options.fetchImplementation ?? fetch;
    this.readPhoto = options.readPhoto ?? readTemporaryShopperPhoto;
  }

  public async analyseShopper(
    input: ShopperVisionAnalysisInput,
  ): Promise<ShopperVisualProfile> {
    const shopperInput = shopperVisionInputSchema.parse({
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      preferredColours: input.preferredColours,
    });
    const image = await this.readPhoto(input.photo);
    const response = await this.fetchImplementation(
      `${this.baseUrl}/api/chat`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: prompt },
            {
              role: 'user',
              content: `Analyse this shopper input:\n${JSON.stringify(
                shopperInput,
                null,
                2,
              )}`,
              images: [image.toString('base64')],
            },
          ],
          format: shopperVisionJsonSchema,
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
        `Ollama shopper analysis failed (${response.status}): ${await response.text()}`,
      );
    }

    const ollamaResponse = ollamaResponseSchema.parse(await response.json());
    return shopperVisualProfileSchema.parse(
      JSON.parse(ollamaResponse.message.content) as unknown,
    );
  }
}
