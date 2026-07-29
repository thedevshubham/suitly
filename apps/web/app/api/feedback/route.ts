import {
  createFeedbackHttpHandler,
  JsonlEvaluationRepository,
} from '@suitly/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const feedback = createFeedbackHttpHandler(
  new JsonlEvaluationRepository(
    process.env.SUITLY_EVALUATION_PATH ??
      '../../data/generated/recommendation-evaluation.jsonl',
  ),
);

export async function POST(request: Request): Promise<Response> {
  return feedback(request);
}
