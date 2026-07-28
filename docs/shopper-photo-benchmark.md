# Local Shopper Photo Benchmark

**Date:** 2026-07-28

**Model:** `qwen3.5:4b` through local Ollama

**Prompt:** `shopper-vision-v1`

**Fixture:** Synthetic full-body adult generated specifically for testing

## Privacy and processing flow

The benchmark does not use a real shopper photograph. The project fixture is a
synthetic, fictional adult generated with the built-in image-generation tool.

The implemented local flow:

1. accepts only JPEG, PNG, or WebP;
2. rejects empty input and input larger than 10 MB;
3. enforces minimum dimensions and a 40-megapixel decode limit;
4. applies orientation correction;
5. resizes the image to a bounded resolution;
6. converts it to an 82-quality JPEG without carrying EXIF or ICC metadata;
7. writes it to a randomized temporary directory with `0600` permissions;
8. sends base64 bytes only to local Ollama;
9. deletes the temporary directory in a `finally` block after success or
   failure;
10. persists only the structured profile and benchmark metadata.

Automated tests verify deletion after both successful and failed analysis.

## Fixture preparation

| Property          |        Original |      Optimized |
| ----------------- | --------------: | -------------: |
| Format            |             PNG |           JPEG |
| Dimensions        |        887×1774 |       512×1024 |
| File size         | 1,732,294 bytes |   28,867 bytes |
| Metadata retained | Not relied upon | No EXIF or ICC |

## Latency

| Scenario                       | Analysis latency |
| ------------------------------ | ---------------: |
| 768×1536 initial experiment    |     36.7 seconds |
| 512×1024 optimized, cold model |     14.9 seconds |
| 512×1024 optimized, warm model |      5.9 seconds |

The warm and cold optimized runs produced the same structured profile. The
larger-resolution experiment produced materially different proportion labels,
so the input preprocessing contract must remain fixed during evaluation.

The current laptop result is acceptable for an internal prototype. It does not
yet prove production storefront performance because:

- a cold request takes approximately 15 seconds;
- a warm request still takes approximately 6 seconds;
- concurrency has not been tested;
- production hardware will differ;
- the result is based on one synthetic fixture.

## Structured result

For the optimized fixture, Qwen returned:

- valid image with no issues;
- average visible build;
- narrow shoulder profile;
- balanced shoulder-to-hip profile;
- long torso and short leg proportions;
- `straight` as the recommended silhouette;
- style confidence `0.95`;
- geometry confidence `0.82`.

These labels are unverified model output, not ground truth. The model must not
be treated as capable of exact body measurement or guaranteed sizing.

## Decision

Accept the private temporary-photo pipeline and local inference integration for
the internal MVP.

Do not enable shopper-facing recommendation claims yet. Before that decision:

1. create a small consented or synthetic labelled photo set;
2. measure profile consistency and human agreement;
3. test invalid images, occlusion, multiple people, and non-standing poses;
4. measure p50, p95, and p99 latency under repeated and concurrent requests;
5. set deterministic rejection and fallback behavior;
6. evaluate recommendation quality against a non-photo baseline.
