import pino, { type LoggerOptions } from 'pino';

export function createSuitlyLogger(options: LoggerOptions = {}): pino.Logger {
  return pino({
    level: process.env.LOG_LEVEL ?? 'info',
    redact: {
      paths: [
        'req.headers.authorization',
        'authorization',
        'photo',
        '*.photo',
        '*.imageBuffer',
        '*.shopperProfile',
      ],
      censor: '[REDACTED]',
    },
    base: { service: 'suitly' },
    ...options,
  });
}

export type RecommendationMetric = {
  merchantId: string;
  recommendationId: string;
  totalMs: number;
  analysisMs: number;
  resultCount: number;
  usedFallback: boolean;
  photoStatus: string;
};

export function recordRecommendationMetric(
  logger: pino.Logger,
  metric: RecommendationMetric,
): void {
  logger.info({ event: 'recommendation.completed', ...metric });
}
