import { createHash } from 'node:crypto';

import {
  canonicalProductSchema,
  type CanonicalProduct,
  type CanonicalVariant,
  type ProductImage,
  type ProductStatus,
  type VariantOption,
} from '@suitly/core';
import { parse } from 'csv-parse/sync';

import type {
  IngestionIssue,
  IngestionReport,
  NormalizationResult,
  NormalizeShopifyCsvOptions,
} from './types.js';

type CsvRow = Record<string, string>;

type IndexedRow = {
  row: CsvRow;
  lineNumber: number;
};

const requiredHeaders = [
  'Handle',
  'Title',
  'Published',
  'Option1 Name',
  'Option1 Value',
  'Variant Inventory Qty',
  'Variant Price',
  'Image Src',
  'Status',
] as const;

export function normalizeShopifyCsv(
  csv: string,
  options: NormalizeShopifyCsvOptions,
): NormalizationResult {
  const issues: IngestionIssue[] = [];
  const currency = normalizeCurrency(options.currency);
  const rows = parseCsv(csv);
  const headers = rows[0] === undefined ? [] : Object.keys(rows[0].row);

  for (const header of requiredHeaders) {
    if (!headers.includes(header)) {
      issues.push({
        severity: 'error',
        code: 'MISSING_REQUIRED_HEADER',
        message: `Required CSV header is missing: ${header}`,
      });
    }
  }

  if (issues.some((issue) => issue.code === 'MISSING_REQUIRED_HEADER')) {
    return {
      products: [],
      report: createReport({
        currency,
        totalRows: rows.length,
        issues,
        sourceFile: options.sourceFile,
      }),
    };
  }

  const groupedRows = new Map<string, IndexedRow[]>();
  let skippedRows = 0;

  for (const indexedRow of rows) {
    const handle = value(indexedRow.row, 'Handle');
    if (handle === undefined) {
      skippedRows += 1;
      issues.push({
        severity: 'error',
        code: 'MISSING_HANDLE',
        message: 'Row was skipped because Handle is empty.',
        row: indexedRow.lineNumber,
      });
      continue;
    }

    const group = groupedRows.get(handle) ?? [];
    group.push(indexedRow);
    groupedRows.set(handle, group);
  }

  const products: CanonicalProduct[] = [];
  let skippedProducts = 0;
  let skippedVariants = 0;
  let duplicateVariantKeys = 0;
  let malformedImageUrls = 0;

  for (const [handle, group] of groupedRows) {
    const productResult = normalizeProduct({
      currency,
      group,
      handle,
      merchantId: options.merchantId ?? 'sample-merchant',
      issues,
    });

    skippedVariants += productResult.skippedVariants;
    duplicateVariantKeys += productResult.duplicateVariantKeys;
    malformedImageUrls += productResult.malformedImageUrls;

    if (productResult.product === undefined) {
      skippedProducts += 1;
      continue;
    }

    products.push(productResult.product);
  }

  const parsedVariants = products.reduce(
    (count, product) => count + product.variants.length,
    0,
  );
  const availableVariants = products.reduce(
    (count, product) =>
      count + product.variants.filter((variant) => variant.available).length,
    0,
  );

  return {
    products,
    report: {
      ...createReport({
        currency,
        totalRows: rows.length,
        issues,
        sourceFile: options.sourceFile,
      }),
      parsedProducts: products.length,
      parsedVariants,
      availableVariants,
      unavailableVariants: parsedVariants - availableVariants,
      skippedRows,
      skippedProducts,
      skippedVariants,
      productsWithoutImages: products.filter(
        (product) => product.images.length === 0,
      ).length,
      productsWithoutCategory: products.filter(
        (product) => product.productCategory === undefined,
      ).length,
      productsWithoutType: products.filter(
        (product) => product.productType === undefined,
      ).length,
      variantsWithoutSku: products.reduce(
        (count, product) =>
          count +
          product.variants.filter((variant) => variant.sku === undefined)
            .length,
        0,
      ),
      variantsWithoutExternalId: parsedVariants,
      variantsWithoutSize: products.reduce(
        (count, product) =>
          count +
          product.variants.filter((variant) => variant.size === undefined)
            .length,
        0,
      ),
      variantsWithoutColour: products.reduce(
        (count, product) =>
          count +
          product.variants.filter((variant) => variant.colour === undefined)
            .length,
        0,
      ),
      duplicateVariantKeys,
      malformedImageUrls,
    },
  };
}

