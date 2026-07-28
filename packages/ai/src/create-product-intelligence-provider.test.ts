import { describe, expect, it } from 'vitest';

import { createProductIntelligenceProvider } from './create-product-intelligence-provider.js';
import { GeminiProductIntelligenceProvider } from './gemini-product-intelligence-provider.js';
import { OllamaProductIntelligenceProvider } from './ollama-product-intelligence-provider.js';
import { OpenAIProductIntelligenceProvider } from './openai-product-intelligence-provider.js';

describe('createProductIntelligenceProvider', () => {
  it('creates the configured Gemini provider', () => {
    const provider = createProductIntelligenceProvider({
      PRODUCT_INTELLIGENCE_PROVIDER: 'gemini',
      GEMINI_API_KEY: 'test-key',
      PRODUCT_INTELLIGENCE_MODEL: 'gemini-test',
      ENABLE_CLOUD_AI_PROVIDERS: 'true',
    });

    expect(provider).toBeInstanceOf(GeminiProductIntelligenceProvider);
    expect(provider.model).toBe('gemini-test');
  });

  it('keeps OpenAI available', () => {
    const provider = createProductIntelligenceProvider({
      PRODUCT_INTELLIGENCE_PROVIDER: 'openai',
      OPENAI_API_KEY: 'test-key',
      PRODUCT_INTELLIGENCE_MODEL: 'openai-test',
      ENABLE_CLOUD_AI_PROVIDERS: 'true',
    });

    expect(provider).toBeInstanceOf(OpenAIProductIntelligenceProvider);
    expect(provider.model).toBe('openai-test');
  });

  it('blocks cloud providers by default', () => {
    expect(() =>
      createProductIntelligenceProvider({
        PRODUCT_INTELLIGENCE_PROVIDER: 'gemini',
        GEMINI_API_KEY: 'test-key',
        PRODUCT_INTELLIGENCE_MODEL: 'gemini-test',
      }),
    ).toThrow('Cloud AI providers are disabled.');
  });

  it('creates a local Ollama provider without an API key', () => {
    const provider = createProductIntelligenceProvider({
      PRODUCT_INTELLIGENCE_PROVIDER: 'ollama',
      PRODUCT_INTELLIGENCE_MODEL: 'qwen3.5:4b',
      OLLAMA_PRODUCT_INTELLIGENCE_VISION: 'true',
    });

    expect(provider).toBeInstanceOf(OllamaProductIntelligenceProvider);
    expect(provider.model).toBe('qwen3.5:4b');
  });

  it('rejects unsupported providers', () => {
    expect(() =>
      createProductIntelligenceProvider({
        PRODUCT_INTELLIGENCE_PROVIDER: 'unsupported',
      }),
    ).toThrow(
      'PRODUCT_INTELLIGENCE_PROVIDER must be "gemini", "ollama", or "openai".',
    );
  });
});
