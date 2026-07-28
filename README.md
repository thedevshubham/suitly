# Suitly

Suitly is a platform-neutral AI fashion recommendation system for e-commerce.
It is designed to help shoppers discover real, available products suited to
their preferences, visible proportions, and likely fit.

The product is not tied to a single commerce provider. Shopify is the first
planned live connector, while the core architecture supports WooCommerce,
Adobe Commerce/Magento, BigCommerce, headless commerce, custom APIs, and
catalogue feeds through independent connectors.

## Current status

Suitly has completed the catalogue, local product-intelligence, private
shopper-photo, and recommendation-engine foundations of the MVP. The
recommendation layer now provides deterministic filtering and scoring, guarded
local Qwen comparative ranking, trusted catalogue hydration, and deterministic
fallback.

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
- [Product-intelligence evaluation](docs/product-intelligence-evaluation.md)
- [Ollama product-intelligence evaluation](docs/ollama-product-intelligence-evaluation.md)
- [Local shopper-photo benchmark](docs/shopper-photo-benchmark.md)
- [Recommendation-engine benchmark](docs/recommendation-engine-benchmark.md)
- [ADR: Local Ollama product intelligence](docs/decisions/0001-local-ollama-product-intelligence.md)
- [ADR: Local-only AI MVP](docs/decisions/0002-local-only-ai-mvp.md)
- [ADR: Deterministic recommendation default](docs/decisions/0003-deterministic-recommendation-default.md)
- [Original product specification](suitly.md)
- [Engineering agent instructions](AGENTS.md)

## Technology direction

- TypeScript in strict mode
- Next.js and React for the initial web application
- PostgreSQL and Drizzle ORM
- Zod validation
- Local Ollama models behind provider interfaces
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
`.env.local`, ensure Ollama is running, normalize the sample, and run:

```bash
corepack pnpm enrich:sample:one
```

The command is explicitly limited to one product. It writes cached enriched
products and a failure/low-confidence report under `data/generated/`.

After verifying one product, enrich the complete sample catalogue:

```bash
corepack pnpm enrich:sample
```

The batch checkpoints after every product, so an interrupted run can resume
from its cached results. The CLI also accepts `--offset` and `--limit` for a
targeted retry while preserving the rest of the cache.

### Local Ollama models

Product intelligence can run locally without an API key. Configure Qwen for
image-and-text enrichment:

```env
PRODUCT_INTELLIGENCE_PROVIDER=ollama
PRODUCT_INTELLIGENCE_MODEL=qwen3.5:4b
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_PRODUCT_INTELLIGENCE_VISION=true
```

The installed `llama3.2:latest` model is text-only. Use it as a catalogue-text
fallback by changing the model and disabling vision:

```env
PRODUCT_INTELLIGENCE_MODEL=llama3.2:latest
OLLAMA_PRODUCT_INTELLIGENCE_VISION=false
```

Keep local-model evaluation outputs separate from the accepted Gemini cache by
passing different `--products` and `--report` paths under `data/generated/`.

Cloud provider implementations remain available for intentional evaluation
runs, but they are disabled by default. Enabling one requires both selecting
the provider and setting `ENABLE_CLOUD_AI_PROVIDERS=true`; this prevents an
accidental API call from ordinary MVP development.

### Synthetic shopper-photo benchmark

Run the private local-photo flow against the synthetic test fixture:

```bash
corepack pnpm benchmark:shopper-photo
```

The command validates and sanitizes the image, uses a private temporary file,
analyses it through local Qwen, confirms deletion, and writes a non-photographic
report under `data/generated/`.

### Recommendation benchmark

Run the guarded end-to-end comparative ranker:

```bash
corepack pnpm benchmark:recommendation
```

The benchmark filters and scores candidates, makes one local multimodal Qwen
request, validates its output, hydrates catalogue facts locally, and fills
invalid results deterministically. This combined AI ranker is experimental:
the interactive MVP path uses the faster standalone shopper-photo analysis
followed by deterministic ranking. See the
[benchmark report](docs/recommendation-engine-benchmark.md) for measurements
and the decision rationale.

### Local recommendation API

The framework-independent API handler accepts the planned
`POST /api/recommend` multipart contract. It validates shopper fields, prepares
and deletes the private temporary photo, runs local shopper analysis, filters
and ranks the cached catalogue, and returns trusted recommendation cards.

Run a real local smoke request with the synthetic fixture:

```bash
corepack pnpm smoke:recommend-api
```

The handler uses `data/generated/products.enriched.ollama-qwen.json` and the
Ollama settings from `.env.local`. If local analysis is unavailable, it returns
preference-based deterministic results with an explicit warning.

### Shopper demo

Start the local browser demo:

```bash
corepack pnpm dev:web
```

Then open `http://localhost:3000`. You can upload a compatible full-body photo
or use the included synthetic fixture, enter shopper preferences, and view
three catalogue-grounded recommendation cards. Ollama must be running; warm
requests are substantially faster than cold model starts.

## Privacy

Shopper photographs will be processed through private temporary storage and
deleted automatically after analysis. Suitly must not expose raw photographs
publicly, use them for training without explicit consent, or infer identity and
sensitive personal attributes.

## License

No open-source license has been selected. All rights are reserved unless a
license is added later.
