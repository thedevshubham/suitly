import { createHmac, timingSafeEqual } from 'node:crypto';
import type { CatalogueChange } from '@suitly/connector-sdk';
import { z } from 'zod';

const productWebhookSchema = z.object({ id: z.number().int().positive() });

export function verifyShopifyWebhook(
  body: Buffer,
  suppliedHmac: string,
  clientSecret: string,
): boolean {
  const expected = createHmac('sha256', clientSecret)
    .update(body)
    .digest('base64');
  const left = Buffer.from(suppliedHmac);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function parseShopifyProductWebhook(
  topic: string,
  body: Buffer,
): CatalogueChange {
  const payload = productWebhookSchema.parse(
    JSON.parse(body.toString('utf8')) as unknown,
  );
  const externalProductId = `gid://shopify/Product/${payload.id}`;
  if (topic === 'products/delete') return { type: 'delete', externalProductId };
  if (topic === 'products/create' || topic === 'products/update')
    return { type: 'upsert', externalProductId };
  throw new Error(`Unsupported Shopify webhook topic: ${topic}`);
}
