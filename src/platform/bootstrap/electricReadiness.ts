import type { DB } from "@db/generated/zod/index";
import { createEffect, createRoot } from "solid-js";
import { store } from "~/store";

/** 判断指定业务表是否都完成了当前启动周期的 Electric 首轮同步。 */
export const areElectricTablesReady = (tableNames: readonly (keyof DB)[]): boolean =>
	tableNames.every((tableName) => store.database.hasInitialSnapshot[tableName] === true);

/**
 * 等待一组业务表完成首轮同步。
 * 该门闩只用于区分“同步尚未到达的空结果”和“同步完成后的真实空结果”，不能替代 live query。
 */
export const waitForElectricTables = (tableNames: readonly (keyof DB)[]): Promise<void> => {
	if (typeof window === "undefined" || areElectricTablesReady(tableNames)) return Promise.resolve();

	return new Promise<void>((resolve) => {
		createRoot((dispose) => {
			createEffect(() => {
				if (!areElectricTablesReady(tableNames)) return;
				dispose();
				resolve();
			});
		});
	});
};
