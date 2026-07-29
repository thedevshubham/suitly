# ADR 0004: Use an explicit catalogue audience

- Status: Accepted
- Date: 2026-07-29

## Context

The sample catalogue contains 14 products tagged `women` and 6 tagged `men`.
The first shopper demo did not filter those tags, so recommendations mixed both
catalogue departments. The sample also records every available variant colour
as Black, including products whose titles and images indicate other colours.
Consequently, shopper colour input did not provide trustworthy filtering.

Audience must not be inferred from a shopper photograph. It is a shopping
preference and a catalogue property, not a visual characteristic of the
shopper.

## Decision

The shopper explicitly chooses either men's or women's styles. Candidate
filtering requires the product's trusted catalogue tag to match that selection.
The demo shows only categories that exist for the selected audience.

Shopper colour input is removed while the sample catalogue lacks reliable
variant-colour data. An empty colour preference is treated neutrally and does
not exclude products or improve their score.

## Consequences

- Men's and women's catalogue results no longer mix accidentally.
- Suitly does not infer sex or gender from a photograph.
- Catalogue audience tags must be validated by each future connector.
- Colour preference can return when a merchant supplies reliable variant
  colours.
- Unisex and more flexible audience taxonomies can be added when real merchant
  data demonstrates the need.
