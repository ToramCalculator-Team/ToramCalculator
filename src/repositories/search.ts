import { getDB } from "~/repositories/database";
import { DB } from "~/../db/kysely/kyesely";
import { ExpressionBuilder, sql } from "kysely";

// 定义可搜索的表和字段
type SearchableTables = "mob" | "skill" | "item" | "npc" | "zone" | "address";

type SearchConfig = {
  [K in SearchableTables]: {
    table: K;
    fields: (keyof DB[K])[];
    selectFields: readonly (keyof DB[K])[];
  }
};

type SearchResults = {
  [K in SearchableTables]?: DB[K][];
};

export async function searchAllTables(searchString: string): Promise<SearchResults> {
  const db = await getDB();
  
  // 定义要搜索的表和它们的字段
  const searchConfig = {
    mob: {
      table: "mob",
      fields: ["name", "details"],
      selectFields: ["id", "name", "type", "baseLv"] as const
    },
    skill: {
      table: "skill",
      fields: ["name", "details"],
      selectFields: ["id", "name", "treeType", "tier"] as const
    },
    item: {
      table: "item",
      fields: ["name", "details"],
      selectFields: ["id", "name", "type"] as const
    },
    npc: {
      table: "npc",
      fields: ["name"],
      selectFields: ["id", "name", "zoneId"] as const
    },
    zone: {
      table: "zone",
      fields: ["name"],
      selectFields: ["id", "name", "linkZone"] as const
    },
    address: {
      table: "address",
      fields: ["name"],
      selectFields: ["id", "name", "type"] as const
    }
  } satisfies SearchConfig;

  const results: SearchResults = {};

  // 对每个表执行搜索
  for (const [tableName, config] of Object.entries(searchConfig)) {
    const table = tableName as SearchableTables;
    const query = db.selectFrom(config.table);
    
    // 构建 OR 条件
    const conditions = config.fields.map(field => 
      sql<boolean>`COALESCE(${sql.ref(`${config.table}.${field}`)}, '')::text LIKE ${'%' + searchString + '%'}`
    );
    
    const tableResults = await query
      .where((eb) => eb.or(conditions))
      .select(config.selectFields)
      .execute();

    if (tableResults.length > 0) {
      (results as any)[table] = tableResults;
    }
  }

  return results;
} 