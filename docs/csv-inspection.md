# CSV Inspection Report

**Status:** Milestone 0 inspection and POC mapping decisions complete; parser
not implemented

**Date:** 2026-07-27

**Source file:** `tests/fixtures/store-products-sample.csv`

## 1. Executive finding

The file is a structurally valid Shopify-style product export containing 160
variant rows grouped into 20 products. Every product has eight combinations:
four sizes (`XS`, `S`, `M`, `L`) multiplied by two colours (`Black`, `White`).

The file is useful for developing and testing generic Shopify CSV grouping,
field inheritance, option mapping, and image handling. It is not sufficient for
validating the intended men's T-shirt recommendation MVP.

The owner has confirmed that this is sample data only. For this sample import,
prices use USD and variant availability is derived strictly from positive
inventory quantity.

Important limitations:

- only one product is explicitly a T-shirt, and it is tagged `women`;
- the catalogue mixes shoes, shirts, jackets, tops, a tuxedo, a skirt set, and
  a bag;
- all product category and type values are blank;
- variant SKUs and barcodes are blank;
- Shopify product and variant IDs are not present;
- currency is not present;
- size charts and garment measurements are not present;
- each product has only one product image and no variant image;
- inventory tracking is blank, which makes availability interpretation
  ambiguous;
- the Black/White variant options frequently conflict with product titles,
  descriptions, and images.

This sample should be treated as a parser fixture, not as the catalogue used to
judge recommendation or sizing quality.

## 2. File summary

| Metric                               |   Result |
| ------------------------------------ | -------: |
| File type                            | CSV text |
| Approximate file size                |    25 KB |
| Header columns                       |       56 |
| Data rows                            |      160 |
| Distinct non-empty handles           |       20 |
| Product header rows                  |       20 |
| Variant rows                         |      160 |
| Rows missing a handle                |        0 |
| Image-only rows                      |        0 |
| Variants per product                 |        8 |
| Duplicate handle/option combinations |        0 |
| Blank variant SKUs                   |      160 |
| Product image URLs                   |       20 |
| Unique product image URLs            |       20 |
| Variant image URLs                   |        0 |
| Products without any image URL       |        0 |
| Syntactically malformed image URLs   |        0 |

The physical file has 161 lines: one header row and 160 data rows.

## 3. Headers

The file contains these columns:

```text
Handle
Title
Body (HTML)
Vendor
Product Category
Type
Tags
Published
Option1 Name
Option1 Value
Option2 Name
Option2 Value
Option3 Name
Option3 Value
Variant SKU
Variant Grams
Variant Inventory Tracker
Variant Inventory Qty
Variant Inventory Policy
Variant Fulfillment Service
Variant Price
Variant Compare At Price
Variant Requires Shipping
Variant Taxable
Variant Barcode
Image Src
Image Position
Image Alt Text
Gift Card
SEO Title
SEO Description
Google Shopping / Google Product Category
Google Shopping / Gender
Google Shopping / Age Group
Google Shopping / MPN
Google Shopping / Condition
Google Shopping / Custom Product
Google Shopping / Custom Label 0
Google Shopping / Custom Label 1
Google Shopping / Custom Label 2
Google Shopping / Custom Label 3
Google Shopping / Custom Label 4
Variant Image
Variant Weight Unit
Variant Tax Code
Cost per item
Included / Canada
Price / Canada
Compare At Price / Canada
Included / International
Price / International
Compare At Price / International
Included / United States
Price / United States
Compare At Price / United States
Status
```

## 4. Row and grouping model

`Handle` is the correct grouping key for this file.

The first row for each handle carries product-level fields such as:

- title;
- HTML description;
- vendor;
- tags;
- published state;
- option names;
- product image;
- status.

Continuation rows repeat the handle and contain variant values while leaving
most product-level fields blank. A parser must inherit product-level fields
within a handle group. It must not treat blank continuation fields as updates
that erase the first row's data.

All 20 handle groups contain exactly eight variant rows. There are no separate
image-only rows in this sample, although a production Shopify CSV parser must
still support them.

## 5. Product list and suitability

