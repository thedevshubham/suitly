import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';

import { createLocalRecommendHandler } from './local-handler.js';

if (existsSync('.env.local')) {
  loadEnvFile('.env.local');
}

const form = new FormData();
form.set('merchantId', 'sample-merchant');
form.set('audience', 'men');
form.set('heightCm', '178');
form.set('weightKg', '75');
form.set('category', 'jacket');
form.set(
  'photo',
  new Blob([await readFile('tests/fixtures/shopper-full-body-synthetic.png')], {
    type: 'image/png',
  }),
);

const response = await createLocalRecommendHandler()(
  new Request('http://localhost/api/recommend', {
    method: 'POST',
    body: form,
  }),
);
const body: unknown = await response.json();

process.stdout.write(
  `${JSON.stringify({ status: response.status, body }, null, 2)}\n`,
);
if (!response.ok) {
  process.exitCode = 1;
}
