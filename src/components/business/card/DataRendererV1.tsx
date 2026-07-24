import type { DB } from "@db/generated/zod";
import type { JSX } from "solid-js/jsx-runtime";
import type { Accessor } from "solid-js/types/reactive/signal.js";
import type { ZodObject, ZodType } from "zod/v4";
import type { Dic } from "~/locales/type";

type TableName = keyof DB;

export type DataRendererProps<TTable extends TableName, T = DB[TTable]> = {
	// 数据本体属性
	entity: {
		// 物理表名与实体类型绑定，不能再使用普通 string。
		tableName: TTable;
		// 当前数据访问器
		data: Accessor<T>;
		// 数据 Schema
		dataSchema: ZodObject<{ [K in keyof T]: ZodType }>;
		// 主键：用于查询关联关系
		primaryKey: keyof T;
		// 字典
		dictionary: Accessor<Dic<T>>;
		// 隐藏字段：数据本体中需要隐藏的字段，外键关系由 references/referencedBy 独立展示
		hiddenFields?: Array<keyof T>;
		// 字段分组：用来提高阅读体验
		fieldGroupMap?: Record<string, Array<keyof T>>;
		// 字段生成器
		fieldRenderer?: Partial<{
			[K in keyof T]: (data: T, key: K, dictionary: Dic<T>) => JSX.Element;
		}>;
		// 可编辑性
		editAble: boolean;
		// 前置内容，通常是当前记录的控制器
		before?: (data: Accessor<T>, setDisplayData: (data: T | undefined) => void) => JSX.Element;
		// 后置内容
		after?: (data: Accessor<T>) => JSX.Element;
	};
	// 当前实体通过外键指向的目标记录
	references: {
		tableName: TableName;
		icon?: JSX.Element;
	}[];
	// 其他表通过外键指向当前实体的来源记录
	referencedBy: {}[];
};
