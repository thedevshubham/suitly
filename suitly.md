# AI Fashion Recommendation Platform
## Technical Specification and Codex Master Brief

**Working product concept:** A B2B SaaS and API that lets fashion e-commerce stores offer an AI personal shopper. A shopper provides height, weight, preferred colour, and a clear full-body photograph. The system analyses the shopper, understands the merchant's catalogue, and returns the available products most likely to suit the shopper, with a likely size, confidence, and concise explanation.

**Initial integration:** Shopify.

**Long-term integrations:** Custom websites, headless commerce, WooCommerce, Magento, BigCommerce, and other platforms through connectors and SDKs.

**Document status:** Build specification for the proof of concept and the first Shopify MVP. Technical provider details should be checked against current official documentation before implementation.

---

# 1. Executive decision

Build the idea in this order:

1. Prove that AI recommendations are meaningfully useful using the supplied Shopify CSV and product images.
2. Create a working internal prototype: height + weight + colour + photo -> top three products.
3. Add a Shopify connector and storefront theme app extension.
4. Extract the recommendation system into a platform-independent core API.
5. Add merchant onboarding, subscriptions, analytics, and SDKs only after recommendation quality is validated.

Do **not** train a custom AI model initially. Use an existing multimodal model API, structured outputs, deterministic catalogue validation, and optionally MediaPipe Pose Landmarker in a later iteration. The proprietary value initially lies in the product/customer schemas, prompts, ranking pipeline, evaluation dataset, integration layer, and feedback loop.

---

# 2. Product definition

## 2.1 Shopper experience

The shopper provides only:

- Height
- Weight
- Preferred colour or colours
- One clear full-body photograph
- Optional category, initially fixed to men's T-shirts

The system returns:

- Top three available products
- The recommended available variant and likely size
- Style-match score
- Size confidence
- Two or three understandable reasons
- A fit-risk statement where uncertainty exists
- Product URL and add-to-cart capability

The shopper may refine results conversationally, for example:

- “Show something less loose.”
- “I do not like round necks.”
- “Only show black.”
- “Show a cheaper option.”

The shopper should never need to manually choose a body type, shoulder shape, torso proportion, or product fit. Those are internal inferred attributes.

## 2.2 Merchant experience

The merchant:

1. Connects Shopify or uploads/imports a catalogue.
2. Lets the platform import products, variants, descriptions, images, availability, and size information.
3. Reviews only low-confidence or incomplete product classifications.
4. Adds the storefront widget through a Shopify theme app extension.
5. Views recommendation usage and conversion analytics later.

## 2.3 Honest product promise

Promise:

> Upload a full-body photo and receive products selected for your visible proportions, height, weight, preferred colour, and likely fit.

Do not promise:

> Guaranteed perfect physical sizing from one ordinary photograph.

A single photograph is affected by pose, camera perspective, clothing, and image quality. The MVP should separate **style-match confidence** from **size confidence**.

---

# 3. System boundaries for the first version

## Included

- Men's T-shirts only
- One Shopify product CSV
- 20-50 products for testing
- Product and variant normalisation
- Product image and description analysis
- Customer photo validation and visual analysis
- Top-three product recommendations
- Likely available size and confidence
- Structured output validation
- Internal test page
- Feedback capture

## Excluded initially

- Virtual try-on
- Exact body measurements from a single photo
- Custom-trained model
- Multiple merchants
- Public Shopify App Store submission
- Billing
- Long-term image storage
- Native mobile app
- Thousands of products and vector search
- Fully autonomous multi-agent orchestration
- Automatic refunds, checkout changes, or order actions

---

# 4. Architectural overview

## 4.1 Long-term platform architecture

```text
                    Merchant systems
       Shopify | WooCommerce | Magento | Custom API
                         |
                 Commerce connectors
                         |
              Catalogue normalisation layer
                         |
             Product Intelligence Engine
                         |
              Product database + search
                         |
 Shopper inputs --> Customer Vision Engine
                         |
                Recommendation Engine
                         |
                  Conversation Agent
                         |
              Storefront SDK / App block
                         |
                 Product page / Cart
```

## 4.2 MVP architecture

```text
Shopify CSV + product image URLs
              |
       CSV normalisation script
              |
       Normalised products.json
              |
  Product Intelligence batch process
              |
    enriched-products.json / database
              |
-------------------------------------------
              |
 Shopper form: height, weight, colour, photo
              |
       POST /api/recommend (multipart)
              |
       Photo validation + analysis
              |
        Candidate product filtering
              |
      AI comparative product ranking
              |
 Backend validation and result hydration
              |
        Top-three recommendation cards
```

