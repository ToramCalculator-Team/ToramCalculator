import type { Expression, ExpressionBuilder } from "kysely";
import { z } from "zod/v4";
import type { DB } from "../generated/zod/index";

/**
 * RelationDef
 */
export type RelationDef<TTable extends keyof DB, TQuery, TSchema extends z.ZodType> = {
	schema: TSchema;
	build: (eb: ExpressionBuilder<DB, TTable>, id: Expression<string>) => TQuery;
};

/**
 * helper: 定义某张表的 relations
 */
export function defineRelations<
	TTable extends keyof DB,
	TDefs extends Record<string, RelationDef<TTable, any, z.ZodType>>,
>(defs: TDefs): TDefs {
	return defs;
}

/**
 * 工厂函数：把 relations 组合成 schema + subRelations
 */
export function makeRelations<
	TTable extends keyof DB,
	TDefs extends Record<string, RelationDef<TTable, any, z.ZodType>>,
>(defs: TDefs) {
	const schema = z.object(
		Object.fromEntries(Object.entries(defs).map(([k, v]) => [k, v.schema])) as {
			[K in keyof TDefs]: TDefs[K]["schema"];
		},
	);

	function subRelations(
		eb: ExpressionBuilder<DB, TTable>,
		id: Expression<string>,
	): ReturnType<TDefs[keyof TDefs]["build"]>[] {
		// 返回数组而不是对象，这样符合 Kysely select 方法的期望
		return Object.values(defs).map((def) => def.build(eb, id));
	}

	return { schema, subRelations };
}
