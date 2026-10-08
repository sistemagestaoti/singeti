import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const companies = sqliteTable("companies", {
  id: text("id").primaryKey(),
  corporateName: text("corporate_name").notNull(),
  tradeName: text("trade_name"),
  cnpj: text("cnpj").unique(),
  email: text("email"),
  phone: text("phone"),
  status: text("status").default("ACTIVE").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const roles = sqliteTable("roles", {
  id: text("id").primaryKey(),
  name: text("name").unique().notNull(),
  description: text("description"),
  permissions: text("permissions").notNull(),
  status: text("status").default("ACTIVE").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const departments = sqliteTable("departments", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  companyId: text("company_id").notNull().references(() => companies.id),
  status: text("status").default("ACTIVE").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  roleId: text("role_id").notNull().references(() => roles.id),
  companyId: text("company_id").notNull().references(() => companies.id),
  departmentId: text("department_id").references(() => departments.id),
  status: text("status").default("ACTIVE").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// We only need the core tables for MVP
