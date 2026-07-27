import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { normalizeShopifyCsv } from './normalize-shopify-csv.js';

const fixturePath = resolve('tests/fixtures/store-products-sample.csv');
const sampleCsv = readFileSync(fixturePath, 'utf8');

describe('normalizeShopifyCsv', () => {
  it('normalizes the complete sample catalogue', () => {
    const result = normalizeShopifyCsv(sampleCsv, {
      currency: 'USD',
      merchantId: 'fixture-merchant',
      sourceFile: 'tests/fixtures/store-products-sample.csv',
    });

    expect(result.products).toHaveLength(20);
    expect(result.report).toMatchObject({
      currency: 'USD',
      totalRows: 160,
      parsedProducts: 20,
      parsedVariants: 160,
      availableVariants: 22,
      unavailableVariants: 138,
      skippedRows: 0,
      skippedProducts: 0,
      skippedVariants: 0,
      productsWithoutImages: 0,
      productsWithoutCategory: 20,
      productsWithoutType: 20,
      variantsWithoutSku: 160,
      variantsWithoutExternalId: 160,
      variantsWithoutSize: 0,
      variantsWithoutColour: 0,
      duplicateVariantKeys: 0,
      malformedImageUrls: 0,
    });

    expect(
      result.products.every((product) => product.variants.length === 8),
    ).toBe(true);
    expect(result.products.flatMap((product) => product.variants)).toHaveLength(
      160,
    );
  });

  it('inherits product fields and option names across continuation rows', () => {
    const result = normalizeShopifyCsv(sampleCsv, {
      currency: 'USD',
      merchantId: 'fixture-merchant',
    });
    const product = result.products.find(
      (candidate) => candidate.handle === 'red-sports-tee',
    );

    expect(product).toBeDefined();
    expect(product).toMatchObject({
      title: 'Red Sports Tee',
      vendor: 'partners-demo',
      published: true,
      status: 'active',
      tags: ['women'],
    });
    expect(product?.descriptionText).toContain("Women's red sporty t-shirt");
    expect(product?.images).toHaveLength(1);
    expect(new Set(product?.variants.map((variant) => variant.size))).toEqual(
      new Set(['XS', 'S', 'M', 'L']),
    );
    expect(new Set(product?.variants.map((variant) => variant.colour))).toEqual(
      new Set(['Black', 'White']),
    );
  });

  it('uses positive inventory quantity as the fixture availability rule', () => {
    const result = normalizeShopifyCsv(sampleCsv, {
      currency: 'USD',
    });
    const variants = result.products.flatMap((product) => product.variants);

    expect(
      variants.every(
        (variant) =>
          variant.available === (variant.inventory.quantity ?? 0) > 0,
      ),
    ).toBe(true);
  });

  it('stores USD amounts in integer minor units', () => {
    const result = normalizeShopifyCsv(sampleCsv, {
      currency: 'usd',
    });
    const prices = result.products.flatMap((product) =>
      product.variants.map((variant) => variant.price),
    );

    expect(prices.every((price) => price.currency === 'USD')).toBe(true);
    expect(prices.map((price) => price.amountMinor)).toContain(8000);
    expect(prices.map((price) => price.amountMinor)).toContain(3000);
  });

  it('generates stable, unique internal IDs', () => {
    const first = normalizeShopifyCsv(sampleCsv, {
      currency: 'USD',
      merchantId: 'fixture-merchant',
    });
    const second = normalizeShopifyCsv(sampleCsv, {
      currency: 'USD',
      merchantId: 'fixture-merchant',
    });
    const firstIds = first.products.flatMap((product) => [
      product.id,
      ...product.variants.map((variant) => variant.id),
    ]);
    const secondIds = second.products.flatMap((product) => [
      product.id,
      ...product.variants.map((variant) => variant.id),
    ]);

    expect(new Set(firstIds).size).toBe(firstIds.length);
    expect(secondIds).toEqual(firstIds);
  });

  it('rejects a CSV missing a required header', () => {
    const invalidCsv = [
      'Handle,Title,Published,Option1 Name,Option1 Value,Variant Inventory Qty,Image Src,Status',
      'sample,Sample,true,Size,M,1,https://example.com/image.jpg,active',
    ].join('\n');
    const result = normalizeShopifyCsv(invalidCsv, {
      currency: 'USD',
    });

    expect(result.products).toEqual([]);
    expect(result.report.issues).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        code: 'MISSING_REQUIRED_HEADER',
        message: 'Required CSV header is missing: Variant Price',
      }),
    );
  });

  it('rejects duplicate option combinations within a product', () => {
    const duplicateCsv = [
      'Handle,Title,Published,Option1 Name,Option1 Value,Variant Inventory Qty,Variant Price,Image Src,Status',
      'sample,Sample,true,Size,M,1,10.00,https://example.com/image.jpg,active',
      'sample,,,,M,2,10.00,,',
    ].join('\n');
    const result = normalizeShopifyCsv(duplicateCsv, {
      currency: 'USD',
    });

    expect(result.products).toHaveLength(1);
    expect(result.products[0]?.variants).toHaveLength(1);
    expect(result.report.duplicateVariantKeys).toBe(1);
    expect(result.report.skippedVariants).toBe(1);
    expect(result.report.issues).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        code: 'DUPLICATE_VARIANT',
        handle: 'sample',
      }),
    );
  });

  it('reports and skips malformed prices', () => {
    const invalidPriceCsv = [
      'Handle,Title,Published,Option1 Name,Option1 Value,Variant Inventory Qty,Variant Price,Image Src,Status',
      'sample,Sample,true,Size,M,1,ten dollars,https://example.com/image.jpg,active',
    ].join('\n');
    const result = normalizeShopifyCsv(invalidPriceCsv, {
      currency: 'USD',
    });

    expect(result.products).toEqual([]);
    expect(result.report.skippedProducts).toBe(1);
    expect(result.report.skippedVariants).toBe(1);
    expect(result.report.issues).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        code: 'INVALID_PRICE',
        handle: 'sample',
      }),
    );
  });

  it('reports malformed image URLs without rejecting valid variants', () => {
    const invalidImageCsv = [
      'Handle,Title,Published,Option1 Name,Option1 Value,Variant Inventory Qty,Variant Price,Image Src,Status',
      'sample,Sample,true,Size,M,1,10.00,not-a-url,active',
    ].join('\n');
    const result = normalizeShopifyCsv(invalidImageCsv, {
      currency: 'USD',
    });

    expect(result.products).toHaveLength(1);
    expect(result.products[0]?.images).toEqual([]);
    expect(result.products[0]?.variants).toHaveLength(1);
    expect(result.report.malformedImageUrls).toBe(1);
    expect(result.report.productsWithoutImages).toBe(1);
    expect(result.report.issues).toContainEqual(
      expect.objectContaining({
        severity: 'warning',
        code: 'INVALID_IMAGE_URL',
        handle: 'sample',
      }),
    );
  });

  it('rejects invalid currency configuration', () => {
    expect(() =>
      normalizeShopifyCsv(sampleCsv, {
        currency: '$',
      }),
    ).toThrow('Currency must be a three-letter ISO code');
  });
});