## 4.3 Why this is not microservices yet

Start as a modular monolith. Keep clear internal modules, but deploy one application. Split workers or services only when product-analysis workloads, catalogue scale, or multi-tenant traffic justify it.

---

# 5. Recommended technology stack

| Area | MVP choice | Later production choice |
|---|---|---|
| Language | TypeScript | TypeScript; Python only for specialised ML if needed |
| App framework | Next.js App Router | Next.js dashboard + standalone Node API if needed |
| Validation | Zod | Zod and generated OpenAPI schemas |
| CSV parsing | csv-parse | Streaming ingestion pipeline |
| Database | JSON or SQLite for first experiment | PostgreSQL |
| Vector search | Not needed | pgvector when catalogue size requires it |
| Background jobs | Simple scripts | BullMQ or Temporal |
| Object storage | Temporary local/dev storage | Private S3-compatible storage with signed URLs and expiry |
| Shopify | CSV only at first | GraphQL Admin API, webhooks, theme app extension, app proxy |
| AI API | One multimodal model through OpenAI Responses API or equivalent | Provider abstraction with fallback/evaluation |
| Pose geometry | Not required in POC | MediaPipe Pose Landmarker |
| Testing | Vitest/Jest + Playwright | Same plus evaluation datasets and observability |
| Deployment | Vercel/Node host for POC | Managed Node platform + Postgres + object storage + workers |

---

# 6. AI and machine-learning design

## 6.1 Do we train our own model?

No, not initially.

We lack the labelled data required to train a reliable model. A useful custom model would eventually need examples containing shopper profiles, photographs with consent, recommended products, user preferences, purchases, retained items, returns, size exchanges, and feedback.

The MVP uses pre-trained AI capabilities:

1. Multimodal image-and-text understanding
2. Structured JSON output
3. Comparative recommendation reasoning
4. Optional pose-landmark extraction later
5. Embeddings only after catalogue scale justifies them

## 6.2 Initial AI tasks

### Task A: Product intelligence

Runs once when a product is imported or materially updated.

Input:

- Product title
- Description
- Tags
- Product type
- Product images
- Variant names and colours
- Size chart, if available

Output:

```json
{
  "category": "t-shirt",
  "fit": "relaxed",
  "shoulderConstruction": "drop-shoulder",
  "silhouette": "boxy",
  "length": "standard",
  "neckline": "crew",
  "sleeveFit": "loose",
  "fabricWeight": "medium",
  "stretch": "low",
  "styleContexts": ["gym", "casual", "minimal"],
  "visualEffects": ["emphasises shoulders", "creates a relaxed torso line"],
  "confidence": 0.84,
  "evidence": ["title", "description", "front image"]
}
```

Store this result. Do not reanalyse the same product for every shopper.

### Task B: Shopper photo analysis

Runs per shopper session.

Input:

- Full-body photograph
- Height
- Weight
- Preferred colour

Output:

```json
{
  "imageValid": true,
  "imageIssues": [],
  "visibleBuild": "athletic",
  "shoulderProfile": "moderately-broad",
  "shoulderToHipProfile": "high",
  "torsoProportion": "balanced",
  "legProportion": "balanced",
  "recommendedSilhouettes": ["regular", "relaxed", "drop-shoulder"],
  "lessSuitableSilhouettes": ["very-slim", "extra-longline"],
  "styleConfidence": 0.81,
  "geometryConfidence": 0.67
}
```

The system must not infer or store sensitive personal attributes. It should describe only visible fashion-relevant geometry and image quality.

### Task C: Product ranking

Input:

- Structured shopper profile
- Height, weight, and preferred colour
- A limited set of eligible candidate products
- Product intelligence profiles
- Real variants and availability

Output:

```json
{
  "recommendations": [
    {
      "productId": "black-training-tee",
      "variantId": "variant-m-black",
      "recommendedSize": "M",
      "styleScore": 91,
      "styleConfidence": 0.86,
      "sizeConfidence": 0.64,
      "reasons": [
        "The shoulder construction complements the visible upper-body proportions.",
        "The standard length is likely to balance the shopper's height.",
        "The colour matches the stated preference."
      ],
      "fitRisk": "The waist may appear slightly loose."
    }
  ]
}
```

