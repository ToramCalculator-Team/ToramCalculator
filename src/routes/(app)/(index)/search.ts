import type { DB } from "@db/generated/zod/index";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import { Kysely, sql } from "kysely";
import { Performance } from "~/lib/utils/performance";

// 定义可搜索的表和字段
type SearchableTables =
	| "mob"
	| "skill"
	| "item"
	| "npc"
	| "zone"
	| "address"
	| "activity"
	| "armor"
	| "consumable"
	| "crystal"
	| "material"
	| "option"
	| "special"
	| "task"
	| "weapon";

type SearchConfig = {
	[K in SearchableTables]: {
		table: K;
		fields: (keyof DB[K])[];
		selectFields: readonly (keyof DB[K])[];
		isArrayField: boolean;
		isEnumField: boolean;
		joinWith?: string;
	};
};

type SearchResults = {
	[K in SearchableTables]?: DB[K][];
};

// 物品类型到表的映射
const itemTypeToTable: Record<string, keyof DB> = {
	Weapon: "weapon",
	Armor: "armor",
	Option: "option",
	Special: "special",
	Crystal: "crystal",
	Consumable: "consumable",
	Material: "material",
};

// 使用性能监控装饰器包装搜索函数
export const searchAllTables = Performance.monitor(
	"search_all_tables",
	async (searchString: string): Promise<SearchResults> => {
		const searchId = createId();
		console.log(`🔍 [搜索] 开始搜索: "${searchString}" (ID: ${searchId})`);

		// 数据库连接
		const db = await getDB();

		// 定义要搜索的表和它们的字段
		const searchConfig = {
			mob: {
				table: "mob",
				fields: ["name"],
				selectFields: ["id", "name", "type", "baseLv"] as const,
				isArrayField: false,
				isEnumField: false,
			},
			skill: {
				table: "skill",
				fields: ["name"],
				selectFields: ["id", "name", "treeType", "tier"] as const,
				isArrayField: false,
				isEnumField: false,
			},
			item: {
				table: "item",
				fields: ["name", "itemType"],
				selectFields: ["id", "name", "itemType"] as const,
				isArrayField: false,
				isEnumField: false,
			},
			npc: {
				table: "npc",
				fields: ["name"],
				selectFields: ["id", "name", "zoneId"] as const,
				isArrayField: false,
				isEnumField: false,
			},
			zone: {
				table: "zone",
				fields: ["name"],
				selectFields: ["id", "name"] as const,
				isArrayField: false,
				isEnumField: false,
			},
			address: {
				table: "address",
				fields: ["name"],
				selectFields: ["id", "name", "type"] as const,
				isArrayField: false,
				isEnumField: false,
			},
			activity: {
				table: "activity",
				fields: ["name"],
				selectFields: ["id", "name"] as const,
				isArrayField: false,
				isEnumField: false,
			},
			armor: {
				table: "armor",
				fields: ["itemId"],
				selectFields: ["itemId", "baseAbi", "modifiers"] as const,
				isArrayField: false,
				isEnumField: false,
				joinWith: "item",
			},
			consumable: {
				table: "consumable",
				fields: ["itemId"],
				selectFields: ["itemId", "type", "effects"] as const,
				isArrayField: false,
				isEnumField: false,
				joinWith: "item",
			},
			crystal: {
				table: "crystal",
				fields: ["itemId"],
				selectFields: ["itemId", "type", "modifiers"] as const,
				isArrayField: false,
				isEnumField: false,
				joinWith: "item",
			},
			material: {
				table: "material",
				fields: ["itemId"],
				selectFields: ["itemId", "type", "ptValue"] as const,
				isArrayField: false,
				isEnumField: false,
				joinWith: "item",
			},
			option: {
				table: "option",
				fields: ["itemId"],
				selectFields: ["itemId", "baseAbi", "modifiers"] as const,
				isArrayField: false,
				isEnumField: false,
				joinWith: "item",
			},
			special: {
				table: "special",
				fields: ["itemId"],
				selectFields: ["itemId", "baseAbi", "modifiers"] as const,
				isArrayField: false,
				isEnumField: false,
				joinWith: "item",
			},
			task: {
				table: "task",
				fields: ["name"],
				selectFields: ["id", "name", "type", "description"] as const,
				isArrayField: false,
				isEnumField: false,
			},
			weapon: {
				table: "weapon",
				fields: ["itemId"],
				selectFields: ["itemId", "type", "baseAbi", "modifiers"] as const,
				isArrayField: false,
				isEnumField: false,
				joinWith: "item",
			},
		} satisfies SearchConfig;

		const results: SearchResults = {};

		// 对每个表执行搜索
		for (const [tableName, config] of Object.entries(searchConfig)) {
			const table = tableName as SearchableTables;

			let query = db.selectFrom(config.table);

			// 如果需要关联查询
			if ("joinWith" in config) {
				query = query.innerJoin("item", (join) =>
					join.onRef("item.id", "=", `${config.table}.itemId`).on("item.name", "like", `%${searchString}%`),
				);
			} else {
				// 构建 OR 条件
				const conditions = config.fields.map((field) => {
					if (field === "itemType") {
						// 对于枚举类型，只搜索非空值
						return sql<boolean>`${sql.ref(`${config.table}.${field}`)}::text LIKE ${`%${searchString}%`}`;
					}
					return sql<boolean>`COALESCE(${sql.ref(`${config.table}.${field}`)}, '')::text LIKE ${`%${searchString}%`}`;
				});
				query = query.where((eb) => eb.or(conditions));
			}

			const tableResults = await query.select(config.selectFields).execute();

			if (tableResults.length > 0) {
				// 对于物品相关的表，使用简化的数据获取
				if ("joinWith" in config) {
					const fullResults = await Promise.all(
						tableResults.map(async (result) => {
							try {
								return await getSimplifiedItemData(db, result.itemId, table);
							} catch (error) {
								console.warn(`Failed to fetch data for ${table} with id ${result.itemId}:`, error);
								return null;
							}
						}),
					);
					(results as any)[table] = fullResults.filter(Boolean);
				} else if (table === "item") {
					// 对于 item 表，使用批量查询优化性能
					await processItemResults(db, tableResults, results);
				} else {
					(results as any)[table] = tableResults;
				}
			}
		}

		const totalResults = Object.values(results).reduce((sum, arr) => sum + (arr?.length || 0), 0);
		console.log(`✅ [搜索] 搜索完成，共找到 ${totalResults} 条结果`);

		return results;
	},
);