function parseCsv(csv: string): IndexedRow[] {
  const records = parse(csv, {
    bom: true,
    columns: true,
    relax_column_count: false,
    skip_empty_lines: true,
    trim: false,
  }) as CsvRow[];

  return records.map((row, index) => ({
    row,
    lineNumber: index + 2,
  }));
}

function normalizeProduct(input: {
  currency: string;
  group: IndexedRow[];
  handle: string;
  merchantId: string;
  issues: IngestionIssue[];
}): {
  product?: CanonicalProduct;
  skippedVariants: number;
  duplicateVariantKeys: number;
  malformedImageUrls: number;
} {
  const { currency, group, handle, merchantId, issues } = input;
  const title = inheritedValue(group, 'Title');

  if (title === undefined) {
    issues.push({
      severity: 'error',
      code: 'MISSING_TITLE',
      handle,
      message: 'Product was skipped because no title exists in its row group.',
    });
    return {
      skippedVariants: group.length,
      duplicateVariantKeys: 0,
      malformedImageUrls: 0,
    };
  }

  const published = parseBoolean(inheritedValue(group, 'Published'));
  const status = normalizeStatus(inheritedValue(group, 'Status'));
  const optionNames = [1, 2, 3].map((index) =>
    inheritedValue(group, `Option${index} Name`),
  );
  const imagesResult = collectImages(group, handle, issues);
  const variants: CanonicalVariant[] = [];
  const variantKeys = new Set<string>();
  let skippedVariants = 0;
  let duplicateVariantKeys = 0;

  for (const indexedRow of group) {
    const variantResult = normalizeVariant({
      currency,
      handle,
      indexedRow,
      optionNames,
      productActive: published && status === 'active',
      issues,
    });

    if (variantResult === undefined) {
      skippedVariants += 1;
      continue;
    }

    const variantKey = variantResult.options
      .map(
        (option) =>
          `${option.name.toLowerCase()}=${option.value.toLowerCase()}`,
      )
      .join('|');

    if (variantKeys.has(variantKey)) {
      duplicateVariantKeys += 1;
      skippedVariants += 1;
      issues.push({
        severity: 'error',
        code: 'DUPLICATE_VARIANT',
        handle,
        row: indexedRow.lineNumber,
        message: `Duplicate variant option combination: ${variantKey}`,
      });
      continue;
    }

    variantKeys.add(variantKey);
    variants.push(variantResult);
  }

  const productCandidate = compact({
    id: stableId('prd', `shopify_csv:${merchantId}:${handle}`),
    merchantId,
    source: 'shopify_csv' as const,
    handle,
    title,
    descriptionHtml: inheritedValue(group, 'Body (HTML)'),
    descriptionText: stripHtml(inheritedValue(group, 'Body (HTML)')),
    vendor: inheritedValue(group, 'Vendor'),
    productCategory: inheritedValue(group, 'Product Category'),
    productType: inheritedValue(group, 'Type'),
    tags: parseTags(inheritedValue(group, 'Tags')),
    published,
    status,
    images: imagesResult.images,
    variants,
  });

  if (productCandidate.productCategory === undefined) {
    issues.push({
      severity: 'warning',
      code: 'MISSING_CATEGORY',
      handle,
      message: 'Product Category is missing.',
    });
  }

  if (productCandidate.productType === undefined) {
    issues.push({
      severity: 'warning',
      code: 'MISSING_TYPE',
      handle,
      message: 'Product Type is missing.',
    });
  }

  const parsedProduct = canonicalProductSchema.safeParse(productCandidate);
  if (!parsedProduct.success) {
    issues.push({
      severity: 'error',
      code: 'INVALID_PRODUCT',
      handle,
      message: parsedProduct.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; '),
    });
    return {
      skippedVariants: skippedVariants + variants.length,
      duplicateVariantKeys,
      malformedImageUrls: imagesResult.malformedImageUrls,
    };
  }

  return {
    product: parsedProduct.data,
    skippedVariants,
    duplicateVariantKeys,
    malformedImageUrls: imagesResult.malformedImageUrls,
  };
}

