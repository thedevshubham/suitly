import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const merchants = pgTable(
  'merchants',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    publicId: text('public_id').notNull(),
    allowedOrigins: text('allowed_origins').array().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex('merchants_public_id_idx').on(table.publicId)],
);

export const commerceConnections = pgTable(
  'commerce_connections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    merchantId: text('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'cascade' }),
    platform: text('platform').notNull(),
    shopDomain: text('shop_domain').notNull(),
    encryptedCredentials: text('encrypted_credentials').notNull(),
    active: boolean('active').notNull().default(true),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('commerce_connection_shop_idx').on(
      table.platform,
      table.shopDomain,
    ),
  ],
);

export const products = pgTable(
  'products',
  {
    id: text('id').primaryKey(),
    merchantId: text('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'cascade' }),
    source: text('source').notNull(),
    externalId: text('external_id'),
    handle: text('handle').notNull(),
    title: text('title').notNull(),
    canonicalData: jsonb('canonical_data').notNull(),
    intelligence: jsonb('intelligence'),
    active: boolean('active').notNull(),
    sourceUpdatedAt: timestamp('source_updated_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('products_merchant_source_idx').on(
      table.merchantId,
      table.source,
      table.externalId,
    ),
    index('products_merchant_active_idx').on(table.merchantId, table.active),
  ],
);

export const recommendationSessions = pgTable(
  'recommendation_sessions',
  {
    id: text('id').primaryKey(),
    merchantId: text('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'cascade' }),
    audience: text('audience').notNull(),
    category: text('category').notNull(),
    photoStatus: text('photo_status').notNull(),
    usedFallback: boolean('used_fallback').notNull(),
    productIds: text('product_ids').array().notNull(),
    totalMs: integer('total_ms').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('recommendations_merchant_created_idx').on(
      table.merchantId,
      table.createdAt,
    ),
  ],
);

export const feedback = pgTable(
  'recommendation_feedback',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    recommendationId: text('recommendation_id')
      .notNull()
      .references(() => recommendationSessions.id, { onDelete: 'cascade' }),
    productId: text('product_id').notNull(),
    signal: text('signal').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('feedback_recommendation_idx').on(table.recommendationId)],
);
