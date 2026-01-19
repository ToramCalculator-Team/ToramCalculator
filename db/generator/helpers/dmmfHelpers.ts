/**
 * @file dmmfHelpers.ts
 * @description DMMF 辅助工具类
 * 供生成器在生成阶段使用的工具方法
 */

import type { DMMF } from "@prisma/generator-helper";

/**
 * DMMF 辅助工具类
 */
export class DMMFHelpers {
	private models: readonly DMMF.Model[];
	private modelToTableMap: Map<string, string>;
	private tableToModelMap: Map<string, DMMF.Model>;

	constructor(models: readonly DMMF.Model[]) {
		this.models = models;

		// 构建映射表
		this.modelToTableMap = new Map();
		this.tableToModelMap = new Map();

		for (const model of models) {
			const tableName = model.dbName || model.name;
			this.modelToTableMap.set(model.name, tableName);
			this.tableToModelMap.set(tableName, model);
		}
	}

	/**
	 * 获取模型的主键字段
	 */
	getPrimaryKeys(modelOrTableName: string): string[] {
		const model = this.getModel(modelOrTableName);
		if (!model) return [];

		return model.fields.filter((field) => field.isId).map((field) => field.name);
	}

	/**
	 * 获取第一个主键字段
	 */
	getPrimaryKey(modelOrTableName: string): string | null {
		const keys = this.getPrimaryKeys(modelOrTableName);
		return keys.length > 0 ? keys[0] : null;
	}

	/**
	 * 获取模型
	 */
	getModel(modelOrTableName: string): DMMF.Model | undefined {
		// 先尝试作为表名查找
		const model = this.tableToModelMap.get(modelOrTableName);
		if (model) return model;

		// 再尝试作为模型名查找
		return this.models.find((m) => m.name === modelOrTableName);
	}

	/**
	 * 获取表名（从模型名）
	 */
	getTableName(modelName: string): string {
		return this.modelToTableMap.get(modelName) || modelName;
	}

	/**
	 * 获取模型名（从表名）
	 */
	getModelName(tableName: string): string | undefined {
		const model = this.tableToModelMap.get(tableName);
		return model?.name;
	}

	/**
	 * 判断关系类型
	 */
	getRelationType(field: DMMF.Field, model: DMMF.Model): "OneToOne" | "OneToMany" | "ManyToOne" | "ManyToMany" | null {
		if (field.kind !== "object") return null;

		// 查找目标模型
		const targetModel = this.models.find((m) => m.name === field.type);
		if (!targetModel) return null;

		// 查找反向字段
		const reverseField = targetModel.fields.find((f) => f.kind === "object" && f.relationName === field.relationName);

		const isList1 = field.isList || false;
		const isList2 = reverseField?.isList || false;

		if (isList1 && isList2) {
			return "ManyToMany";
		} else if (isList1 && !isList2) {
			return "OneToMany";
		} else if (!isList1 && isList2) {
			return "ManyToOne";
		} else {
			return "OneToOne";
		}
	}

	/**
	 * 获取多对多关系的中间表名
	 */
	getManyToManyTableName(field: DMMF.Field): string | null {
		if (!field.relationName) return null;

		const relationType = this.getRelationType(field, this.getModel(field.type)!);
		if (relationType !== "ManyToMany") return null;

		return `_${field.relationName}`;
	}

	/**
	 * 获取子关系字段
	 */
	getChildRelationFields(modelOrTableName: string): DMMF.Field[] {
		const model = this.getModel(modelOrTableName);
		if (!model) return [];

		return model.fields.filter((field) => field.kind === "object" && field.isList);
	}

	/**
	 * 获取父关系字段（外键字段）
	 */
	getParentRelationFields(modelOrTableName: string): DMMF.Field[] {
		const model = this.getModel(modelOrTableName);
		if (!model) return [];

		return model.fields.filter(
			(field) =>
				field.kind === "object" && !field.isList && field.relationFromFields && field.relationFromFields.length > 0,
		);
	}

	/**
	 * 获取所有关系字段
	 */
	getAllRelationFields(modelOrTableName: string): DMMF.Field[] {
		const model = this.getModel(modelOrTableName);
		if (!model) return [];

		return model.fields.filter((field) => field.kind === "object");
	}

	/**
	 * 检查是否为中间表
	 */
	isJoinTable(modelOrTableName: string): boolean {
		const tableName = this.modelToTableMap.get(modelOrTableName) || modelOrTableName;
		return tableName.startsWith("_");
	}

	/**
	 * 获取所有表名
	 */
	getAllTableNames(): string[] {
		return Array.from(this.tableToModelMap.keys());
	}

	/**
	 * 获取所有模型名
	 */
	getAllModelNames(): string[] {
		return this.models.map((m) => m.name);
	}

	/**
	 * 获取字段类型（用于外键关系）
	 */
	getFieldType(field: DMMF.Field): string {
		if (field.kind === "object") {
			// 对象类型，返回目标模型的主键类型
			const targetModel = this.getModel(field.type);
			if (targetModel) {
				const pkField = targetModel.fields.find((f) => f.isId);
				return pkField?.type || "String";
			}
		}
		return field.type;
	}

	/**
	 * 判断字段是否为外键
	 */
	isForeignKeyField(field: DMMF.Field): boolean {
		return (
			field.kind === "object" && !field.isList && !!field.relationFromFields && field.relationFromFields.length > 0
		);
	}
}
