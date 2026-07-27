import { createHash } from 'node:crypto';

import type { CanonicalProduct } from '@suitly/core';

export function createProductContentHash(product: CanonicalProduct): string {
  const relevantContent = {
    title: product.title,
    descriptionText: product.descriptionText,
    tags: [...product.tags].sort(),
    productCategory: product.productCategory,
    productType: product.productType,
    images: product.images.map((image) => image.url).sort(),
    options: product.variants
      .flatMap((variant) => variant.options)
      .map((option) => `${option.name}:${option.value}`)
      .sort(),
  };

  return createHash('sha256')
    .update(JSON.stringify(relevantContent))
    .digest('hex');
}
