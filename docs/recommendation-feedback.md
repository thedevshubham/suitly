# Recommendation feedback and evaluation

## Purpose

The MVP must measure whether its recommendations are useful rather than rely on
plausible-looking output. Each completed recommendation can therefore collect
one of three simple shopper signals per product:

- `liked`
- `disliked`
- `would-buy`

## Event trail

Local development events are appended to:

```text
data/generated/recommendation-evaluation.jsonl
```

The file is ignored by Git. A recommendation event contains:

- recommendation ID;
- merchant ID;
- selected catalogue audience and category;
- returned product IDs;
- photo validity status;
- deterministic fallback usage;
- total request latency; and
- timestamp.

A feedback event contains only the recommendation ID, product ID, selected
feedback value, and timestamp.

The event trail does not contain the shopper photo, photo path, height, weight,
visual profile, product image, or identity information. Feedback is accepted
only when the product ID belongs to the referenced recorded recommendation.

JSONL is intentionally limited to the local single-process MVP. Production
must use the application database with retention rules, access controls, and
concurrency-safe writes.

## Local report

After using the demo and submitting feedback, run:

```bash
corepack pnpm report:evaluation
```

The summary includes:

- recommendation count;
- valid-photo and fallback counts;
- p50, p95, and maximum latency;
- liked, disliked, and would-buy totals; and
- feedback grouped by product.

The report becomes meaningful only after multiple representative shopper cases
have been collected. It is an evaluation aid, not evidence of recommendation
quality by itself.

## Dashboard

While the local web application is running, open:

```text
http://localhost:3000/evaluation
```

The read-only dashboard displays the same privacy-limited event trail as metric
cards, shopper-signal bars, latency percentiles, fallback usage, and
catalogue-hydrated product feedback. Use Refresh data after completing new
shopper sessions.
