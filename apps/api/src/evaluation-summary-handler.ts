import { summarizeEvaluationEvents } from './evaluation-summary.js';
import type { EvaluationRepository } from './evaluation-types.js';
import type { CatalogueRepository } from './types.js';

export type EvaluationDashboardSummary = Omit<
  ReturnType<typeof summarizeEvaluationEvents>,
  'productFeedback'
> & {
  productFeedback: Array<{
    productId: string;
    title: string;
    liked: number;
    disliked: number;
    wouldBuy: number;
  }>;
};

export function createEvaluationSummaryHttpHandler(
  evaluation: EvaluationRepository,
  catalogue: CatalogueRepository,
  merchantId: string,
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method !== 'GET') {
      return json(
        { error: { code: 'method_not_allowed', message: 'Use GET.' } },
        405,
        { Allow: 'GET' },
      );
    }

    try {
      const [events, products] = await Promise.all([
        evaluation.listEvents(),
        catalogue.loadEnrichedProducts(merchantId),
      ]);
      const summary = summarizeEvaluationEvents(events);
      const titles = new Map(
        products.map((entry) => [entry.product.id, entry.product.title]),
      );
      const response: EvaluationDashboardSummary = {
        ...summary,
        productFeedback: summary.productFeedback.map((product) => ({
          ...product,
          title: titles.get(product.productId) ?? 'Unknown catalogue product',
        })),
      };
      return json(response, 200);
    } catch {
      return json(
        {
          error: {
            code: 'evaluation_summary_failed',
            message: 'Evaluation summary could not be loaded.',
          },
        },
        500,
      );
    }
  };
}

function json(
  value: unknown,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return Response.json(value, {
    status,
    headers: { ...headers, 'cache-control': 'no-store' },
  });
}
