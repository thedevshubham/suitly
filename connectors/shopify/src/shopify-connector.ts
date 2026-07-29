import type { CommerceConnector, ProductPage } from '@suitly/connector-sdk';
import { canonicalProductSchema, type CanonicalProduct } from '@suitly/core';
import { z } from 'zod';

const imageSchema = z.object({
  url: z.string().url(),
  altText: z.string().nullable(),
});
const variantSchema = z.object({
  id: z.string(),
  sku: z.string().nullable(),
  barcode: z.string().nullable(),
  title: z.string(),
  price: z.string(),
  compareAtPrice: z.string().nullable(),
  inventoryQuantity: z.number().nullable(),
  availableForSale: z.boolean(),
  selectedOptions: z.array(z.object({ name: z.string(), value: z.string() })),
  image: imageSchema.nullable(),
});
const shopifyProductSchema = z.object({
  id: z.string(),
  handle: z.string(),
  title: z.string(),
  descriptionHtml: z.string(),
  vendor: z.string(),
  productType: z.string(),
  tags: z.array(z.string()),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']),
  updatedAt: z.string().datetime(),
  images: z.object({ nodes: z.array(imageSchema) }),
  variants: z.object({ nodes: z.array(variantSchema) }),
});
const responseSchema = z.object({
  data: z
    .object({
      products: z.object({
        nodes: z.array(shopifyProductSchema),
        pageInfo: z.object({
          hasNextPage: z.boolean(),
          endCursor: z.string().nullable(),
        }),
      }),
    })
    .optional(),
  errors: z.array(z.object({ message: z.string() })).optional(),
});

export type ShopifyConnectorOptions = {
  merchantId: string;
  shopDomain: string;
  accessToken: string;
  apiVersion?: string;
  currency?: string;
  fetch?: typeof globalThis.fetch;
};

export class ShopifyConnector implements CommerceConnector {
  readonly platform = 'shopify';
  readonly #options: ShopifyConnectorOptions;

  constructor(options: ShopifyConnectorOptions) {
    this.#options = {
      ...options,
      shopDomain: validateShopDomain(options.shopDomain),
    };
  }

  async listProducts(cursor?: string): Promise<ProductPage> {
    const response = await this.#graphql({
      query: productsQuery,
      variables: { first: 50, after: cursor ?? null },
    });
    const products = response.data?.products;
    if (!products)
      throw new Error(
        response.errors?.[0]?.message ?? 'Shopify returned no product data.',
      );
    return {
      products: products.nodes.map((product) => this.normaliseProduct(product)),
      ...(products.pageInfo.hasNextPage && products.pageInfo.endCursor
        ? { nextCursor: products.pageInfo.endCursor }
        : {}),
    };
  }

  async getProduct(id: string): Promise<CanonicalProduct | undefined> {
    let cursor: string | undefined;
    do {
      const page = await this.listProducts(cursor);
      const product = page.products.find(
        (candidate) => candidate.externalProductId === id,
      );
      if (product) return product;
      cursor = page.nextCursor;
    } while (cursor);
    return undefined;
  }

  normaliseProduct(
    product: z.infer<typeof shopifyProductSchema>,
  ): CanonicalProduct {
    const currency = this.#options.currency ?? 'USD';
    return canonicalProductSchema.parse({
      id: stableId('product', product.id),
      merchantId: this.#options.merchantId,
      source: 'shopify',
      externalProductId: product.id,
      handle: product.handle,
      title: product.title,
      ...(product.descriptionHtml
        ? { descriptionHtml: product.descriptionHtml }
        : {}),
      ...(product.vendor ? { vendor: product.vendor } : {}),
      ...(product.productType ? { productType: product.productType } : {}),
      tags: product.tags,
      published: product.status === 'ACTIVE',
      status: product.status.toLowerCase(),
      images: product.images.nodes.map((image, position) => ({
        url: image.url,
        position: position + 1,
        ...(image.altText ? { altText: image.altText } : {}),
      })),
      variants: product.variants.nodes.map((variant) => {
        const size = optionValue(variant.selectedOptions, 'size');
        const colour = optionValue(variant.selectedOptions, 'color', 'colour');
        return {
          id: stableId('variant', variant.id),
          externalVariantId: variant.id,
          ...(variant.sku ? { sku: variant.sku } : {}),
          ...(variant.barcode ? { barcode: variant.barcode } : {}),
          options: variant.selectedOptions,
          ...(size ? { size } : {}),
          ...(colour ? { colour } : {}),
          price: { amountMinor: moneyToMinor(variant.price), currency },
          ...(variant.compareAtPrice
            ? {
                compareAtPrice: {
                  amountMinor: moneyToMinor(variant.compareAtPrice),
                  currency,
                },
              }
            : {}),
          inventory: {
            tracker: 'shopify',
            ...(variant.inventoryQuantity === null
              ? {}
              : { quantity: variant.inventoryQuantity }),
          },
          available:
            variant.availableForSale &&
            (variant.inventoryQuantity === null ||
              variant.inventoryQuantity > 0),
          ...(variant.image ? { imageUrl: variant.image.url } : {}),
        };
      }),
      sourceUpdatedAt: product.updatedAt,
    });
  }

  async #graphql(body: { query: string; variables: Record<string, unknown> }) {
    const request = this.#options.fetch ?? globalThis.fetch;
    const version = this.#options.apiVersion ?? '2026-07';
    const response = await request(
      `https://${this.#options.shopDomain}/admin/api/${version}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-shopify-access-token': this.#options.accessToken,
        },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok)
      throw new Error(`Shopify Admin API failed (${response.status}).`);
    return responseSchema.parse(await response.json());
  }
}

const productsQuery = `query SuitlyProducts($first: Int!, $after: String) {
  products(first: $first, after: $after, sortKey: UPDATED_AT) {
    nodes {
      id handle title descriptionHtml vendor productType tags status updatedAt
      images(first: 20) { nodes { url altText } }
      variants(first: 100) {
        nodes {
          id sku barcode title price compareAtPrice inventoryQuantity
          availableForSale selectedOptions { name value }
          image { url altText }
        }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

function validateShopDomain(value: string): string {
  const domain = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain))
    throw new Error('Invalid Shopify shop domain.');
  return domain;
}
function stableId(kind: string, gid: string): string {
  const identifier = gid.split('/').at(-1);
  if (!identifier) throw new Error(`Invalid Shopify ${kind} ID.`);
  return `shopify_${kind}_${identifier}`;
}
function optionValue(
  options: Array<{ name: string; value: string }>,
  ...names: string[]
): string | undefined {
  return options.find((option) => names.includes(option.name.toLowerCase()))
    ?.value;
}
function moneyToMinor(value: string): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0)
    throw new Error('Invalid Shopify money value.');
  return Math.round(amount * 100);
}