function normalizeVariant(input: {
  currency: string;
  handle: string;
  indexedRow: IndexedRow;
  optionNames: Array<string | undefined>;
  productActive: boolean;
  issues: IngestionIssue[];
}): CanonicalVariant | undefined {
  const { currency, handle, indexedRow, optionNames, productActive, issues } =
    input;
  const options = collectOptions(indexedRow.row, optionNames);
  const priceValue = value(indexedRow.row, 'Variant Price');

  if (priceValue === undefined) {
    issues.push({
      severity: 'error',
      code: 'MISSING_PRICE',
      handle,
      row: indexedRow.lineNumber,
      message: 'Variant was skipped because Variant Price is empty.',
    });
    return undefined;
  }

  const amountMinor = parseUsdMinorUnits(priceValue);
  if (amountMinor === undefined) {
    issues.push({
      severity: 'error',
      code: 'INVALID_PRICE',
      handle,
      row: indexedRow.lineNumber,
      message: `Variant Price is invalid for USD: ${priceValue}`,
    });
    return undefined;
  }

  const quantity = parseInteger(value(indexedRow.row, 'Variant Inventory Qty'));
  const sku = value(indexedRow.row, 'Variant SKU');
  const barcode = value(indexedRow.row, 'Variant Barcode');
  const tracker = value(indexedRow.row, 'Variant Inventory Tracker');
  const policy = value(indexedRow.row, 'Variant Inventory Policy');
  const variantImage = validHttpUrl(value(indexedRow.row, 'Variant Image'));
  const weightGrams = parseNonNegativeNumber(
    value(indexedRow.row, 'Variant Grams'),
  );

  if (sku === undefined) {
    issues.push({
      severity: 'warning',
      code: 'MISSING_SKU',
      handle,
      row: indexedRow.lineNumber,
      message: 'Variant SKU is missing.',
    });
  }

  issues.push({
    severity: 'warning',
    code: 'MISSING_EXTERNAL_ID',
    handle,
    row: indexedRow.lineNumber,
    message:
      'CSV contains no external variant ID; an internal ID was generated.',
  });

  const optionIdentity = options
    .map((option) => `${option.name}:${option.value}`)
    .join('|');
  const size = findOption(options, ['size']);
  const colour = findOption(options, ['color', 'colour']);

  return compact({
    id: stableId('var', `shopify_csv:${handle}:${optionIdentity}`),
    sku,
    barcode,
    options,
    size,
    colour,
    price: {
      amountMinor,
      currency,
    },
    inventory: compact({
      tracker,
      quantity,
      policy,
    }),
    available: productActive && (quantity ?? 0) > 0,
    imageUrl: variantImage,
    weightGrams,
  });
}

function collectOptions(
  row: CsvRow,
  optionNames: Array<string | undefined>,
): VariantOption[] {
  const options: VariantOption[] = [];

  for (const [offset, name] of optionNames.entries()) {
    const optionValue = value(row, `Option${offset + 1} Value`);
    if (name !== undefined && optionValue !== undefined) {
      options.push({ name, value: optionValue });
    }
  }

  return options;
}

function collectImages(
  group: IndexedRow[],
  handle: string,
  issues: IngestionIssue[],
): { images: ProductImage[]; malformedImageUrls: number } {
  const images = new Map<string, ProductImage>();
  let malformedImageUrls = 0;

  for (const indexedRow of group) {
    const rawUrl = value(indexedRow.row, 'Image Src');
    if (rawUrl === undefined) {
      continue;
    }

    const url = validHttpUrl(rawUrl);
    if (url === undefined) {
      malformedImageUrls += 1;
      issues.push({
        severity: 'warning',
        code: 'INVALID_IMAGE_URL',
        handle,
        row: indexedRow.lineNumber,
        message: `Image Src is not a valid HTTP(S) URL: ${rawUrl}`,
      });
      continue;
    }

    if (!images.has(url)) {
      images.set(
        url,
        compact({
          url,
          position: parsePositiveInteger(
            value(indexedRow.row, 'Image Position'),
          ),
          altText: value(indexedRow.row, 'Image Alt Text'),
        }),
      );
    }
  }

  return {
    images: [...images.values()].sort(
      (left, right) =>
        (left.position ?? Number.MAX_SAFE_INTEGER) -
        (right.position ?? Number.MAX_SAFE_INTEGER),
    ),
    malformedImageUrls,
  };
}

