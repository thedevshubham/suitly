# Product Intelligence Evaluation

**Date:** 2026-07-27

**Dataset:** `store-products-sample.csv`

**Accepted model:** `gemini-3-flash-preview`

**Prompt version:** `product-intelligence-v1`

## Outcome

The product-intelligence pipeline produced and cached valid structured results
for 19 of the 20 normalized sample products.

| Metric                        | Result |
| ----------------------------- | -----: |
| Normalized products           |     20 |
| Valid enriched products       |     19 |
| Coverage                      |    95% |
| Schema-validation failures    |      0 |
| Results below 0.60 confidence |      0 |
| Pending provider-quota items  |      1 |

`floral-white-top` remains pending. Gemini 3 Flash reported that the project's
free-tier daily allowance of 20 requests had been reached. A targeted attempt
with `gemini-3.5-flash-lite` also returned `DEADLINE_EXCEEDED`. This is an
external availability/quota issue, not a schema or catalogue validation
failure.

After the quota resets, retry only that product while preserving the other
cached results:

```bash
PRODUCT_INTELLIGENCE_MODEL=gemini-3-flash-preview \
  corepack pnpm exec tsx packages/ai/src/cli.ts \
  --input data/generated/products.normalized.json \
  --products data/generated/products.enriched.json \
  --report data/generated/product-enrichment-report.json \
  --offset 16 \
  --limit 1
```

## Category distribution

| Category | Products |
| -------- | -------: |
| Jacket   |        8 |
| Top      |        4 |
| Shirt    |        3 |
| Bag      |        1 |
| Jumper   |        1 |
| Shoes    |        1 |
| T-shirt  |        1 |

The distribution totals 19 enriched products.

## Manual review

The structured outputs are schema-valid and generally consistent with the
catalogue descriptions and images. Three findings need product-level or
dataset-level review:

1. `striped-skirt-and-top` is a coordinated set, but the current single-category
   schema classifies it as `top`. The MVP should either exclude coordinated sets
   or later support a `set` category.
2. `dark-denim-top` is classified as `jacket`. Its description and visible
   construction can reasonably support either a heavy top or a lightweight
   jacket, so it should remain a manual-review example.
3. All valid results report confidence between 0.85 and 1.00. Schema validity is
   proven, but confidence calibration is not. Confidence thresholds must be
   evaluated against human-labelled examples before they drive automation.

## MVP dataset suitability

The supplied sample is useful for testing platform-neutral ingestion and broad
product classification, but it does not match the accepted narrow MVP
evaluation scope:

- only one enriched product is classified as a T-shirt;
- that product description identifies it as a women's product;
- the catalogue contains shoes, a bag, jackets, shirts, tops, a jumper, and a
  coordinated set;
- no merchant-supplied product category is present in the normalized source.

We should not use this dataset alone to judge recommendation quality for the
planned men's T-shirt MVP. Before recommendation evaluation, add a small,
human-labelled men's T-shirt fixture with varied fits, shoulder construction,
length, neckline, fabric weight, colour, and available sizes.

## Operational findings

The first full-catalogue command exposed free-tier and provider reliability
constraints. The batch runner now:

- writes a checkpoint after each processed product;
- resumes unchanged products from the content-hash cache;
- limits Gemini requests to 60 seconds and two attempts;
- supports free-tier request pacing;
- supports `--offset` and `--limit` for targeted retries;
- preserves cached products outside a targeted retry range.

Product intelligence remains asynchronous and outside the shopper request path,
so these batch latencies do not affect storefront response time.

## Acceptance decision

Accept the 19 schema-valid results as the current local enrichment cache.
Keep `floral-white-top` pending until quota allows a successful structured
result. Do not manually invent its intelligence record.

The pipeline is suitable to become the catalogue-intelligence input for the
next recommendation milestone, but recommendation-quality evaluation must wait
for a category-appropriate, human-labelled T-shirt dataset.
