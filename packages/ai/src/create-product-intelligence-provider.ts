import { GeminiProductIntelligenceProvider } from './gemini-product-intelligence-provider.js';
import { OllamaProductIntelligenceProvider } from './ollama-product-intelligence-provider.js';
import { OpenAIProductIntelligenceProvider } from './openai-product-intelligence-provider.js';
import type { ProductIntelligenceProvider } from './types.js';

export type ProductIntelligenceProviderName = 'gemini' | 'ollama' | 'openai';
type ProviderEnvironment = Readonly<Record<string, string | undefined>>;

export function createProductIntelligenceProvider(
  environment: ProviderEnvironment,
): ProductIntelligenceProvider {
  const provider = requiredEnvironment(
    environment,
    'PRODUCT_INTELLIGENCE_PROVIDER',
  );

  if (provider === 'gemini') {
    assertCloudProvidersEnabled(environment);
    return new GeminiProductIntelligenceProvider(
      requiredEnvironment(environment, 'PRODUCT_INTELLIGENCE_MODEL'),
      requiredEnvironment(environment, 'GEMINI_API_KEY'),
    );
  }

  if (provider === 'openai') {
    assertCloudProvidersEnabled(environment);
    return new OpenAIProductIntelligenceProvider(
      requiredEnvironment(environment, 'PRODUCT_INTELLIGENCE_MODEL'),
      requiredEnvironment(environment, 'OPENAI_API_KEY'),
    );
  }

  if (provider === 'ollama') {
    return new OllamaProductIntelligenceProvider(
      requiredEnvironment(environment, 'PRODUCT_INTELLIGENCE_MODEL'),
      {
        baseUrl: environment.OLLAMA_BASE_URL,
        includeImages: parseBoolean(
          environment.OLLAMA_PRODUCT_INTELLIGENCE_VISION ?? 'true',
          'OLLAMA_PRODUCT_INTELLIGENCE_VISION',
        ),
      },
    );
  }

  throw new Error(
    'PRODUCT_INTELLIGENCE_PROVIDER must be "gemini", "ollama", or "openai".',
  );
}

function requiredEnvironment(
  environment: ProviderEnvironment,
  key: string,
): string {
  const value = environment[key];
  if (value === undefined || value.length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function assertCloudProvidersEnabled(environment: ProviderEnvironment): void {
  const enabled = parseBoolean(
    environment.ENABLE_CLOUD_AI_PROVIDERS ?? 'false',
    'ENABLE_CLOUD_AI_PROVIDERS',
  );
  if (!enabled) {
    throw new Error(
      'Cloud AI providers are disabled. Set ENABLE_CLOUD_AI_PROVIDERS=true ' +
        'only for an intentional evaluation run.',
    );
  }
}

function parseBoolean(value: string, key: string): boolean {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  throw new Error(`${key} must be either "true" or "false".`);
}
