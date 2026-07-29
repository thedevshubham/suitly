import type { CanonicalProduct } from '@suitly/core';

export type ProductPage = {
  products: CanonicalProduct[];
  nextCursor?: string;
};

export interface CommerceConnector {
  readonly platform: string;
  listProducts(cursor?: string): Promise<ProductPage>;
  getProduct(id: string): Promise<CanonicalProduct | undefined>;
}

export type CatalogueChange =
  | { type: 'upsert'; externalProductId: string }
  | { type: 'delete'; externalProductId: string };
