import { getDB } from "~/repositories/database";
import { DB } from "~/../db/kysely/kyesely";
import { ExpressionBuilder, sql } from "kysely";
import { DBDataConfig } from "~/routes/(app)/(functionPage)/wiki/dataConfig/dataConfig";
import { getDictionary } from "~/locales/i18n";
import { store } from "~/store";

// 定义可搜索的表和字段
type SearchableTables = "mob" | "skill" | "item" | "npc" | "zone" | "address" | "activity" | "armor" | "consumable" | "crystal" | "material" | "option" | "special" | "task" | "weapon";

type SearchConfig = {
  [K in SearchableTables]: {
    table: K;
    fields: (keyof DB[K])[];
    selectFields: readonly (keyof DB[K])[];
    isArrayField: boolean;
    isEnumField: boolean;
    joinWith?: string;
  }
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

export async function searchAllTables(searchString: string): Promise<SearchResults> {
  const db = await getDB();
  const dictionary = getDictionary(store.settings.language);
  
  // 定义要搜索的表和它们的字段
  const searchConfig = {
    mob: {
      table: "mob",
      fields: ["name"],
      selectFields: ["id", "name", "type", "baseLv"] as const,
      isArrayField: false,
      isEnumField: false
    },
    skill: {
      table: "skill",
      fields: ["name"],
      selectFields: ["id", "name", "treeType", "tier"] as const,
      isArrayField: false,
      isEnumField: false
    },
    item: {
      table: "item",
      fields: ["name", "itemType"],
      selectFields: ["id", "name", "itemType"] as const,
      isArrayField: false,
      isEnumField: false
    },
    npc: {
      table: "npc",
      fields: ["name"],
      selectFields: ["id", "name", "zoneId"] as const,
      isArrayField: false,
      isEnumField: false
    },
    zone: {
      table: "zone",
      fields: ["name"],
      selectFields: ["id", "name"] as const,
      isArrayField: false,
      isEnumField: false
    },
    address: {
      table: "address",
      fields: ["name"],
      selectFields: ["id", "name", "type"] as const,
      isArrayField: false,
      isEnumField: false
    },
    activity: {
      table: "activity",
      fields: ["name"],
      selectFields: ["id", "name"] as const,
      isArrayField: false,
      isEnumField: false
    },
    armor: {
      table: "armor",
      fields: ["itemId"],
      selectFields: ["itemId", "baseDef", "modifiers"] as const,
      isArrayField: false,
      isEnumField: false,
      joinWith: "item"
    },
    consumable: {
      table: "consumable",
      fields: ["itemId"],
      selectFields: ["itemId", "type", "effects"] as const,
      isArrayField: false,
      isEnumField: false,
      joinWith: "item"
    },
    crystal: {
      table: "crystal",
      fields: ["itemId"],
      selectFields: ["itemId", "type", "modifiers"] as const,
      isArrayField: false,
      isEnumField: false,
      joinWith: "item"
    },
    material: {
      table: "material",
      fields: ["itemId"],
      selectFields: ["itemId", "type", "ptValue"] as const,
      isArrayField: false,
      isEnumField: false,
      joinWith: "item"
    },
    option: {
      table: "option",
      fields: ["itemId"],
      selectFields: ["itemId", "baseDef", "modifiers"] as const,
      isArrayField: false,
      isEnumField: false,
      joinWith: "item"
    },
    special: {
      table: "special",
      fields: ["itemId"],
      selectFields: ["itemId", "baseDef", "modifiers"] as const,
      isArrayField: false,
      isEnumField: false,
      joinWith: "item"
    },
    task: {
      table: "task",
      fields: ["name"],
      selectFields: ["id", "name", "type", "description"] as const,
      isArrayField: false,
      isEnumField: false
    },
    weapon: {
      table: "weapon",
      fields: ["itemId"],
      selectFields: ["itemId", "type", "baseAbi", "modifiers"] as const,
      isArrayField: false,
      isEnumField: false,
      joinWith: "item"
    }
  } satisfies SearchConfig;

  const results: SearchResults = {};

  // 对每个表执行搜索
  for (const [tableName, config] of Object.entries(searchConfig)) {
    const table = tableName as SearchableTables;
    let query = db.selectFrom(config.table);
    
    // 如果需要关联查询
    if ('joinWith' in config) {
      query = query
        .innerJoin('item', (join) => join
          .onRef('item.id', '=', `${config.table}.itemId`)
          .on('item.name', 'like', `%${searchString}%`)
        );
    } else {
      // 构建 OR 条件
      const conditions = config.fields.map(field => {
        if (field === 'itemType') {
          // 对于枚举类型，只搜索非空值
          return sql<boolean>`${sql.ref(`${config.table}.${field}`)}::text LIKE ${'%' + searchString + '%'}`
        }
        return sql<boolean>`COALESCE(${sql.ref(`${config.table}.${field}`)}, '')::text LIKE ${'%' + searchString + '%'}`
      });
      query = query.where((eb) => eb.or(conditions));
    }
    
    const tableResults = await query
      .select(config.selectFields)
      .execute();

    if (tableResults.length > 0) {
      // 对于物品相关的表，使用 dataFetcher 获取完整数据
      if ('joinWith' in config) {
        const config = DBDataConfig(dictionary)[table];
        if (config?.dataFetcher) {
          const fullResults = await Promise.all(
            tableResults.map(async (result) => {
              try {
                const fullData = await config.dataFetcher(result.itemId);
                return fullData;
              } catch (error) {
                console.warn(`Failed to fetch data for ${table} with id ${result.itemId}:`, error);
                return null;
              }
            })
          );
          (results as any)[table] = fullResults.filter(Boolean);
        } else {
          (results as any)[table] = tableResults;
        }
      } else if (table === 'item') {
        // 对于 item 表，根据 itemType 将结果分配到对应的表中
        const itemResults = tableResults as { id: string; name: string; itemType: string }[];
        for (const item of itemResults) {
          // 确保 itemType 匹配映射中的键
          const targetTable = itemTypeToTable[item.itemType] as keyof SearchResults;
          if (targetTable) {
            const config = DBDataConfig(dictionary)[targetTable];
            if (config?.dataFetcher) {
              try {
                const fullData = await config.dataFetcher(item.id);
                if (!results[targetTable]) {
                  results[targetTable] = [] as any;
                }
                (results[targetTable] as any[]).push(fullData);
              } catch (error) {
                // console.warn(`Failed to fetch data for ${targetTable} with id ${item.id}:`, error);
              }
            }
          }
        }
      } else {
        (results as any)[table] = tableResults;
      }
    }
  }

  return results;
} 