function createReport(input: {
  currency: string;
  totalRows: number;
  issues: IngestionIssue[];
  sourceFile: string | undefined;
}): IngestionReport {
  return compact({
    sourceFile: input.sourceFile,
    currency: input.currency,
    totalRows: input.totalRows,
    parsedProducts: 0,
    parsedVariants: 0,
    availableVariants: 0,
    unavailableVariants: 0,
    skippedRows: 0,
    skippedProducts: 0,
    skippedVariants: 0,
    productsWithoutImages: 0,
    productsWithoutCategory: 0,
    productsWithoutType: 0,
    variantsWithoutSku: 0,
    variantsWithoutExternalId: 0,
    variantsWithoutSize: 0,
    variantsWithoutColour: 0,
    duplicateVariantKeys: 0,
    malformedImageUrls: 0,
    issues: input.issues,
  });
}

function inheritedValue(
  group: IndexedRow[],
  column: string,
): string | undefined {
  for (const indexedRow of group) {
    const candidate = value(indexedRow.row, column);
    if (candidate !== undefined) {
      return candidate;
    }
  }
  return undefined;
}

function value(row: CsvRow, column: string): string | undefined {
  const candidate = row[column]?.trim();
  return candidate === undefined || candidate.length === 0
    ? undefined
    : candidate;
}

function normalizeCurrency(currency: string): string {
  const normalized = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new Error(`Currency must be a three-letter ISO code: ${currency}`);
  }
  return normalized;
}

function normalizeStatus(status: string | undefined): ProductStatus {
  if (status === 'active' || status === 'draft' || status === 'archived') {
    return status;
  }
  return 'unknown';
}

function parseBoolean(input: string | undefined): boolean {
  return input?.toLowerCase() === 'true';
}

function parseTags(input: string | undefined): string[] {
  if (input === undefined) {
    return [];
  }
  return [
    ...new Set(
      input
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
}

function parseUsdMinorUnits(input: string): number | undefined {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(input);
  if (match === null) {
    return undefined;
  }

  const dollars = Number(match[1]);
  const cents = Number((match[2] ?? '').padEnd(2, '0'));
  const result = dollars * 100 + cents;
  return Number.isSafeInteger(result) ? result : undefined;
}

function parseInteger(input: string | undefined): number | undefined {
  if (input === undefined || !/^-?\d+$/.test(input)) {
    return undefined;
  }
  const parsed = Number(input);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function parsePositiveInteger(input: string | undefined): number | undefined {
  const parsed = parseInteger(input);
  return parsed !== undefined && parsed > 0 ? parsed : undefined;
}

function parseNonNegativeNumber(input: string | undefined): number | undefined {
  if (input === undefined || input.length === 0) {
    return undefined;
  }
  const parsed = Number(input);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function validHttpUrl(input: string | undefined): string | undefined {
  if (input === undefined) {
    return undefined;
  }
  try {
    const url = new URL(input);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function findOption(
  options: VariantOption[],
  names: string[],
): string | undefined {
  return options.find((option) =>
    names.includes(option.name.trim().toLowerCase()),
  )?.value;
}

function stripHtml(input: string | undefined): string | undefined {
  if (input === undefined) {
    return undefined;
  }
  const text = input
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 0 ? text : undefined;
}

function stableId(prefix: string, input: string): string {
  const digest = createHash('sha256').update(input).digest('hex').slice(0, 20);
  return `${prefix}_${digest}`;
}

type Compact<T extends Record<string, unknown>> = {
  [Key in keyof T as undefined extends T[Key] ? never : Key]: T[Key];
} & {
  [Key in keyof T as undefined extends T[Key] ? Key : never]?: Exclude<
    T[Key],
    undefined
  >;
};

function compact<T extends Record<string, unknown>>(input: T): Compact<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, entry]) => entry !== undefined),
  ) as Compact<T>;
}