/**
 * 批量处理item结果，减少数据库调用次数
 */
const processItemResults = Performance.monitor(
	"process_item_results",
	async (db: Kysely<DB>, tableResults: any[], results: SearchResults) => {
		const itemResults = tableResults as { id: string; name: string; itemType: string }[];

		// 按itemType分组
		const groupedItems: Record<string, string[]> = {};
		itemResults.forEach((item) => {
			const targetTable = itemTypeToTable[item.itemType];
			if (targetTable) {
				if (!groupedItems[targetTable]) {
					groupedItems[targetTable] = [];
				}
				groupedItems[targetTable].push(item.id);
			}
		});

		// 批量查询每个类型的数据
		for (const [tableType, itemIds] of Object.entries(groupedItems)) {
			if (itemIds.length === 0) continue;

			try {
				// 批量查询item数据
				const items = await db.selectFrom("item").where("id", "in", itemIds).selectAll("item").execute();

				// 批量查询子表数据
				const subData = await db.selectFrom(tableType as keyof DB).where("itemId", "in", itemIds).selectAll().execute();

				// 合并数据
				const itemMap = new Map(items.map((item) => [item.id, item]));
				const subDataMap = new Map(subData.map((data) => [data.itemId, data]));

				const fullResults = itemIds
					.map((id) => {
						const item = itemMap.get(id);
						const sub = subDataMap.get(id);
						if (item && sub) {
							return { ...item, ...sub };
						}
						return null;
					})
					.filter(Boolean);

				if (!results[tableType as keyof SearchResults]) {
					results[tableType as keyof SearchResults] = [];
				}
				(results[tableType as keyof SearchResults] as any[]).push(...fullResults);
			} catch (error) {
				console.warn(`Failed to batch fetch data for ${tableType}:`, error);
			}
		}
	},
);

/**
 * 获取简化的物品数据，避免复杂的关联查询
 * 这个函数专门为搜索优化，只获取必要的信息
 */
const getSimplifiedItemData = Performance.monitor(
	"get_simplified_item_data",
	async (db: Kysely<DB>, itemId: string, tableType: keyof DB) => {
		// 获取基础物品信息
		const item = await db.selectFrom("item").where("id", "=", itemId).selectAll("item").executeTakeFirstOrThrow();

		// 获取子表数据
		const subData = await db.selectFrom(tableType).where("itemId", "=", itemId).selectAll().executeTakeFirstOrThrow();

		return {
			...item,
			...subData,
		};
	},
);
