# Recommendation engine benchmark

## Purpose

This benchmark validates the first end-to-end recommendation path using only
local models and trusted catalogue data. It measures whether a single
multimodal Qwen call can analyse a shopper image and comparatively rank an
eligible product set quickly and reliably enough for a storefront.

## Test setup

- Model: `qwen3.5:4b` through local Ollama
- Shopper image: synthetic full-body fixture
- Shopper input: 178 cm, 75 kg, preferred colour Black
- Requested category: jacket
- Catalogue: normalized and locally enriched sample catalogue
- Eligible candidates after hard filtering: 8
- Hardware: current local development machine

The sample catalogue has important limitations. It contains no size charts,
most available variants are XS, and product image/title colours do not always
agree with the variant colour, which is frequently Black. Variant data remains
the source of truth.

## Implemented pipeline

1. Filter by merchant, publication status, image, category, price, colour, and
   available variants.
2. Score eligible candidates deterministically using colour match, proportion
   compatibility, product-intelligence confidence, size evidence, and
   merchandising data.
3. Optionally send the shopper image, shopper input, and up to 15 scored
   candidates to local Qwen for comparative ranking.
4. Validate every AI product and variant identifier against the candidate set.
5. Reject unavailable, duplicate, profile-inconsistent, high-risk, or
   gendered AI results.
6. Hydrate title, price, currency, image, URL, colour, and size only from the
   trusted catalogue.
7. Fill missing or invalid AI results with deterministic recommendations.

Size confidence is capped at 0.2 while size-chart evidence is absent. The
system does not claim a recommended size from height and weight alone.

## Results

| Prompt | AI latency | Outcome                                                                                                                       |
| ------ | ---------: | ----------------------------------------------------------------------------------------------------------------------------- |
| v1     |     68.2 s | Returned valid IDs but used an incorrect 0–1 score scale and compared products with clothing visible in the photo.            |
| v2     |     48.4 s | Corrected scoring, but contradicted its own silhouette profile, used gendered wording, and emitted high-risk recommendations. |
| v3     |     67.0 s | Safety validation rejected 2 inconsistent recommendations; one AI result and two deterministic fallbacks were returned.       |

The v3 request completed without a provider error. Its accepted AI
recommendation had low fit risk and catalogue-valid identifiers. The complete
request still took 67.0 seconds, which is unsuitable for responsive storefront
engagement on the current machine.

## Decision

The MVP storefront path will use one local shopper-photo analysis call and
then deterministic candidate filtering and ranking. The optimized standalone
photo benchmark previously measured about 5.9 seconds warm and 14.9 seconds
cold, making it the more practical local path.

Combined Qwen photo-plus-catalogue comparative ranking remains implemented as
an experimental, guarded capability. It will not be placed on the default
shopper request path until a representative evaluation set demonstrates
acceptable relevance and materially lower latency. Regardless of provider,
strict validation, local catalogue hydration, and deterministic fallback are
mandatory.

Run the controlled benchmark with:

```bash
corepack pnpm benchmark:recommendation
```

The non-photographic report is written to
`data/generated/recommendation-benchmark.json` and ignored by Git.
