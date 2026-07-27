import type { CanonicalProduct } from '@suitly/core';

export type IngestionIssueSeverity = 'warning' | 'error';

export type IngestionIssueCode =
  | 'MISSING_REQUIRED_HEADER'
  | 'MISSING_HANDLE'
  | 'MISSING_TITLE'
  | 'MISSING_PRICE'
  | 'INVALID_PRICE'
  | 'INVALID_IMAGE_URL'
  | 'DUPLICATE_VARIANT'
  | 'MISSING_CATEGORY'
  | 'MISSING_TYPE'
  | 'MISSING_SKU'
  | 'MISSING_EXTERNAL_ID'
  | 'MISSING_CURRENCY_SOURCE'
  | 'COLOUR_CONFLICT'
  | 'INVALID_PRODUCT';

export type IngestionIssue = {
  severity: IngestionIssueSeverity;
  code: IngestionIssueCode;
  message: string;
  row?: number;
  handle?: string;
};

export type IngestionReport = {
  sourceFile?: string;
  currency: string;
  totalRows: number;
  parsedProducts: number;
  parsedVariants: number;
  availableVariants: number;
  unavailableVariants: number;
  skippedRows: number;
  skippedProducts: number;
  skippedVariants: number;
  productsWithoutImages: number;
  productsWithoutCategory: number;
  productsWithoutType: number;
  variantsWithoutSku: number;
  variantsWithoutExternalId: number;
  variantsWithoutSize: number;
  variantsWithoutColour: number;
  duplicateVariantKeys: number;
  malformedImageUrls: number;
  issues: IngestionIssue[];
};

export type NormalizationResult = {
  products: CanonicalProduct[];
  report: IngestionReport;
};

export type NormalizeShopifyCsvOptions = {
  currency: string;
  merchantId?: string;
  sourceFile?: string;
};
