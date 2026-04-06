import { pgTable, pgEnum, uuid, varchar, numeric, text, boolean, date, timestamp } from "drizzle-orm/pg-core"

// ─── Enums ───────────────────────────────────────────
export const roleEnum     = pgEnum("role",   ["viewer", "analyst", "admin"])
export const statusEnum   = pgEnum("status", ["active", "inactive"])
export const typeEnum     = pgEnum("type",   ["income", "expense"])

// ─── Users ───────────────────────────────────────────
export const users = pgTable("users", {
  id:         uuid("id").defaultRandom().primaryKey(),
  name:       varchar("name", { length: 255 }).notNull(),
  email:      varchar("email", { length: 255 }).notNull().unique(),
  password:   varchar("password", { length: 255 }).notNull(),
  role:       roleEnum("role").notNull().default("viewer"),
  status:     statusEnum("status").notNull().default("active"),
  createdAt:  timestamp("created_at").defaultNow()
})

// ─── Transactions ─────────────────────────────────────
export const transactions = pgTable("transactions", {
  id:         uuid("id").defaultRandom().primaryKey(),
  amount:     numeric("amount", { precision: 12, scale: 2 }).notNull(),
  type:       typeEnum("type").notNull(),
  category:   varchar("category", { length: 100 }).notNull(),
  date:       date("date").notNull(),
  notes:      text("notes"),
  createdBy:  uuid("created_by").references(() => users.id),
  isDeleted:  boolean("is_deleted").default(false),
  createdAt:  timestamp("created_at").defaultNow(),
  updatedAt:  timestamp("updated_at").defaultNow()
})