### Task D: Conversational refinement

Runs after initial results.

Input:

- Existing session profile
- Previous recommendations
- User message

Output:

```json
{
  "preferenceUpdates": {
    "rejectedFits": ["oversized"],
    "preferredFits": ["regular", "slightly-relaxed"]
  },
  "rerankRequired": true
}
```

## 6.3 Recommended AI provider approach

Create interfaces instead of placing provider calls throughout the application:

```ts
export interface ShopperVisionProvider {
  analyse(input: ShopperVisionInput): Promise<ShopperVisualProfile>;
}

export interface ProductIntelligenceProvider {
  analyse(input: ProductAnalysisInput): Promise<ProductIntelligence>;
}

export interface RecommendationProvider {
  rank(input: RecommendationRankingInput): Promise<AIRecommendationResult>;
}
```

The first implementation may use OpenAI's Responses API with image inputs and Structured Outputs. OpenAI's official documentation supports image input, JSON-schema-constrained structured outputs, and function calling. Keep model IDs configurable through environment variables rather than hardcoding a model assumption.

## 6.4 Optional MediaPipe stage

Add MediaPipe Pose Landmarker only after the multimodal-only baseline is evaluated.

Use it for:

- Confirming a usable standing pose
- Detecting shoulders, hips, knees, and ankles
- Calculating relative ratios
- Improving consistency of geometry features

Do not use it as the fashion decision-maker. It supplies landmarks; the recommendation engine interprets products and styling.

## 6.5 Embeddings and vector search

Do not add embeddings for 20-50 products.

Add embeddings when:

- A merchant has hundreds or thousands of products
- Filtering still leaves too many candidates
- Sending candidate context to the AI becomes expensive
- Semantic style retrieval materially improves latency or quality

At that point use PostgreSQL + pgvector and embed a canonical product representation.

---

# 7. Data models

## 7.1 Normalised product

```ts
export type NormalisedProduct = {
  id: string;
  source: "shopify_csv" | "shopify_api" | "custom_api";
  externalProductId?: string;
  handle: string;
  title: string;
  description: string;
  vendor?: string;
  productType?: string;
  tags: string[];
  images: ProductImage[];
  variants: NormalisedVariant[];
  intelligence?: ProductIntelligence;
};

export type ProductImage = {
  url: string;
  altText?: string;
  position?: number;
};

export type NormalisedVariant = {
  id: string;
  externalVariantId?: string;
  title?: string;
  size?: string;
  colour?: string;
  price?: number;
  currency?: string;
  available: boolean;
  imageUrl?: string;
};
```

## 7.2 Product intelligence

```ts
export type ProductIntelligence = {
  category: "t-shirt" | "unknown";
  fit: "slim" | "regular" | "relaxed" | "oversized" | "unknown";
  shoulderConstruction:
    | "standard"
    | "drop-shoulder"
    | "raglan"
    | "unknown";
  silhouette: "tapered" | "straight" | "boxy" | "unknown";
  length: "short" | "standard" | "long" | "unknown";
  neckline: "crew" | "v-neck" | "henley" | "unknown";
  sleeveFit: "fitted" | "regular" | "loose" | "unknown";
  fabricWeight: "light" | "medium" | "heavy" | "unknown";
  stretch: "none" | "low" | "medium" | "high" | "unknown";
  styleContexts: string[];
  visualEffects: string[];
  confidence: number;
  evidence: string[];
};
```

## 7.3 Shopper input and profile

```ts
export type ShopperInput = {
  heightCm: number;
  weightKg: number;
  preferredColours: string[];
  photo: File;
  category: "t-shirt";
};

export type ShopperVisualProfile = {
  imageValid: boolean;
  imageIssues: string[];
  visibleBuild: "lean" | "average" | "athletic" | "broad" | "heavy" | "unclear";
  shoulderProfile: "narrow" | "balanced" | "moderately-broad" | "broad" | "unclear";
  shoulderToHipProfile: "low" | "balanced" | "high" | "unclear";
  torsoProportion: "short" | "balanced" | "long" | "unclear";
  legProportion: "short" | "balanced" | "long" | "unclear";
  recommendedSilhouettes: string[];
  lessSuitableSilhouettes: string[];
  styleConfidence: number;
  geometryConfidence: number;
};
```

## 7.4 Recommendation result

