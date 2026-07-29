import { JsonlEvaluationRepository } from './jsonl-evaluation-repository.js';
import { summarizeEvaluationEvents } from './evaluation-summary.js';

const path =
  process.argv[2] ?? 'data/generated/recommendation-evaluation.jsonl';
const repository = new JsonlEvaluationRepository(path);
const summary = summarizeEvaluationEvents(await repository.listEvents());

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
