import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  const photo = await readFile(
    resolve('../../tests/fixtures/shopper-full-body-synthetic.png'),
  );
  return new Response(photo, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'private, max-age=3600',
    },
  });
}
