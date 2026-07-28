# Ollama Product Intelligence Evaluation

**Date:** 2026-07-28

**Local model:** `qwen3.5:4b`

**Comparison model:** `gemini-3-flash-preview`

**Prompt version:** `product-intelligence-v3`

## Outcome

Qwen enriched all 20 normalized sample products locally with images and strict
structured output.

| Metric                        |        Result |
| ----------------------------- | ------------: |
| Products attempted            |            20 |
| Schema-valid results          |            20 |
| Failures                      |             0 |
| Results below 0.60 confidence |             0 |
| Total wall time               | 499.1 seconds |
| Mean product latency          |  24.9 seconds |
| p50 product latency           |  21.5 seconds |
| p95 product latency           |  49.8 seconds |
| Minimum product latency       |  15.1 seconds |
| Maximum product latency       |  57.9 seconds |

This run also successfully enriched `floral-white-top`, the product that could
not be completed through Gemini because of its free-tier quota.

## Gemini comparison

Nineteen products have both Qwen and Gemini results. Gemini is a comparison
baseline, not human-labelled ground truth.

| Attribute             | Exact agreement | Agreement rate |
| --------------------- | --------------: | -------------: |
| Category              |           19/19 |         100.0% |
| Fit                   |           14/19 |          73.7% |
| Shoulder construction |           17/19 |          89.5% |
| Silhouette            |           12/19 |          63.2% |
| Length                |            3/19 |          15.8% |
| Neckline              |            9/19 |          47.4% |
| Sleeve fit            |           12/19 |          63.2% |
| Fabric weight         |            5/19 |          26.3% |
| Stretch               |            5/19 |          26.3% |

Prompt v3 corrected the most serious semantic issue found in the first Qwen
run. Shoes and bags now use `not-applicable` consistently, while garment fields
use real values or `unknown`.

## Quality findings

Qwen is strong enough for local catalogue experimentation:

- it produced valid structured output for every product;
- it required no API key, billing, quota, or external AI processing;
- category classification matched Gemini for every shared product;
- fit and shoulder-construction agreement were reasonably high;
- it processed the missing Gemini product successfully.

It is not yet proven as recommendation-quality ground truth:

- length agreement is particularly low and the field is visually subjective;
- fabric weight and stretch are usually `unknown`, which is appropriately
  conservative but less informative;
- several sleeve results conflict with clear catalogue text, including
  `longsleeve-cotton-top` and `navy-sport-jacket` being labelled sleeveless;
- Qwen's average confidence is 0.925 despite observable mistakes;
- Gemini's average confidence is similarly high at 0.92, so neither provider's
  self-reported confidence is calibrated.

The application must continue to treat model confidence as an uncalibrated
signal until compared with human labels.

## Llama text-only check

`llama3.2:latest` produced one schema-valid text-only result in 8.3 seconds. It
correctly classified `led-high-tops` as shoes using the catalogue description,
but cannot inspect product images.

Use Llama only as a fast text-only fallback when image analysis is unavailable.
It was not run over the full catalogue because Qwen is the relevant multimodal
candidate.

## Decision

Use `qwen3.5:4b` as the default local development provider for asynchronous
product enrichment. Keep Gemini available as a cloud comparison and fallback.
Do not select either provider as the production recommendation authority until
we have a small human-labelled men's T-shirt evaluation set.

The next evaluation dataset must include explicit labels for category, fit,
shoulder construction, silhouette, length, neckline, sleeve fit, fabric weight,
and stretch. Accuracy against those labels—not provider agreement—will decide
which attributes can be automated.
