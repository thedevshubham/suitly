# ADR 0001: Local Ollama for Development Product Intelligence

**Status:** Accepted

**Date:** 2026-07-28

## Context

Gemini successfully enriched the sample catalogue but introduced free-tier
daily quotas and intermittent provider deadlines. Suitly already isolates AI
providers behind `ProductIntelligenceProvider`.

The development machine has `qwen3.5:4b`, a vision model, and
`llama3.2:latest`, a text-only model, available through Ollama.

## Decision

Add Ollama as a product-intelligence provider.

- Use `qwen3.5:4b` as the default local development model for asynchronous,
  image-aware product enrichment.
- Keep Gemini and OpenAI implementations available.
- Use `llama3.2:latest` only as an optional text-only fallback.
- Continue validating every result with the canonical Zod schema and
  deterministic category-applicability rules.
- Keep provider/model/prompt metadata in the content-hash cache boundary.
- Do not adopt local Qwen as the production recommendation authority without a
  human-labelled evaluation.

## Consequences

Local development enrichment has no per-request charge, daily quota, or
third-party image transfer. On the current machine, Qwen averages approximately
25 seconds per product, which is acceptable for asynchronous catalogue work but
not a shopper request path.

Provider agreement is strong for category and weaker for detailed garment
attributes. Suitly must collect human-labelled evaluation data before
automating low-agreement fields or trusting model confidence.
