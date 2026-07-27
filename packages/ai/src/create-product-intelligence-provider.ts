import { GeminiProductIntelligenceProvider } from './gemini-product-intelligence-provider.js';
import { OpenAIProductIntelligenceProvider } from './openai-product-intelligence-provider.js';
import type { ProductIntelligenceProvider } from './types.js';

export type ProductIntelligenceProviderName = 'gemini' | 'openai';

export function createProductIntelligenceProvider(
  environment: NodeJS.ProcessEnv,
): ProductIntelligenceProvider {
  const provider = requiredEnvironment(
    environment,
    'PRODUCT_INTELLIGENCE_PROVIDER',
  );

  if (provider === 'gemini') {
    return new GeminiProductIntelligenceProvider(
      requiredEnvironment(environment, 'PRODUCT_INTELLIGENCE_MODEL'),
      requiredEnvironment(environment, 'GEMINI_API_KEY'),
    );
  }

  if (provider === 'openai') {
    return new OpenAIProductIntelligenceProvider(
      requiredEnvironment(environment, 'PRODUCT_INTELLIGENCE_MODEL'),
      requiredEnvironment(environment, 'OPENAI_API_KEY'),
    );
  }

  throw new Error(
    'PRODUCT_INTELLIGENCE_PROVIDER must be either "gemini" or "openai".',
  );
}

function requiredEnvironment(
  environment: NodeJS.ProcessEnv,
  key: string,
): string {
  const value = environment[key];
  if (value === undefined || value.length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
