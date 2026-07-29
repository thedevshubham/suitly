# Controlled recommendation evaluation

## Scope

The controlled evaluation checks catalogue and recommendation invariants
across 20 repeatable cases. It covers men's and women's catalogue audiences,
all categories exposed by the demo, short/average/tall height inputs, and three
synthetic silhouette-profile presets.

This is an engineering-safety evaluation. It does not claim that synthetic
profiles prove real-world style quality.

## Assertions

Every case checks that:

- at least the expected number of results is returned;
- no more than three results are returned;
- every product belongs to the requested merchant;
- every product has the requested catalogue audience tag;
- every product has the requested enriched category;
- every selected variant is available; and
- every selected variant belongs to its hydrated product.

The runner records three comparable rankings: catalogue-only with neutral
measurements, stated inputs using the case height and weight, and
photograph-assisted using the structured shopper profile. It records whether
each stage changes the top-three order and which products the photo profile
introduces.

## First run

The initial run produced:

- 20 cases;
- 19 passing;
- 1 insufficient-result failure; and
- shopper-profile ranking changes in 7 cases.

The failure occurred because a `lessSuitableSilhouettes` value was treated as a
hard product exclusion. That signal comes from uncertain visual analysis and
should not behave like inventory or audience eligibility. It was changed to a
strong score penalty.

After correction:

- 20 of 20 cases passed;
- no catalogue-safety failures remained; and
- shopper-profile ranking changed the top three in 7 of 20 cases.

## Interpretation

The result shows that audience, category, availability, and product/variant
integrity are enforced in the controlled sample. It also shows that the
shopper profile has a measurable ranking effect in some categories.

It does not show that those changes are preferable to shoppers. Categories
with one or two eligible products cannot demonstrate meaningful
personalization. Real shopper feedback and a broader, cleaner catalogue remain
necessary before changing scoring weights or claiming recommendation quality.
The generated `topThreePhotoLiftCandidates` are intended for blinded human
review; ranking movement alone is not treated as proof of improvement.

## Running the evaluation

```bash
corepack pnpm evaluate:controlled
```

Cases are stored in
`tests/fixtures/recommendation-evaluation-cases.json`. The detailed generated
report is written to `data/generated/controlled-evaluation-report.json` and is
ignored by Git.