```ts
export type RecommendationResult = {
  recommendationId: string;
  recommendations: RecommendationItem[];
  warnings: string[];
};

export type RecommendationItem = {
  productId: string;
  variantId: string;
  recommendedSize?: string;
  styleScore: number;
  styleConfidence: number;
  sizeConfidence: number;
  reasons: string[];
  fitRisk?: string;
};
```

---

# 8. CSV ingestion and normalisation

The supplied CSV is the first data source. Before coding recommendation logic, inspect:

- Exact headers
- Whether each row represents a product or a variant
- Product grouping key, usually Handle
- Option columns and which option represents size or colour
- Product and variant image fields
- Inventory fields
- Price and currency fields
- Duplicate images
- HTML descriptions
- Missing IDs

The ingestion pipeline:

```text
CSV file
  -> header validation
  -> row parsing
  -> group rows by product handle
  -> inherit product-level fields across variant rows
  -> normalise options into size/colour
  -> deduplicate images
  -> infer availability from inventory/published data
  -> validate with Zod
  -> write products.normalised.json
  -> generate ingestion report
```

The ingestion report should include:

- Total rows
- Total products
- Total variants
- Products without images
- Products without colour
- Products without size
- Products with malformed URLs
- Duplicate handles
- Rows skipped and reasons

Do not write the final parser until the actual CSV headers are inspected.

---

# 9. Recommendation algorithm

Use a hybrid pipeline rather than one uncontrolled model prompt.

## 9.1 Eligibility filtering in code

Mandatory filters:

- Correct category
- Product active/eligible
- At least one available variant
- Preferred colour available, unless alternative-colour mode is explicitly enabled
- Usable image
- Valid product ID and handle

## 9.2 Candidate scoring

The first ranking may combine:

| Component | Suggested weight |
|---|---:|
| Body-silhouette compatibility | 30% |
| Product fit/shoulder compatibility | 20% |
| Height-length compatibility | 15% |
| Weight/build likelihood | 10% |
| Colour match | 15% |
| Product image/description confidence | 10% |

These are starting hypotheses, not proven rules. Store score components for debugging.

## 9.3 Comparative AI ranking

Give the AI only the top 10-20 eligible candidates. Ask it to:

- Rank products comparatively, not independently
- Avoid three nearly identical recommendations
- Return only supplied product and variant IDs
- Explain evidence without claiming exact measurement certainty
- Separate style confidence from size confidence
- Include a fit risk when size confidence is below a threshold

## 9.4 Backend hydration and validation

Never trust model-supplied commerce facts.

After AI ranking:

1. Confirm product ID exists.
2. Confirm variant belongs to product.
3. Confirm variant is available.
4. Confirm colour and size exist.
5. Hydrate title, price, currency, URL, and image from the catalogue.
6. Drop invalid recommendations.
7. If fewer than three remain, rerun or fill using deterministic ranking.

The model must never invent prices, URLs, inventory, or IDs.

---

# 10. API design for the POC

## 10.1 `POST /api/recommend`

Content type: `multipart/form-data`

Fields:

- `heightCm`
- `weightKg`
- `preferredColours` as JSON or repeated field
- `category=t-shirt`
- `photo`

Response:

```json
{
  "recommendationId": "rec_123",
  "shopperProfileSummary": {
    "visibleBuild": "athletic",
    "recommendedSilhouettes": ["regular", "relaxed"]
  },
  "recommendations": [
    {
      "productId": "black-training-tee",
      "variantId": "variant-m-black",
      "title": "Black Training Tee",
      "imageUrl": "https://...",
      "productUrl": "/products/black-training-tee",
      "price": 1499,
      "currency": "INR",
      "recommendedSize": "M",
      "styleScore": 91,
      "styleConfidence": 0.86,
      "sizeConfidence": 0.64,
      "reasons": ["..."],
      "fitRisk": "..."
    }
  ],
  "warnings": []
}
```

## 10.2 `POST /api/feedback`

```json
{
  "recommendationId": "rec_123",
  "productId": "black-training-tee",
  "feedback": "liked",
  "reason": "looks suitable"
}
```

Supported initial feedback:

- liked
- disliked
- too-loose
- too-tight
- wrong-colour
- wrong-style
- would-buy

## 10.3 `POST /api/refine` later

```json
{
  "sessionId": "sess_123",
  "message": "Show something less loose"
}
```

---