| Handle                   | Title                  | Tag   | Product kind inferred from title/description |
| ------------------------ | ---------------------- | ----- | -------------------------------------------- |
| `led-high-tops`          | LED High Tops          | men   | Shoes                                        |
| `striped-skirt-and-top`  | Striped Skirt and Top  | women | Outfit/set                                   |
| `red-sports-tee`         | Red Sports Tee         | women | T-shirt                                      |
| `blue-silk-tuxedo`       | Blue Silk Tuxedo       | men   | Tuxedo                                       |
| `olive-green-jacket`     | Olive Green Jacket     | women | Jacket                                       |
| `white-cotton-shirt`     | White Cotton Shirt     | women | Shirt                                        |
| `chequered-red-shirt`    | Chequered Red Shirt    | men   | Shirt                                        |
| `longsleeve-cotton-top`  | Long Sleeve Cotton Top | women | Top                                          |
| `silk-summer-top`        | Silk Summer Top        | women | Top                                          |
| `zipped-jacket`          | Zipped Jacket          | men   | Jacket                                       |
| `black-leather-bag`      | Black Leather Bag      | women | Bag                                          |
| `dark-winter-jacket`     | Soft Winter Jacket     | women | Jacket                                       |
| `navy-sport-jacket`      | Navy Sports Jacket     | men   | Jacket                                       |
| `dark-denim-top`         | Dark Denim Top         | women | Top                                          |
| `classic-leather-jacket` | Classic Leather Jacket | women | Jacket                                       |
| `striped-silk-blouse`    | Striped Silk Blouse    | women | Blouse/outfit                                |
| `floral-white-top`       | Floral White Top       | women | Top                                          |
| `yellow-wool-jumper`     | Yellow Wool Jumper     | women | Jumper                                       |
| `classic-varsity-top`    | Classic Varsity Top    | women | Top/jacket                                   |
| `ocean-blue-shirt`       | Ocean Blue Shirt       | men   | Shirt                                        |

Tag distribution:

| Tag     | Product count |
| ------- | ------------: |
| `women` |            14 |
| `men`   |             6 |

`Tags` is being used as a single gender-like label in this sample. It should not
be assumed to be a reliable gender field in arbitrary merchant exports because
Shopify tags can contain multiple free-form values.

## 6. Options and variants

### Option 1

- Name: `Size`
- Values:
  - `XS`: 40 rows
  - `S`: 40 rows
  - `M`: 40 rows
  - `L`: 40 rows

### Option 2

- Name: `Color`
- Values:
  - `Black`: 80 rows
  - `White`: 80 rows

### Option 3

Option 3 names and values are entirely blank.

Option names appear only on the first row of each product group. The parser must
inherit `Option1 Name` and `Option2 Name` across the remaining variant rows.

Each product has this Cartesian set:

```text
XS / Black
XS / White
S  / Black
S  / White
M  / Black
M  / White
L  / Black
L  / White
```

The variant keys formed from handle plus option values are unique in this file.

### Colour-quality warning

The Black/White options are not credible for several products. Examples include
`Red Sports Tee`, `Blue Silk Tuxedo`, `Olive Green Jacket`, and `Ocean Blue
Shirt`. The product title and description describe colours that are not offered
as variant values.

The normalization pipeline must report colour conflicts instead of assuming the
variant options, title, description, and image all agree.

## 7. Product metadata quality

| Field                  | Finding                                |
| ---------------------- | -------------------------------------- |
| `Vendor`               | `partners-demo` for all 20 products    |
| `Product Category`     | Blank for all products                 |
| `Type`                 | Blank for all products                 |
| `Tags`                 | One `men` or `women` value per product |
| `Published`            | `true` on all 20 product header rows   |
| `Status`               | `active` on all 20 product header rows |
| `Body (HTML)`          | Present on product header rows         |
| `SEO Title`            | Blank                                  |
| `SEO Description`      | Blank                                  |
| Google Shopping fields | Blank                                  |

Because category and type are blank, the MVP cannot reliably select men's
T-shirts using deterministic catalogue fields. Title, description, tags, and
images could be used to create an inferred classification, but that
classification must retain evidence and confidence and cannot replace missing
merchant facts silently.

## 8. Images

- Each product has one non-empty `Image Src`.
- All 20 product image URLs are unique.
- All image strings begin with `http://` or `https://`.
- No `Variant Image` is populated.
- `Image Position` is `1` on each product header row.
- Image alt text is blank.

The inspection verifies URL syntax only. It does not prove that each remote URL
is still reachable or that its image accurately represents every variant.

The absence of variant images means visual product analysis can inspect a
product-level image, but it cannot reliably determine how Black and White
variants differ.

## 9. Inventory and availability

`Variant Inventory Qty` is populated for all 160 variant rows:

