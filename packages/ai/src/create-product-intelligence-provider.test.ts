import { describe, expect, it } from 'vitest';

import { createProductIntelligenceProvider } from './create-product-intelligence-provider.js';
import { GeminiProductIntelligenceProvider } from './gemini-product-intelligence-provider.js';
import { OpenAIProductIntelligenceProvider } from './openai-product-intelligence-provider.js';

describe('createProductIntelligenceProvider', () => {
  it('creates the configured Gemini provider', () => {
    const provider = createProductIntelligenceProvider({
      PRODUCT_INTELLIGENCE_PROVIDER: 'gemini',
      GEMINI_API_KEY: 'test-key',
      PRODUCT_INTELLIGENCE_MODEL: 'gemini-test',
    });

    expect(provider).toBeInstanceOf(GeminiProductIntelligenceProvider);
    expect(provider.model).toBe('gemini-test');
  });

  it('keeps OpenAI available', () => {
    const provider = createProductIntelligenceProvider({
      PRODUCT_INTELLIGENCE_PROVIDER: 'openai',
      OPENAI_API_KEY: 'test-key',
      PRODUCT_INTELLIGENCE_MODEL: 'openai-test',
    });

    expect(provider).toBeInstanceOf(OpenAIProductIntelligenceProvider);
    expect(provider.model).toBe('openai-test');
  });

  it('rejects unsupported providers', () => {
    expect(() =>
      createProductIntelligenceProvider({
        PRODUCT_INTELLIGENCE_PROVIDER: 'unsupported',
      }),
    ).toThrow(
      'PRODUCT_INTELLIGENCE_PROVIDER must be either "gemini" or "openai".',
    );
  });
});