# 11. Image handling and privacy

The product handles customer photographs, so privacy is a core requirement.

## Required controls

- Accept only JPEG, PNG, or WebP
- Enforce size and dimension limits
- Strip unnecessary metadata when practical
- Use private temporary storage
- Use signed upload/access URLs in production
- Delete the original image after analysis or short expiry
- Do not expose image URLs publicly
- Do not use shopper images for training without explicit consent
- Store only fashion-relevant structured output when possible
- Provide a visible consent and deletion statement
- Avoid sensitive-attribute inference

Recommended flow:

```text
Browser -> signed private upload -> analysis -> structured profile -> delete original
```

For the POC, in-memory processing is acceptable if request limits permit, but production should use direct-to-object-storage uploads.

---

# 12. Shopify integration after POC validation

## Components

1. Shopify app for OAuth and merchant administration
2. GraphQL Admin API connector for products and variants
3. Product update/delete webhooks
4. Theme app extension for the storefront widget
5. App proxy or secure platform endpoint for dynamic storefront requests
6. Add-to-cart using valid Shopify variant IDs

Shopify's official documentation describes theme app extensions as a way to add dynamic storefront elements without merchants editing theme code, and app proxies as storefront URLs that proxy requests to an external app. The GraphQL Admin API should be used for product synchronisation with only required access scopes.

## Connector abstraction

```ts
export interface CommerceConnector {
  connect(): Promise<void>;
  listProducts(cursor?: string): Promise<ProductPage>;
  getProduct(id: string): Promise<ExternalProduct>;
  subscribeToChanges(): Promise<void>;
  normaliseProduct(product: ExternalProduct): NormalisedProduct;
}
```

The recommendation engine must not know whether a product came from Shopify or another platform.

---

# 13. Project structure

```text
ai-style-agent/
  src/
    app/
      page.tsx
      results/
      api/
        recommend/route.ts
        feedback/route.ts
    components/
      ShopperForm.tsx
      PhotoUploader.tsx
      RecommendationCard.tsx
      RecommendationResults.tsx
    lib/
      ai/
        client.ts
        shopperVision.ts
        productIntelligence.ts
        rankProducts.ts
        prompts/
      catalogue/
        parseShopifyCsv.ts
        normaliseProduct.ts
        loadCatalogue.ts
        candidateSearch.ts
      recommendation/
        eligibility.ts
        deterministicScore.ts
        hydrateAndValidate.ts
      storage/
        temporaryImageStore.ts
      validation/
        schemas.ts
      privacy/
        imagePolicy.ts
    types/
      product.ts
      shopper.ts
      recommendation.ts
  scripts/
    inspect-csv.ts
    normalise-csv.ts
    enrich-products.ts
    evaluate-recommendations.ts
  data/
    sample-products.csv
    products.normalised.json
    products.enriched.json
    evaluation-cases.json
  tests/
    unit/
    integration/
    evaluation/
  .env.example
  README.md
```

---

# 14. Environment configuration

```bash
OPENAI_API_KEY=
AI_VISION_MODEL=
AI_RANKING_MODEL=
MAX_UPLOAD_BYTES=8000000
PRODUCT_CSV_PATH=./data/sample-products.csv
PRODUCT_CATALOGUE_PATH=./data/products.enriched.json
SHOPIFY_STORE_DOMAIN=
IMAGE_RETENTION_MINUTES=15
```

Keep model names configurable. Do not place secrets in client code or commit `.env` files.

---

# 15. Error handling

Define stable error codes:

| Code | Meaning |
|---|---|
| INVALID_INPUT | Height, weight, colour, or file is invalid |
| INVALID_PHOTO | Photo does not show one clear, usable full-body subject |
| PHOTO_TOO_LARGE | File exceeds limit |
| UNSUPPORTED_IMAGE | Unsupported MIME type |
| NO_CANDIDATES | No eligible products after filtering |
| AI_ANALYSIS_FAILED | Shopper or product analysis failed |
| AI_OUTPUT_INVALID | Structured output failed validation |
| RECOMMENDATION_INVALID | Model returned invalid product/variant IDs |
| RATE_LIMITED | Request limit reached |
| INTERNAL_ERROR | Unexpected failure |

Use retries only for transient provider/network failures. Do not endlessly retry invalid structured output; log it and use a bounded retry with a corrected instruction.

---

# 16. Testing and evaluation

