# Suitly

Suitly is a platform-neutral AI fashion recommendation system for e-commerce.
It is designed to help shoppers discover real, available products suited to
their preferences, visible proportions, and likely fit.

The product is not tied to a single commerce provider. Shopify is the first
planned live connector, while the core architecture supports WooCommerce,
Adobe Commerce/Magento, BigCommerce, headless commerce, custom APIs, and
catalogue feeds through independent connectors.

## Current status

Suitly is in the product-intelligence stage of the MVP. The repository contains
the accepted system design, durable engineering instructions, the
platform-neutral folder structure, canonical catalogue schemas, a tested
Shopify CSV normalizer, and a provider-independent cached product-enrichment
pipeline.

## MVP objective

The first MVP will evaluate whether a shopper's photograph, height, weight, and
colour preferences produce recommendations that are meaningfully better than
ordinary catalogue filtering.

The initial scope is deliberately narrow:

- a small men's T-shirt catalogue;
- catalogue import and normalization;
- asynchronous product intelligence;
- private, temporary shopper-photo analysis;
- deterministic candidate filtering;
- AI-assisted comparative ranking;
- up to three validated product recommendations;
- separate style and size confidence;
- feedback capture and controlled evaluation.

The MVP does not include virtual try-on, custom model training, billing,
multiple apparel categories, or a public commerce-platform app.

## Architecture

```text
Commerce platforms and catalogue feeds
                 |
        Platform connectors
                 |
      Canonical catalogue layer
                 |
       Product intelligence
                 |
Shopper input -> Recommendation engine
                 |
      Universal API and widget
                 |
        Merchant storefront
```

All commerce-platform data is normalized before it reaches the recommendation
engine. AI may analyse products and rank supplied candidates, but catalogue data
remains the source of truth for product IDs, variants, prices, inventory,
images, sizes, colours, and URLs.

See [docs/system-architecture.md](docs/system-architecture.md) for the accepted
system design.

## Repository structure

```text
apps/
  web/                  Next.js MVP and merchant-facing UI
  api/                  Public and internal API
  worker/               Catalogue sync and enrichment jobs

packages/
  core/                 Canonical domain models
  catalogue/            Catalogue normalization and queries
  recommendation/       Filtering, scoring, validation, hydration
  ai/                   AI provider interfaces
  connector-sdk/        Commerce connector contract
  storefront-sdk/       Universal storefront widget and SDK
  database/             Database schema and queries
  observability/        Logging, metrics, and tracing

connectors/
  csv/
  shopify/
  woocommerce/
  magento/
  bigcommerce/
  custom-api/
```

## Documentation

- [System architecture](docs/system-architecture.md)
- [Original product specification](suitly.md)
- [Engineering agent instructions](AGENTS.md)

## Technology direction

- TypeScript in strict mode
- Next.js and React for the initial web application
- PostgreSQL and Drizzle ORM
- Zod validation
- Gemini or OpenAI multimodal APIs behind provider interfaces
- Private S3-compatible temporary image storage
- Vitest and Playwright

Technology choices remain subject to validation through the milestone process
described in the architecture document.

## Development

Requirements:

- Node.js 20 or newer
- Corepack

Install dependencies and run the verification suite:

```bash
corepack pnpm install
corepack pnpm format:check
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
```

Normalize the synthetic Shopify CSV fixture:

```bash
corepack pnpm normalize:sample
```

Generated products and the ingestion report are written to `data/generated/`
and are intentionally ignored by Git.

To run one controlled product-intelligence request, copy `.env.example` to
`.env.local`, select `gemini` or `openai`, add that provider's API key and model,
normalize the sample, and run:

```bash
corepack pnpm enrich:sample:one
```

The command is explicitly limited to one product. It writes cached enriched
products and a failure/low-confidence report under `data/generated/`.

## Privacy

Shopper photographs will be processed through private temporary storage and
deleted automatically after analysis. Suitly must not expose raw photographs
publicly, use them for training without explicit consent, or infer identity and
sensitive personal attributes.

## License

No open-source license has been selected. All rights are reserved unless a
license is added later.
