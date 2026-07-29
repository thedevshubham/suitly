import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

import { ShopifyConnector } from './shopify-connector.js';
import { parseShopifyProductWebhook, verifyShopifyWebhook } from './webhook.js';

const product = {
  id: 'gid://shopify/Product/123',
  handle: 'everyday-tee',
  title: 'Everyday Tee',
  descriptionHtml: '<p>Soft tee</p>',
  vendor: 'Example',
  productType: 'T-shirt',
  tags: ['men'],
  status: 'ACTIVE',
  updatedAt: '2026-07-29T00:00:00.000Z',
  images: {
    nodes: [{ url: 'https://cdn.example/product.jpg', altText: 'Tee' }],
  },
  variants: {
    nodes: [
      {
        id: 'gid://shopify/ProductVariant/456',
        sku: 'TEE-M',
        barcode: null,
        title: 'Black / M',
        price: '19.99',
        compareAtPrice: null,
        inventoryQuantity: 3,
        availableForSale: true,
        selectedOptions: [
          { name: 'Color', value: 'Black' },
          { name: 'Size', value: 'M' },
        ],
        image: null,
      },
    ],
  },
};

describe('ShopifyConnector', () => {
  it('paginates GraphQL and maps Shopify into the canonical schema', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: {
          products: {
            nodes: [product],
            pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
          },
        },
      }),
    );
    const connector = new ShopifyConnector({
      merchantId: 'merchant-1',
      shopDomain: 'example.myshopify.com',
      accessToken: 'secret-token',
      fetch: request,
    });

    const page = await connector.listProducts();

    expect(page.nextCursor).toBe('cursor-1');
    expect(page.products[0]).toMatchObject({
      id: 'shopify_product_123',
      source: 'shopify',
      externalProductId: 'gid://shopify/Product/123',
      status: 'active',
      variants: [
        {
          id: 'shopify_variant_456',
          size: 'M',
          colour: 'Black',
          price: { amountMinor: 1999, currency: 'USD' },
          available: true,
        },
      ],
    });
    const [url, init] = request.mock.calls[0] ?? [];
    expect(url).toBe(
      'https://example.myshopify.com/admin/api/2026-07/graphql.json',
    );
    expect(new Headers(init?.headers).get('x-shopify-access-token')).toBe(
      'secret-token',
    );
  });

  it('rejects non-Shopify domains', () => {
    expect(
      () =>
        new ShopifyConnector({
          merchantId: 'merchant-1',
          shopDomain: 'attacker.example',
          accessToken: 'token',
        }),
    ).toThrow('Invalid Shopify shop domain');
  });
});

describe('Shopify webhooks', () => {
  it('verifies raw-body HMAC and maps product updates', () => {
    const body = Buffer.from('{"id":123}');
    const secret = 'client-secret';
    const hmac = createHmac('sha256', secret).update(body).digest('base64');

    expect(verifyShopifyWebhook(body, hmac, secret)).toBe(true);
    expect(parseShopifyProductWebhook('products/update', body)).toEqual({
      type: 'upsert',
      externalProductId: 'gid://shopify/Product/123',
    });
  });
});