## 16.1 Unit tests

- CSV grouping and inheritance
- Size/colour option detection
- Image deduplication
- Candidate eligibility
- Score calculation
- AI output schema validation
- Recommendation hydration
- Invalid IDs rejected

## 16.2 Integration tests

- Multipart recommendation endpoint
- Mock AI provider responses
- Invalid photo flow
- No-candidate flow
- Three valid recommendations returned
- Feedback persisted

## 16.3 AI evaluation set

Create at least 20 test cases with consented or licensed images and a controlled catalogue. For each case, record human reviewer labels:

- Strong match
- Acceptable match
- Poor match
- Size believable
- Size uncertain
- Explanation helpful
- Hallucinated claim

Initial success criteria:

- At least one top-three product judged suitable in 70% or more of test cases
- Zero invented product/variant IDs
- Zero unavailable variants displayed
- Less than 5% schema failures after bounded retry
- Recommendation latency acceptable for a prototype
- Users perceive results as better than colour filtering alone

## 16.4 Evaluation logging

For every recommendation, log:

- Prompt/version identifier
- Model identifier
- Catalogue version
- Candidate IDs
- AI output
- Validated final output
- Latency
- Token usage/cost where available
- User feedback

Do not log the raw customer image longer than required.

---

# 17. Development plan

## Milestone 0: Repository and CSV inspection

Deliverables:

- Next.js TypeScript project
- `.env.example`
- CSV inspection script
- Generated inspection report
- Final normalised TypeScript schema

Acceptance:

- The script reports real CSV headers and data-quality issues.
- No assumptions about option columns are hardcoded before inspection.

## Milestone 1: Catalogue normalisation

Deliverables:

- Shopify CSV parser
- Product/variant grouping
- Normalised JSON
- Unit tests

Acceptance:

- Product and variant counts match expected grouping.
- Images, sizes, colours, price, and availability are normalised.

## Milestone 2: Product intelligence batch

Deliverables:

- AI product-analysis provider
- Structured output schema
- Enrichment script
- Cached enriched JSON
- Low-confidence report

Acceptance:

- At least 20 products enriched.
- Re-running skips unchanged products.
- Invalid AI output is rejected.

## Milestone 3: Shopper vision prototype

Deliverables:

- Form with four required inputs
- Secure multipart endpoint
- Shopper photo-analysis provider
- Structured shopper profile
- Invalid-photo feedback

Acceptance:

- Usable photo returns structured profile.
- Cropped/unusable photo returns specific issues.

## Milestone 4: Recommendation pipeline

Deliverables:

- Candidate filtering
- Deterministic score components
- AI comparative ranking
- Backend hydration and validation
- Top-three UI

Acceptance:

- Only real, available products and variants are displayed.
- Recommendations include separate style and size confidence.
- Price and URL always come from catalogue data.

## Milestone 5: Evaluation

Deliverables:

- Evaluation-case format
- Test runner
- Feedback UI
- Results summary

Acceptance:

- At least 20 test cases run.
- Failure patterns are categorised.
- Decision made whether to add MediaPipe.

## Milestone 6: Shopify storefront prototype

Only begin after recommendation quality is acceptable.

Deliverables:

- Shopify app
- Product sync connector
- Theme app extension
- Storefront widget
- Add-to-cart action

Acceptance:

- Storefront shopper receives recommendations from live store inventory.
- Product changes can be resynchronised.

---

# 18. Codex implementation rules

Codex must follow these rules:

1. Work milestone by milestone; do not build the full SaaS at once.
2. Inspect the actual CSV before finalising its parser.
3. Use strict TypeScript and avoid `any` unless justified.
4. Validate external data and AI output with Zod.
5. Keep AI provider logic behind interfaces.
6. Never trust AI-generated product IDs, prices, URLs, size options, or availability.
7. Use catalogue data as the source of truth for commerce facts.
8. Store product intelligence and avoid repeated analysis.
9. Keep raw shopper photos temporary.
10. Do not infer sensitive attributes.
11. Keep model IDs and thresholds configurable.
12. Include unit and integration tests with each milestone.
13. Record architectural decisions in `docs/decisions/`.
14. Prefer a modular monolith; do not introduce microservices, queues, vectors, or multiple agents prematurely.
15. Stop and report when the CSV lacks required data rather than silently inventing it.

---

# 19. Ready-to-paste Codex master brief