| Inventory state            | Variant count |
| -------------------------- | ------------: |
| Quantity greater than zero |            22 |
| Quantity equal to zero     |           138 |
| Quantity below zero        |             0 |

Every product has at least one positive-quantity variant. Nineteen products have
one positive variant; `classic-varsity-top` has three.

However:

- `Variant Inventory Tracker` is blank for every variant;
- `Variant Inventory Policy` is `deny` for every variant;
- `Variant Fulfillment Service` is `manual` for every variant.

When Shopify inventory tracking is not enabled, quantity alone may not
represent storefront availability in the same way as a tracked variant.
Nevertheless, the accepted policy for this sample/POC import is:

```text
available = product is published
         && product status is active
         && variant inventory quantity > 0
```

This produces 22 available variants and 138 unavailable variants in the sample.
It is a fixture-specific POC decision, not a universal Shopify availability
rule. Live connectors must use the platform's authoritative availability and
inventory semantics.

## 10. Pricing and currency

`Variant Price` is present on all variant rows. Observed prices:

| Price | Variant rows |
| ----: | -----------: |
| 30.00 |           16 |
| 50.00 |           56 |
| 60.00 |           24 |
| 65.00 |           16 |
| 70.00 |           16 |
| 75.00 |            8 |
| 80.00 |           24 |

The file does not contain a currency column and its regional price columns are
blank. The owner has confirmed that prices in this sample use `USD`.

The parser should still receive `USD` through explicit import configuration
rather than embedding it as a universal Shopify CSV default. Currency must not
be guessed for future imports.

`Variant Compare At Price` and `Cost per item` are blank.

## 11. Identifiers

The file does not contain Shopify product IDs or Shopify variant IDs.

`Variant SKU` and `Variant Barcode` are blank for all 160 variants.

For the local CSV POC:

- use `Handle` as the external product grouping key;
- generate an internal immutable product ID during import;
- generate an internal variant ID from a normalized handle/option key plus the
  import source namespace;
- retain the raw option values used to form the key;
- never describe these generated IDs as Shopify IDs.

For live Shopify integration, real GraphQL product and variant IDs must be
stored separately and used for cart and inventory operations.

## 12. Size-data limitation

The catalogue provides only labels: `XS`, `S`, `M`, and `L`.

It does not provide:

- chest measurement ranges;
- waist measurement ranges;
- garment width or length;
- brand sizing rules;
- fabric stretch values;
- intended fit measurements;
- a size-chart URL.

Consequently, this file cannot support credible size recommendations from
height, weight, and a photograph. The POC may display available size labels,
but any recommended size would have low evidential support and must be marked
accordingly.

## 13. Proposed source mapping

### Product mapping

| Canonical field     | CSV source                 | Rule                                            |
| ------------------- | -------------------------- | ----------------------------------------------- |
| `source`            | Constant                   | `shopify_csv`                                   |
| `externalProductId` | None                       | Leave undefined                                 |
| `handle`            | `Handle`                   | Required grouping key                           |
| `title`             | `Title`                    | Inherit first non-empty value in group          |
| `descriptionHtml`   | `Body (HTML)`              | Preserve sanitized source                       |
| `descriptionText`   | `Body (HTML)`              | Strip/sanitize HTML separately                  |
| `vendor`            | `Vendor`                   | Inherit                                         |
| `productCategory`   | `Product Category`         | Undefined in this sample                        |
| `productType`       | `Type`                     | Undefined in this sample                        |
| `tags`              | `Tags`                     | Parse Shopify tag syntax; do not assume one tag |
| `published`         | `Published`                | Parse strict boolean and inherit                |
| `status`            | `Status`                   | Normalize known Shopify status values           |
| `images`            | `Image Src`, position, alt | Collect and deduplicate per handle              |
| `variants`          | Variant rows               | Build from option/value pairs                   |

### Variant mapping

