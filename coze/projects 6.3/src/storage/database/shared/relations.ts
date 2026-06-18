import { relations } from "drizzle-orm/relations";
import { userShops, alertRules, productCategories, priceRecords, alertHistory } from "./schema";

export const alertRulesRelations = relations(alertRules, ({one}) => ({
	userShop: one(userShops, {
		fields: [alertRules.shopId],
		references: [userShops.id]
	}),
}));

export const userShopsRelations = relations(userShops, ({many}) => ({
	alertRules: many(alertRules),
	alertHistories: many(alertHistory),
	productCategories: many(productCategories),
}));

export const priceRecordsRelations = relations(priceRecords, ({one}) => ({
	productCategory: one(productCategories, {
		fields: [priceRecords.categoryId],
		references: [productCategories.id]
	}),
}));

export const productCategoriesRelations = relations(productCategories, ({one, many}) => ({
	priceRecords: many(priceRecords),
	alertHistories: many(alertHistory),
	userShop: one(userShops, {
		fields: [productCategories.shopId],
		references: [userShops.id]
	}),
}));

export const alertHistoryRelations = relations(alertHistory, ({one}) => ({
	productCategory: one(productCategories, {
		fields: [alertHistory.categoryId],
		references: [productCategories.id]
	}),
	userShop: one(userShops, {
		fields: [alertHistory.shopId],
		references: [userShops.id]
	}),
}));