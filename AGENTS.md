# Suitly Engineering Instructions

This repository implements Suitly, a platform-neutral AI fashion
recommendation system. Read `docs/system-architecture.md` and `suitly.md`
completely before making architectural or implementation changes.

## Source of truth

- `docs/system-architecture.md` contains the accepted system design.
- `suitly.md` contains the original product and MVP specification.
- When the files differ, preserve the platform-neutral boundaries and
  performance decisions in `docs/system-architecture.md`, then report the
  conflict before changing product behaviour.

## Required working method

1. Work one milestone at a time.
2. Before editing, summarize the current milestone and intended files.
3. Inspect real external data before finalizing parsers or mappings.
4. Keep changes inside the active milestone.
5. Add proportionate tests with every milestone.
6. Run formatting, linting, type checking, and tests before handoff.
7. Record meaningful architectural changes in `docs/decisions/`.
8. Do not introduce postponed infrastructure without measured evidence.

## Platform boundaries

- Shopify is a connector, not the core architecture.
- Commerce-specific logic belongs in `connectors/` or connector packages.
- All connectors must map data into canonical Suitly product and variant
  schemas.
- Catalogue, recommendation, and AI modules must not import a
  platform-specific connector.
- Storefront integrations must work through the public API/SDK and must not
  assume the merchant uses Next.js.

## Recommendation and AI rules

- Keep AI provider calls behind interfaces.
- Keep model identifiers, prompts, schema versions, and thresholds
  configurable.
- Validate every external input and AI output with strict schemas.
- Never trust AI-generated product IDs, variant IDs, prices, images, URLs,
  sizes, colours, or availability.
- Hydrate all commerce facts from the validated local catalogue.
- Precompute and cache product intelligence.
- Do not analyse product images on the shopper request path.
- Prefer one shopper-facing multimodal AI call unless evaluation demonstrates
  that another design is materially better.
- Limit AI ranking input to a compact set of eligible candidates.
- Provide a deterministic fallback when AI output is invalid or unavailable.
- Separate style confidence from size confidence.
- Withhold confident size guidance when catalogue evidence is insufficient.
- Do not infer identity or sensitive personal attributes.

## Performance rules

- Do not make live commerce-platform calls while generating recommendations.
- Resize and compress shopper images before AI processing.
- Keep raw photographs in private temporary storage only.
- Delete photographs automatically, including after failed analysis.
- Cache merchant configuration and enriched candidate representations.
- Track p50, p95, and p99 latency and AI cost per successful recommendation.
- Do not rely on sleeping free-tier infrastructure for customer production.
- Add Redis, vector search, queues, workers, or services only when measurements
  justify them.

## Technology defaults

- TypeScript in strict mode
- Next.js for the initial web application and thin API layer
- Framework-independent packages for core business logic
- PostgreSQL as the catalogue and recommendation source of truth
- Drizzle ORM
- Zod validation
- Private S3-compatible object storage
- Vitest, with Playwright for useful end-to-end scenarios
- Structured logs and latency/error monitoring

Avoid `any` unless it is narrowly contained and documented. Do not place
secrets in client code, source files, logs, or committed environment files.

## MVP delivery order

1. Inspect the supplied catalogue.
2. Normalize and validate products and variants.
3. Enrich a small product set asynchronously.
4. Implement the private temporary-photo flow.
5. Implement filtering, scoring, AI ranking, validation, and fallback.
6. Build the internal shopper UI and feedback capture.
7. Evaluate against non-photo baselines.
8. Build the universal storefront SDK/API.
9. Add Shopify as the first live connector only after quality validation.

Do not begin billing, public app-store submission, custom model training,
virtual try-on, multiple apparel categories, microservices, Kubernetes,
MediaPipe, or a vector database during the initial MVP unless the user
explicitly changes the accepted scope.
