import type { DMMF } from "@prisma/generator-helper";

export type BusinessRelationDirection = "parent" | "child";

/**
 * 判断关系字段是否把目标模型声明为当前模型的业务父级。
 *
 * `belongTo*` 表达当前记录归入目标记录；`usedBy*` 虽然写在被使用的
 * 模型上，但字段指向的是使用当前记录的上层业务数据。`createdBy`、
 * `updatedBy` 和 `*Owner` 同样只标记依赖方向。
 *
 * 这些命名不声明资产所有权或删除传播；是否级联、限制或清空外键，
 * 始终只读取 Prisma 关系上的 `onDelete`。
 */
export function isBusinessParentRelationField(fieldName: string): boolean {
	return (
		fieldName.startsWith("belongTo") ||
		fieldName.startsWith("usedBy") ||
		fieldName === "createdBy" ||
		fieldName === "updatedBy" ||
		fieldName.endsWith("Owner")
	);
}

/**
 * 按同一关系的两端字段共同判断当前字段方向。
 *
 * `child` 不是“没有命中 parent”的默认分支，而是反向字段明确声明
 * `parent` 后得到的对偶方向。这样 `preSkill/nextSkills` 等普通引用不会
 * 因外键位置或列表形态被误收进业务层级。
 */
export function classifyBusinessRelation(
	fieldName: string,
	reverseFieldName?: string,
): BusinessRelationDirection | null {
	const fieldIsParent = isBusinessParentRelationField(fieldName);
	const reverseIsParent = reverseFieldName ? isBusinessParentRelationField(reverseFieldName) : false;

	if (fieldIsParent && reverseIsParent) {
		throw new Error(`关系两端不能同时声明为业务父级：${fieldName} / ${reverseFieldName}`);
	}

	if (fieldIsParent) return "parent";
	if (reverseIsParent) return "child";
	// 两端都没有业务命名时保留为普通数据库引用，仅由外键元数据描述。
	return null;
}

/**
 * 定位同一 Prisma 关系在目标模型上的反向导航字段。
 *
 * 同一对模型之间可能存在多条关系，自关联的两端类型又完全相同，因此
 * 不能只按模型类型查找；`relationName` 才是 Prisma 为关系两端提供的
 * 稳定配对标识。
 */
export function findReverseRelationField(
	allModels: readonly DMMF.Model[],
	model: DMMF.Model,
	field: DMMF.Field,
): DMMF.Field | undefined {
	const targetModel = allModels.find((candidate) => candidate.name === field.type);
	if (!targetModel) return undefined;

	return targetModel.fields.find(
		(candidate) =>
			candidate !== field &&
			candidate.kind === "object" &&
			candidate.type === model.name &&
			candidate.relationName === field.relationName,
	);
}

/** 根据关系两端的命名约定返回当前字段的业务父子方向。 */
export function getBusinessRelationDirection(
	allModels: readonly DMMF.Model[],
	model: DMMF.Model,
	field: DMMF.Field,
): BusinessRelationDirection | null {
	const reverseField = findReverseRelationField(allModels, model, field);
	return classifyBusinessRelation(field.name, reverseField?.name);
}
