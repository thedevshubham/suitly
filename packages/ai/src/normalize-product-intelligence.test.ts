import type { ProductIntelligence } from '@suitly/core';
import { describe, expect, it } from 'vitest';

import { normalizeProductIntelligence } from './normalize-product-intelligence.js';

const intelligence: ProductIntelligence = {
  category: 't-shirt',
  fit: 'regular',
  shoulderConstruction: 'standard',
  silhouette: 'straight',
  length: 'standard',
  neckline: 'crew',
  sleeveFit: 'regular',
  fabricWeight: 'medium',
  stretch: 'low',
  styleContexts: ['casual'],
  visualEffects: ['Creates a straight torso line.'],
  confidence: 0.85,
  evidence: ['description'],
};

describe('normalizeProductIntelligence', () => {
  it('marks garment-only attributes as not applicable for shoes', () => {
    expect(
      normalizeProductIntelligence({
        ...intelligence,
        category: 'shoes',
      }),
    ).toMatchObject({
      fit: 'unknown',
      shoulderConstruction: 'not-applicable',
      silhouette: 'not-applicable',
      length: 'not-applicable',
      neckline: 'not-applicable',
      sleeveFit: 'not-applicable',
      fabricWeight: 'not-applicable',
      stretch: 'not-applicable',
    });
  });

  it('marks upper-body attributes as not applicable for skirts', () => {
    expect(
      normalizeProductIntelligence({
        ...intelligence,
        category: 'skirt',
      }),
    ).toMatchObject({
      shoulderConstruction: 'not-applicable',
      neckline: 'not-applicable',
      sleeveFit: 'not-applicable',
      silhouette: 'straight',
      length: 'standard',
    });
  });

  it('preserves upper-body garment intelligence', () => {
    expect(normalizeProductIntelligence(intelligence)).toEqual(intelligence);
  });

  it('changes invalid not-applicable upper-garment fields to unknown', () => {
    expect(
      normalizeProductIntelligence({
        ...intelligence,
        shoulderConstruction: 'not-applicable',
        neckline: 'not-applicable',
      }),
    ).toMatchObject({
      shoulderConstruction: 'unknown',
      neckline: 'unknown',
    });
  });
});
