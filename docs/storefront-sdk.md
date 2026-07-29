# Universal storefront SDK

The dependency-free `@suitly/storefront-sdk` package keeps storefront
integration independent of Next.js and any commerce platform.

```html
<suitly-recommender
  api-base-url="https://api.suitly.example"
  merchant-id="merchant_public_id"
></suitly-recommender>
```

Call `registerSuitlyWidget()` once after loading the package. Headless and
native integrations can use `SuitlyClient` directly. The widget emits a
`suitly:recommendations` custom event and lazy work begins only when the shopper
submits the form.

The included `examples/storefront-demo/index.html` proves the boundary from a
plain HTML page. A production build should publish the compiled browser module
to a CDN and issue a short-lived session token; merchant secrets never belong
in widget markup.
