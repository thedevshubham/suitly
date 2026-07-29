# Shopify connector

The Shopify connector is an adapter over Suitly's canonical connector contract.
It uses the versioned GraphQL Admin API, paginates products, maps products and
variants into canonical schemas, and verifies product webhook HMACs against the
raw request body.

Current implementation defaults to Admin API `2026-07` and requests only
catalogue fields. A real app installation needs:

- a Shopify Partner/Dev Dashboard app;
- the merchant's `*.myshopify.com` domain;
- an offline OAuth access token encrypted at rest;
- required `read_products` scope;
- product create/update/delete webhook subscriptions; and
- deployment of the included theme app extension through Shopify CLI.

The extension is a thin wrapper around the universal widget. It contains no
recommendation logic and never receives the Admin API token.

The connector deliberately performs synchronization outside the shopper
request path. Live installation still requires merchant OAuth credentials and
must remain behind the real recommendation-review quality gate.
