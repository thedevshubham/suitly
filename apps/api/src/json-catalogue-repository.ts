import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  canonicalProductSchema,
  productIntelligenceSchema,
} from '@suitly/core';
import { z } from 'zod';

import type { CatalogueRepository } from './types.js';

const enrichedCatalogueSchema = z.array(
  z.object({
    product: canonicalProductSchema,
    intelligence: productIntelligenceSchema,
  }),
);

export class JsonCatalogueRepository implements CatalogueRepository {
  private cataloguePromise:
    | ReturnType<JsonCatalogueRepository['readCatalogue']>
    | undefined;

  public constructor(private readonly path: string) {}

  public async loadEnrichedProducts(merchantId: string) {
    this.cataloguePromise ??= this.readCatalogue();
    const catalogue = await this.cataloguePromise;
    return catalogue.filter((entry) => entry.product.merchantId === merchantId);
  }

  private async readCatalogue() {
    const contents = await readFile(resolve(this.path), 'utf8');
    return enrichedCatalogueSchema.parse(JSON.parse(contents) as unknown);
  }
}
