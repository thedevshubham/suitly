# ADR 0005: Defer local virtual try-on on current hardware

- Status: Accepted
- Date: 2026-07-29

## Context

The shopper experience would benefit from an on-demand preview showing a
recommended garment on the uploaded photo. Suitly requires a commercially
usable model, private image handling, and practical interactive latency.

The current development machine is an Apple M3 MacBook Air with 8 GB unified
memory. CatVTON and IDM-VTON are non-commercial research options. FASHN VTON
v1.5 has a suitable Apache-2.0 licence, but its official runtime supports CUDA
acceleration and otherwise falls back to float32 CPU inference. It does not
provide an official Apple-MPS path.

## Decision

Suitly will not install or integrate local virtual try-on weights on the
current development machine. No `Try it on` control will be presented until a
functional provider has been benchmarked.

Virtual try-on remains an approved experiment outside the default
recommendation request. Future implementation must be on-demand, provider
isolated, temporary, clearly labelled as an AI preview, and unable to alter
trusted catalogue or fit facts.

## Consequences

- The current MVP remains responsive enough for recommendation evaluation.
- The repository avoids multi-gigabyte weights and an unproven MPS port.
- A future experiment requires suitable CUDA hardware, a verified higher-memory
  Apple implementation, or approval for a commercial hosted API.
- Recommendation quality and feedback work can continue independently.
