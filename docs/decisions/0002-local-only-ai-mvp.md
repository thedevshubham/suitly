# ADR 0002: Local-Only AI for the MVP

**Status:** Accepted

**Date:** 2026-07-28

## Context

Gemini demonstrated that cloud models can produce useful structured product
intelligence, but its free tier introduced daily request limits and intermittent
deadlines. The local Qwen evaluation enriched all 20 sample products without a
provider failure or external quota.

Suitly also processes shopper photographs. Avoiding third-party AI transfer
during the MVP simplifies privacy control, although production still requires
an always-on model host rather than a developer laptop.

## Decision

Operate the MVP in local-only AI mode.

- Ollama is the active runtime.
- `qwen3.5:4b` is the image-and-text model candidate.
- `llama3.2:latest` is the text-only fallback candidate.
- Cloud provider implementations stay in the repository for controlled
  comparisons but are disabled by default.
- A cloud call requires the explicit configuration
  `ENABLE_CLOUD_AI_PROVIDERS=true`.
- Every model output remains schema-validated and subject to deterministic
  fallback.
- Qwen must pass shopper-photo quality and latency evaluation before it is used
  on the customer request path.

## Consequences

Development has no AI API charge or provider quota, and product/shopper images
do not need to be sent to a third-party model API.

Suitly becomes responsible for model hosting, capacity, concurrency,
observability, upgrades, and production availability. The current MacBook
benchmark is suitable for asynchronous catalogue enrichment but does not prove
acceptable shopper-facing latency.
