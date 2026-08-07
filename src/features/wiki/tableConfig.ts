/**
 * wiki 表配置装配层：把「表名」解析成渲染一张卡片/一份表单所需的全部运行时事实。
 *
 * 单独成文件是为了让卡片导航（wikiCardNav）与表单导航（wikiFormSheet）都能依赖它，
 * 而两者互不依赖 —— 卡片里要开表单、表单里要开卡片，若配置装配住在其中任一侧就会成环。
 */

import { defaultData } from "@db/defaultData";
import { FOREIGN_KEY_RELATIONS, getPrimaryKeys } from "@db/generated/dmmf-utils";
import {
	type RepositoryReader,
	type RepositoryWriter,
	repositoryReaders,
	repositoryWriters,
} from "@db/generated/repositories";
import { type DB, DBSchema } from "@db/generated/zod/index";
import { DATA_CONFIG, type TableDataConfig } from "~/dataConfig/data-config";
import type { ZodSchemaFor } from "~/lib/utils/zod";
import type { Dic, Dictionary } from "~/locales/type";

export type TableConfig<TTableName extends keyof DB, T extends DB[TTableName] = DB[TTableName]> = {
	tableName: TTableName;
	schema: ZodSchemaFor<T>;
	dic: Dic<T>;
	readers: RepositoryReader<TTableName>;
	writers: RepositoryWriter<TTableName>;
	defaultData: T;
	UIConfig: TableDataConfig<TTableName, T>;
};

export function createTableConfig<TTableName extends keyof DB>(
	tableName: TTableName,
	dictionary: Dictionary,
): TableConfig<TTableName> | undefined {
	const UIConfig = DATA_CONFIG[tableName]?.(dictionary);
	if (!UIConfig) return;
	return {
		tableName,
		schema: DBSchema[tableName],
		dic: dictionary.db[tableName],
		readers: repositoryReaders[tableName],
		writers: repositoryWriters[tableName],
		defaultData: defaultData[tableName],
		UIConfig,
	} as TableConfig<TTableName>;
}

/** 表的首个主键列名（本项目所有 wiki 表都是单列主键）。 */
export const getTablePrimaryKey = <TTableName extends keyof DB>(tableName: TTableName): keyof DB[TTableName] =>
	(getPrimaryKeys(tableName)[0] ?? "id") as keyof DB[TTableName];

/**
 * 从一行数据里取主键值字符串；取不到（行为空 / 主键为空串）时返回 undefined，
 * 让调用方能用一次 Show/if 同时排掉"还没加载"和"主键缺失"两种情况。
 */
export function getRowPrimaryKeyValue(
	tableName: keyof DB,
	row: Record<string, unknown> | undefined,
): string | undefined {
	if (!row) return undefined;
	const pk = String(getTablePrimaryKey(tableName));
	return String(row[pk] ?? "") || undefined;
}

/**
 * 主键列是否同时是指向别表的外键。
 *
 * 子类型表（armor / weapon / consumable ... 的 `itemId`）用父表 item 的主键做自己的主键，
 * 这类主键必须沿用调用方给的值；只有"自有主键"的表才允许在新建时补生成。
 */
export function isPrimaryKeyForeign(tableName: keyof DB): boolean {
	const pk = String(getTablePrimaryKey(tableName));
	return FOREIGN_KEY_RELATIONS.some((r) => r.sourceTable === tableName && r.sourceColumns.includes(pk));
}
