import { pgTable, text, uuid, timestamp, boolean, index, unique, integer } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

// Keys table - user authentication keys
export const keys = pgTable('keys', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  key: text('key').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  lastTokenAt: timestamp('last_token_at', { withTimezone: true }),
  creditCents: integer('credit_cents').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
}, (table) => {
  return {
    keyIdx: unique('key_unique_idx').on(table.key),
  }
})

// Token reports - user reported invalid or problematic tokens
export const tokenReports = pgTable('token_reports', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  keyId: uuid('key_id').notNull().references(() => keys.id),
  tokenId: uuid('token_id').notNull().references(() => tokenPool.id),
  reportedAt: timestamp('reported_at', { withTimezone: true }).notNull().default(sql`now()`),
  reason: text('reason'),
  refundedAt: timestamp('refunded_at', { withTimezone: true }),
  refundAmount: integer('refund_amount'), // in cents
})

// Token pool - pre-uploaded tokens to distribute
export const tokenPool = pgTable('token_pool', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  value: text('value').notNull().unique(),
  assignedTo: uuid('assigned_to').references(() => keys.id),
  assignedAt: timestamp('assigned_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
}, (table) => {
  return {
    valueIdx: unique('token_value_unique_idx').on(table.value),
    unassignedIdx: index('unassigned_tokens_idx').on(table.assignedTo).where(sql`assigned_to IS NULL`),
  }
})

// Deliveries - audit log of token distribution
export const deliveries = pgTable('deliveries', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  keyId: uuid('key_id').notNull().references(() => keys.id),
  tokenId: uuid('token_id').notNull().references(() => tokenPool.id),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }).notNull().default(sql`now()`),
}, (table) => {
  return {
    tokenUniqueIdx: unique('delivery_token_unique_idx').on(table.tokenId),
  }
})

// System notices - admin-configurable announcements for users
export const notices = pgTable('notices', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  content: text('content').notNull(),
  displayMode: text('display_mode').notNull().default('modal'), // 'modal' | 'sidebar' | 'both'
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
})

// Relations
export const keysRelations = relations(keys, ({ many }) => ({
  assignedTokens: many(tokenPool),
  deliveries: many(deliveries),
  tokenReports: many(tokenReports),
}))

export const tokenPoolRelations = relations(tokenPool, ({ one }) => ({
  assignedKey: one(keys, {
    fields: [tokenPool.assignedTo],
    references: [keys.id],
  }),
  delivery: one(deliveries, {
    fields: [tokenPool.id],
    references: [deliveries.tokenId],
  }),
}))

export const deliveriesRelations = relations(deliveries, ({ one }) => ({
  key: one(keys, {
    fields: [deliveries.keyId],
    references: [keys.id],
  }),
  token: one(tokenPool, {
    fields: [deliveries.tokenId],
    references: [tokenPool.id],
  }),
}))

export const tokenReportsRelations = relations(tokenReports, ({ one }) => ({
  key: one(keys, {
    fields: [tokenReports.keyId],
    references: [keys.id],
  }),
  token: one(tokenPool, {
    fields: [tokenReports.tokenId],
    references: [tokenPool.id],
  }),
}))

// Types
export type Key = typeof keys.$inferSelect
export type NewKey = typeof keys.$inferInsert
export type TokenPool = typeof tokenPool.$inferSelect
export type NewTokenPool = typeof tokenPool.$inferInsert
export type Delivery = typeof deliveries.$inferSelect
export type NewDelivery = typeof deliveries.$inferInsert
export type Notice = typeof notices.$inferSelect
export type NewNotice = typeof notices.$inferInsert
export type TokenReport = typeof tokenReports.$inferSelect
export type NewTokenReport = typeof tokenReports.$inferInsert
