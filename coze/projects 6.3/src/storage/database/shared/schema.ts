import { pgTable, index, foreignKey, serial, integer, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const alertRules = pgTable("alert_rules", {
	id: serial().primaryKey().notNull(),
	shopId: integer("shop_id").notNull(),
	ruleType: text("rule_type").notNull(),
	thresholdValue: numeric("threshold_value", { precision: 10, scale:  2 }).notNull(),
	isEnabled: boolean("is_enabled").default(true).notNull(),
	quietHoursStart: text("quiet_hours_start"),
	quietHoursEnd: text("quiet_hours_end"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("alert_rules_is_enabled_idx").using("btree", table.isEnabled.asc().nullsLast().op("bool_ops")),
	index("alert_rules_shop_id_idx").using("btree", table.shopId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.shopId],
			foreignColumns: [userShops.id],
			name: "alert_rules_shop_id_user_shops_id_fk"
		}).onDelete("cascade"),
]);

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const priceRecords = pgTable("price_records", {
	id: serial().primaryKey().notNull(),
	categoryId: integer("category_id").notNull(),
	price: numeric({ precision: 12, scale:  2 }).notNull(),
	recordedAt: timestamp("recorded_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("price_records_category_id_idx").using("btree", table.categoryId.asc().nullsLast().op("int4_ops")),
	index("price_records_recorded_at_idx").using("btree", table.recordedAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [productCategories.id],
			name: "price_records_category_id_product_categories_id_fk"
		}).onDelete("cascade"),
]);

export const alertHistory = pgTable("alert_history", {
	id: serial().primaryKey().notNull(),
	categoryId: integer("category_id").notNull(),
	shopId: integer("shop_id").notNull(),
	oldPrice: numeric("old_price", { precision: 12, scale:  2 }).notNull(),
	newPrice: numeric("new_price", { precision: 12, scale:  2 }).notNull(),
	changePercent: numeric("change_percent", { precision: 6, scale:  2 }).notNull(),
	isRead: boolean("is_read").default(false).notNull(),
	shopUrl: text("shop_url").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("alert_history_category_id_idx").using("btree", table.categoryId.asc().nullsLast().op("int4_ops")),
	index("alert_history_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("alert_history_is_read_idx").using("btree", table.isRead.asc().nullsLast().op("bool_ops")),
	index("alert_history_shop_id_idx").using("btree", table.shopId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [productCategories.id],
			name: "alert_history_category_id_product_categories_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.shopId],
			foreignColumns: [userShops.id],
			name: "alert_history_shop_id_user_shops_id_fk"
		}).onDelete("cascade"),
]);

export const userShops = pgTable("user_shops", {
	id: serial().primaryKey().notNull(),
	shopUrl: text("shop_url").notNull(),
	companyName: text("company_name").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("user_shops_company_name_idx").using("btree", table.companyName.asc().nullsLast().op("text_ops")),
]);

export const productCategories = pgTable("product_categories", {
	id: serial().primaryKey().notNull(),
	shopId: integer("shop_id").notNull(),
	productName: text("product_name").notNull(),
	currentPrice: numeric("current_price", { precision: 12, scale:  2 }),
	isMonitored: boolean("is_monitored").default(true).notNull(),
	lastUpdated: timestamp("last_updated", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	manufacturer: text(),
	isDeleted: boolean("is_deleted").default(false),
	priceChangePercent: numeric("price_change_percent"),
	previousPrice: numeric("previous_price"),
	thresholdType: text("threshold_type").default('percentage'),
	customThresholdValue: numeric("custom_threshold_value"),
	customUrgentThreshold: numeric("custom_urgent_threshold"),
	isCustomThreshold: boolean("is_custom_threshold").default(false),
	categoryLevel1: text("category_level1"),
}, (table) => [
	index("product_categories_is_monitored_idx").using("btree", table.isMonitored.asc().nullsLast().op("bool_ops")),
	index("product_categories_shop_id_idx").using("btree", table.shopId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.shopId],
			foreignColumns: [userShops.id],
			name: "product_categories_shop_id_user_shops_id_fk"
		}).onDelete("cascade"),
]);
