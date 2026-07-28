# ADR 0003: Deterministic recommendation is the MVP default

- Status: Accepted
- Date: 2026-07-28

## Context

The MVP must remain local-only while delivering a responsive shopper
experience. A combined `qwen3.5:4b` request that analysed the shopper image and
ranked eight catalogue candidates took 48–68 seconds in controlled local runs.
The model also produced score-scale errors and recommendations inconsistent
with its own shopper profile until additional validation rejected them.

The standalone optimized shopper-photo flow is substantially faster, measuring
about 5.9 seconds warm and 14.9 seconds cold on the same development machine.
Catalogue eligibility and product facts are already deterministic.

## Decision

The default MVP flow will:

1. analyse the shopper image once with local Qwen;
2. filter and score products deterministically using the resulting
   non-sensitive geometry profile and canonical catalogue data;
3. hydrate all recommendation facts locally; and
4. use conservative size confidence unless merchant size-chart evidence is
   available.

The combined comparative Qwen ranker remains an experimental provider behind
strict output validation and deterministic fallback. It is not enabled on the
interactive storefront path.

## Consequences

- Shopper latency is bounded primarily by one local photo-analysis request.
- Recommendations remain reproducible, inspectable, and available if model
  ranking fails.
- Catalogue identifiers, availability, price, media, and variants cannot be
  invented by a model.
- The MVP sacrifices some potential model-based comparative nuance until
  evaluation data and faster hardware justify enabling it.