```text
You are the lead engineer for a proof-of-concept called AI Style Agent.

GOAL
Build a Next.js + TypeScript application that reads a supplied Shopify product CSV, normalises and enriches a small men's T-shirt catalogue, accepts a shopper's height, weight, preferred colour, and clear full-body photo, and returns the top three real products most likely to suit the shopper. Each recommendation must include a real available variant, likely size, style score, style confidence, size confidence, concise reasons, and a fit-risk note when uncertain.

CRITICAL PRODUCT RULES
- The shopper supplies only height, weight, colour, and photo.
- Do not ask the shopper to manually select body type, shoulder shape, torso length, or fit.
- The system may reject an unusable photo and explain what is wrong.
- Do not claim guaranteed exact sizing from one photo.
- Separate style confidence from size confidence.
- Never invent products, variants, prices, images, URLs, sizes, or inventory.
- Catalogue data is the source of truth for commerce facts.
- Raw photos must be temporary and must not be used for training.

SCOPE
Initial scope is one Shopify CSV, 20-50 men's T-shirts, an internal web page, no authentication, no billing, no public Shopify app, no vector database, no custom-trained model, and no virtual try-on.

TECH STACK
- Next.js App Router
- TypeScript in strict mode
- Zod
- csv-parse
- OpenAI Node SDK through the Responses API, using image input and Structured Outputs; keep model names configurable
- Vitest or Jest for unit tests
- Playwright only where UI end-to-end testing is useful
- JSON files or SQLite for the first experiment

AI TASKS
1. Product intelligence batch: analyse product title, description, tags, and images once and return structured fashion attributes.
2. Shopper vision: analyse the shopper photo plus height and weight and return a structured fashion-relevant visual profile.
3. Recommendation ranking: compare a limited candidate set and return ranked product and variant IDs with reasons and confidence.
4. Conversational refinement is later and should not block the initial POC.

ARCHITECTURE
CSV -> inspection -> normalisation -> products.normalised.json -> product enrichment -> products.enriched.json.
Shopper form -> POST /api/recommend -> input validation -> photo analysis -> candidate filtering -> deterministic scoring -> AI comparative ranking -> backend validation/hydration -> top-three UI.

FIRST TASK
Do not start by writing the final parser. First:
1. Inspect the supplied CSV file.
2. Print headers, sample rows, row count, likely product grouping field, option fields, image fields, price fields, and inventory/availability fields.
3. Produce `docs/csv-inspection.md` with findings, ambiguities, and the proposed mapping.
4. Propose the final `NormalisedProduct` and `NormalisedVariant` schemas based on the actual file.
5. Then implement the parser with tests.

PROJECT STRUCTURE
Use the structure described in the technical specification. Keep modules for AI, catalogue ingestion, recommendation, validation, storage, and privacy. AI calls must be behind provider interfaces.

VALIDATION
All AI results must use strict structured schemas and be validated with Zod. After ranking, confirm every product and variant ID exists and is available. Hydrate title, image, URL, price, and currency from catalogue data only.

TESTS
Include tests for CSV grouping, option detection, candidate filtering, invalid AI output, hallucinated IDs, unavailable variants, and successful three-product recommendations.

WORKING STYLE
Implement one milestone at a time. Before modifying code, summarise the milestone and files to be changed. After each milestone, run lint, type-check, and tests; then report results and remaining risks. Do not introduce infrastructure that is outside the current milestone.
```

---

# 20. Decisions to postpone

Do not decide these until the POC produces credible results:

- Exact public product name
- Subscription pricing
- Multi-merchant data model details
- App Store submission
- Provider fallback strategy
- Custom model training
- MediaPipe integration
- Vector database
- Virtual try-on
- Women's apparel and additional categories
- Long-term profile storage

---

# 21. Technical references

1. OpenAI API - Images and vision: image inputs for multimodal analysis.
2. OpenAI API - Structured model outputs: JSON Schema-constrained responses.
3. OpenAI API - Function calling: controlled access to application functions.
4. Shopify - GraphQL Admin API: app and catalogue integration.
5. Shopify - Theme app extensions: storefront components without direct theme-code editing.
6. Shopify - App proxies: proxy storefront requests to an external app.
7. Shopify - API access scopes: request only required store permissions.
8. Google AI Edge - MediaPipe Pose Landmarker: body landmarks in image and 3D coordinates.

Official source URLs are included as hyperlinks in the DOCX version.