| Canonical field      | CSV source                                       | Rule                                     |
| -------------------- | ------------------------------------------------ | ---------------------------------------- |
| `externalVariantId`  | None                                             | Leave undefined                          |
| `sku`                | `Variant SKU`                                    | Undefined in this sample                 |
| `barcode`            | `Variant Barcode`                                | Undefined in this sample                 |
| `options`            | Option names and values                          | Inherit option names by product          |
| `size`               | Option whose name normalizes to `size`           | `XS`, `S`, `M`, `L`                      |
| `colour`             | Option whose name normalizes to `color`/`colour` | `Black`, `White`                         |
| `price.amount`       | `Variant Price`                                  | Parse decimal, never float for storage   |
| `price.currency`     | Import configuration                             | `USD` for this sample                    |
| `compareAtPrice`     | `Variant Compare At Price`                       | Undefined in this sample                 |
| `inventory.tracker`  | `Variant Inventory Tracker`                      | Preserve raw/normalized value            |
| `inventory.quantity` | `Variant Inventory Qty`                          | Parse integer                            |
| `inventory.policy`   | `Variant Inventory Policy`                       | Preserve normalized value                |
| `available`          | Derived                                          | Use explicit documented policy           |
| `imageUrl`           | `Variant Image`                                  | Undefined in this sample                 |
| `weight.value`       | `Variant Grams`                                  | Parse numeric grams                      |
| `weight.unit`        | `Variant Weight Unit`                            | Raw source says `kg`; reconcile conflict |

### Weight inconsistency

The CSV column is named `Variant Grams`, while `Variant Weight Unit` contains
`kg`. Values are `0.0` in this sample, so the inconsistency has no material
effect here. A production parser must not combine the two fields without
documenting Shopify export semantics and validating non-zero examples.

## 14. Proposed canonical TypeScript schemas

These are design proposals based on the observed file, not implementation.

```ts
type CanonicalProduct = {
  id: string;
  merchantId: string;
  source: 'shopify_csv' | 'shopify' | 'woocommerce' | 'custom_api';
  externalProductId?: string;
  handle: string;
  title: string;
  descriptionHtml?: string;
  descriptionText?: string;
  vendor?: string;
  productCategory?: string;
  productType?: string;
  tags: string[];
  published: boolean;
  status: 'active' | 'draft' | 'archived' | 'unknown';
  images: CanonicalProductImage[];
  variants: CanonicalVariant[];
  sourceUpdatedAt?: string;
};

type CanonicalProductImage = {
  url: string;
  position?: number;
  altText?: string;
};

type CanonicalVariant = {
  id: string;
  externalVariantId?: string;
  sku?: string;
  barcode?: string;
  options: Array<{
    name: string;
    value: string;
  }>;
  size?: string;
  colour?: string;
  price: {
    amountMinor: number;
    currency: string;
  };
  compareAtPrice?: {
    amountMinor: number;
    currency: string;
  };
  inventory: {
    tracker?: string;
    quantity?: number;
    policy?: string;
  };
  available: boolean;
  imageUrl?: string;
  weightGrams?: number;
};
```

Money should be stored in integer minor units or an exact decimal type, not a
binary floating-point number.

## 15. Required ingestion report

The future parser must report:

- physical rows and parsed rows;
- product and variant counts;
- skipped rows with reasons;
- missing handles;
- duplicate handles at product-header level;
- duplicate handle/option variant keys;
- products without titles or descriptions;
- products without images;
- products without category or type;
- variants without stable external IDs, SKUs, or barcodes;
- missing and conflicting colours;
- missing sizes;
- invalid prices and missing currency;
- ambiguous inventory;
- malformed or duplicate image URLs;
- unused or unknown option names;
- size-chart and garment-measurement availability.

## 16. Decisions and blockers before parser implementation

### Safe decisions

- Group rows by `Handle`.
- Inherit product fields and option names from the first non-empty value in the
  group.
- Treat every row with option values as a variant row.
- Normalize Size from Option 1 and Color from Option 2 for this specific file.
- Deduplicate product images within a handle.
- Generate internal POC IDs because external IDs are absent.
- Configure currency as `USD` for this sample import.
- Derive sample availability from published/active product state and
  `Variant Inventory Qty > 0`.
- Treat this catalogue as synthetic/sample data for ingestion development, not
  recommendation-quality evaluation.

### Decisions requiring confirmation

1. Whether the intended men's T-shirt catalogue will be supplied separately.
2. Whether the source store can provide size charts or garment measurements.
3. Whether product and variant IDs can be added to future exports or obtained
   through a live connector.

### Current release gate

Do not begin recommendation-quality or size-quality evaluation with this file.
It does not represent the documented men's T-shirt MVP and lacks the catalogue
evidence required for credible sizing.

It is acceptable to use this file to implement and test CSV inspection,
grouping, inheritance, normalization, validation, and data-quality reporting
after the mapping decisions above are reviewed.

## 17. Repository placement

This synthetic sample is intentionally version-controlled under:

```text
tests/fixtures/store-products-sample.csv
```

Private or merchant-provided catalogues must be placed under:

```text
data/imports/
```

That directory is ignored except for its `.gitkeep`.
