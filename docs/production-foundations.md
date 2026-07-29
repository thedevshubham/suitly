# Production foundations

Suitly defines PostgreSQL/Drizzle tables for merchants, encrypted commerce
connections, canonical products, recommendation sessions, and feedback. Set
`DATABASE_URL` to activate a deployed database; database provisioning and
migration execution remain deployment operations.

Public storefront requests use short-lived HMAC-signed merchant session tokens,
an explicit origin allowlist, and per-merchant rate limiting. Production must
set a random `SUITLY_STOREFRONT_SESSION_SECRET` of at least 32 bytes.

Structured logging redacts authorization values, photos, image buffers, and
shopper profiles. The private object-storage interface guarantees deletion in a
`finally` path and can be implemented by R2, S3, or another S3-compatible
provider without changing shopper analysis.

The JSON repositories remain local-development adapters. Commerce credentials
must be encrypted before they enter the `commerce_connections` table.
