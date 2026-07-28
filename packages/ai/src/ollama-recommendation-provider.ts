import {
  aiRecommendationResultSchema,
  shopperVisionInputSchema,
  type AIRecommendationResult,
  type ShopperVisionInput,
} from '@suitly/core';
import type { ScoredCandidate } from '@suitly/recommendation';
import {
  readTemporaryShopperPhoto,
  type TemporaryShopperPhoto,
} from '@suitly/shopper-photo';
import { z } from 'zod';

const resultJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    shopperProfile: {
      type: 'object',
      additionalProperties: false,
      properties: {
        imageValid: { type: 'boolean' },
        imageIssues: { type: 'array', items: { type: 'string' }, maxItems: 8 },
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
    },
    recommendations: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          productId: { type: 'string' },
          variantId: { type: 'string' },
          styleScore: { type: 'integer', minimum: 0, maximum: 100 },
          styleConfidence: { type: 'number', minimum: 0, maximum: 1 },
          sizeConfidence: { type: 'number', minimum: 0, maximum: 1 },
          reasons: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            maxItems: 3,
          },
          fitRisk: { type: 'string' },
        },
        required: [
          'productId',
          'variantId',
          'styleScore',
          'styleConfidence',
          'sizeConfidence',
          'reasons',
          'fitRisk',
        ],
      },
    },
  },
  required: ['shopperProfile', 'recommendations'],
} as const;

const ollamaResponseSchema = z.object({
  message: z.object({ content: z.string().min(1) }),
});

const systemPrompt = `
You are a fashion recommendation ranker.
Analyse the supplied full-body shopper photo and rank only the supplied
candidate product and variant IDs.
Choose the three strongest candidates and return them in best-to-worst order.
styleScore must be a whole-number integer from 0 to 100.
Never invent or alter IDs, prices, inventory, colours, sizes, or URLs.
Do not identify the person or infer sensitive or identity attributes.
Describe only visible fashion-relevant geometry and image quality.
Do not claim exact measurements or guaranteed sizing.
Use the photograph to assess visible proportions and image quality only.
Do not match candidates to the clothes currently worn in the photograph.
Use stated colour preferences and candidate garment attributes for styling.
The catalogue has no size charts, so sizeConfidence must not exceed 0.2.
Prefer diverse, evidence-based results and include a concise fit risk.
Never recommend a candidate whose fit or silhouette appears in
lessSuitableSilhouettes.
Do not return a recommendation that you consider high risk.
Refer to the person only as "the shopper"; never use gendered pronouns.
If the photo is unusable, mark imageValid false and return no recommendations.
`.trim();

type ReadPhoto = (photo: TemporaryShopperPhoto) => Promise<Buffer>;

export type OllamaRecommendationInput = ShopperVisionInput & {
  photo: TemporaryShopperPhoto;
  candidates: ScoredCandidate[];
};

export type OllamaRecommendationProviderOptions = {
  baseUrl?: string | undefined;
  fetchImplementation?: typeof fetch;
  readPhoto?: ReadPhoto;
};

export class OllamaRecommendationProvider {
  public readonly promptVersion = 'recommendation-v3';
  private readonly baseUrl: string;
  private readonly fetchImplementation: typeof fetch;
  private readonly readPhoto: ReadPhoto;

  public constructor(
    public readonly model: string,
    options: OllamaRecommendationProviderOptions = {},
  ) {
    this.baseUrl = (options.baseUrl ?? 'http://127.0.0.1:11434').replace(
      /\/$/,
      '',
    );
    this.fetchImplementation = options.fetchImplementation ?? fetch;
    this.readPhoto = options.readPhoto ?? readTemporaryShopperPhoto;
  }

  public async analyseAndRank(
    input: OllamaRecommendationInput,
  ): Promise<AIRecommendationResult> {
    const shopper = shopperVisionInputSchema.parse(input);
    const image = await this.readPhoto(input.photo);
    const candidates = input.candidates.slice(0, 15).map((candidate) => ({
      productId: candidate.product.id,
      variantId: candidate.variant.id,
      title: candidate.product.title,
      colour: candidate.variant.colour,
      availableSize: candidate.variant.size,
      fit: candidate.intelligence.fit,
      shoulderConstruction: candidate.intelligence.shoulderConstruction,
      silhouette: candidate.intelligence.silhouette,
      length: candidate.intelligence.length,
      neckline: candidate.intelligence.neckline,
      sleeveFit: candidate.intelligence.sleeveFit,
      fabricWeight: candidate.intelligence.fabricWeight,
      stretch: candidate.intelligence.stretch,
      visualEffects: candidate.intelligence.visualEffects,
      deterministicScore: candidate.deterministicScore,
    }));

    const response = await this.fetchImplementation(
      `${this.baseUrl}/api/chat`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: JSON.stringify({ shopper, candidates }, null, 2),
              images: [image.toString('base64')],
            },
          ],
          format: resultJsonSchema,
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
        `Ollama recommendation failed (${response.status}): ${await response.text()}`,
      );
    }

    const ollamaResponse = ollamaResponseSchema.parse(await response.json());
    return aiRecommendationResultSchema.parse(
      JSON.parse(ollamaResponse.message.content) as unknown,
    );
  }
}
