export type SuitlyAudience = 'men' | 'women';

export type SuitlyRecommendation = {
  productId: string;
  variantId: string;
  title: string;
  imageUrl: string;
  productUrl: string;
  price: number;
  currency: string;
  styleScore: number;
  reasons: string[];
};

export type SuitlyRecommendationResponse = {
  recommendationId: string;
  photoStatus: 'valid' | 'invalid' | 'analysis-unavailable';
  recommendations: SuitlyRecommendation[];
  warnings: string[];
};

export type RecommendInput = {
  audience: SuitlyAudience;
  heightCm: number;
  weightKg: number;
  category: string;
  photo: Blob;
};

export type SuitlyClientOptions = {
  apiBaseUrl: string;
  merchantId: string;
  sessionToken?: string;
  fetch?: typeof globalThis.fetch;
};

export class SuitlyClient {
  readonly #options: SuitlyClientOptions;

  constructor(options: SuitlyClientOptions) {
    if (!options.apiBaseUrl || !options.merchantId) {
      throw new Error('apiBaseUrl and merchantId are required.');
    }
    this.#options = options;
  }

  async recommend(
    input: RecommendInput,
  ): Promise<SuitlyRecommendationResponse> {
    const body = new FormData();
    body.set('merchantId', this.#options.merchantId);
    body.set('audience', input.audience);
    body.set('heightCm', String(input.heightCm));
    body.set('weightKg', String(input.weightKg));
    body.set('category', input.category);
    body.set('photo', input.photo);

    return this.#request<SuitlyRecommendationResponse>('/api/recommend', {
      method: 'POST',
      body,
    });
  }

  async feedback(
    recommendationId: string,
    productId: string,
    feedback: 'liked' | 'disliked' | 'would-buy',
  ): Promise<void> {
    await this.#request('/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recommendationId, productId, feedback }),
    });
  }

  async #request<T>(path: string, init: RequestInit): Promise<T> {
    const request = this.#options.fetch ?? globalThis.fetch;
    const headers = new Headers(init.headers);
    if (this.#options.sessionToken) {
      headers.set('authorization', `Bearer ${this.#options.sessionToken}`);
    }
    const response = await request(
      new URL(path, ensureTrailingSlash(this.#options.apiBaseUrl)),
      { ...init, headers },
    );
    if (!response.ok) {
      const error = (await response.json().catch(() => undefined)) as
        | { error?: { message?: string } }
        | undefined;
      throw new Error(
        error?.error?.message ?? `Suitly request failed (${response.status}).`,
      );
    }
    return (await response.json()) as T;
  }
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}
