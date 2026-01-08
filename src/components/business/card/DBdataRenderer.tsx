import {
	getChildRelationNames,
	getManyToManyTableName,
	getPrimaryKeys,
	getRelationType,
	MODEL_METADATA,
	RELATION_METADATA,
} from "@db/generated/dmmf-utils";
import { repositoryMethods } from "@db/generated/repositories";
import type { DB } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { Transaction } from "kysely";
import { createMemo, createResource, createSignal, For, type JSX, Show } from "solid-js";
import { ZodAny, type ZodObject, type ZodType } from "zod/v4";
import { Button } from "~/components/controls/button";
import type { FieldGenMap } from "~/components/dataDisplay/objRender";
import { Icons } from "~/components/icons";
import { getDictionary } from "~/locales/i18n";
import type { Dic, dictionary, EnumFieldDetail } from "~/locales/type";
import { setStore, store } from "~/store";

// 辅助：判断某表是否包含 name 字段
function modelHasNameField(tableName: string): boolean {
	const model = MODEL_METADATA.find((m) => m.tableName === tableName);
	return !!model?.fields.some((f) => f.name === "name");
}

// 辅助：在某表的关系中，寻找指向“带 name 的表”的 ManyToOne 关系
function findNameSideRelation(fromTable: string) {
	const candidates = RELATION_METADATA.filter(
		(r) => r.from === fromTable && r.type === "ManyToOne" && modelHasNameField(r.to),
	);
	return candidates[0];
}

// 辅助：从记录中提取可读名称
function getReadableName(tableName: string, record: any): string {
	// 1) 常见 name 字段
	if (typeof record?.name === "string" && record.name) return record.name;

	// 2) 常见候选字段
	const candidates = ["title", "label", "displayName", "subName"] as const;
	for (const key of candidates) {
		if (typeof record?.[key] === "string" && record[key]) return String(record[key]);
	}

	// 3) 任意字符串字段（优先 required）
	const model = MODEL_METADATA.find((m) => m.tableName === tableName);
	if (model) {
		const stringFields = model.fields.filter((f) => f.kind !== "object");
		const requiredString = stringFields.find((f) => typeof record?.[f.name] === "string" && f.isRequired);
		if (requiredString) return String(record[requiredString.name as keyof typeof record]);
		const anyString = stringFields.find((f) => typeof record?.[f.name] === "string");
		if (anyString) return String(record[anyString.name as keyof typeof record]);
	}

	// 4) 兜底主键值
	const pk = getPrimaryKeys(tableName as keyof DB)[0];
	return String(record?.[pk as keyof typeof record] ?? "");
}

// 辅助：根据关系字段名和类型计算前缀文本键
function getRelationPrefixKey(
	currentTable: string,
	targetTable: string,
	relationName: string,
	relationType: "OneToMany" | "ManyToOne" | "OneToOne" | "ManyToMany",
): keyof dictionary["ui"]["relationPrefix"] {
	const currentModel = MODEL_METADATA.find((m) => m.tableName === currentTable);
	const targetModel = MODEL_METADATA.find((m) => m.tableName === targetTable);
	const currentModelName = currentModel?.name || currentTable;
	const targetModelName = targetModel?.name || targetTable;

	// 尝试找到关系字段：先在当前模型中查找，如果找不到则在目标模型中查找
	let field = currentModel?.fields.find(
		(f) => f.kind === "object" && f.relationName === relationName && f.type === targetModelName,
	);

	// 如果当前模型中找不到，尝试在目标模型中查找（反向关系）
	if (!field) {
		field = targetModel?.fields.find(
			(f) => f.kind === "object" && f.relationName === relationName && f.type === currentModelName,
		);
	}

	const fieldName = field?.name?.toLowerCase() || "";

	// 只根据字段名前缀判断（不依赖关系类型）
	if (fieldName.startsWith("belongto")) return "belongsTo";
	if (fieldName.startsWith("usedby")) return "usedBy";
	if (fieldName.startsWith("updatedby")) return "updatedBy";
	if (fieldName.startsWith("createdby")) return "createdBy";
	if (fieldName.startsWith("link") || fieldName.includes("related")) return "related";

	// 没有明确前缀的字段，不显示前缀
	return "none";
}

// 辅助：关系是否被隐藏（根据当前表的 hiddenFields 判断关联字段是否隐藏）
function isRelationHidden(
	currentTable: keyof DB,
	relation: { name: string; to: string; from: string },
	otherSideModelName: string,
	hiddenFields?: ReadonlyArray<any>,
) {
	if (!hiddenFields || hiddenFields.length === 0) return false;
	const currentModel = MODEL_METADATA.find((m) => m.tableName === currentTable);
	if (!currentModel) return false;
	const relField = currentModel.fields.find(
		(f) => f.kind === "object" && f.relationName === relation.name && f.type === otherSideModelName,
	);
	if (!relField) return false;
	// 规则1：关系字段名在 hiddenFields 中
	const byName = (hiddenFields as ReadonlyArray<any>).includes(relField.name as any);
	// 规则2：该关系使用到的任意外键列在 hiddenFields 中（隐藏外键 => 隐藏该关系）
	const byFk = Array.isArray(relField.relationFromFields)
		? relField.relationFromFields.some((fk) => (hiddenFields as ReadonlyArray<any>).includes(fk as any))
		: false;
	const hidden = byName || byFk;
	if (hidden) {
		// debug removed
	}
	return hidden;
}

export type DBdataRendererProps<TName extends keyof DB> = {
	tableName: TName;
	data: DB[TName];
	dataSchema: ZodObject<Record<keyof DB[TName], ZodType>>;
	hiddenFields?: Array<keyof DB[TName]>;
	fieldGroupMap?: Record<string, Array<keyof DB[TName]>>;
	fieldGenerator?: FieldGenMap<DB[TName]>;
	before?: (
		data: DB[TName],
		setData: (data: DB[TName]) => void,
		dataSchema: ZodObject<Record<keyof DB[TName], ZodType>>,
		dictionary: Dic<DB[TName]>,
	) => JSX.Element;
	after?: (
		data: DB[TName],
		setData: (data: DB[TName]) => void,
		dataSchema: ZodObject<Record<keyof DB[TName], ZodType>>,
		dictionary: Dic<DB[TName]>,
	) => JSX.Element;
};

export function DBdataRenderer<TName extends keyof DB>(props: DBdataRendererProps<TName>) {
	// UI文本字典
	const dictionary = createMemo(() => getDictionary(store.settings.userInterface.language));

	const [data, setData] = createSignal<DB[TName]>(props.data);
	const primaryKey = getPrimaryKeys(props.tableName)[0];
	const [canEdit, { refetch: refetchCanEdit }] = createResource(async () => {
		// 主键字段的值总是 string 类型
		const canEdit = await repositoryMethods[props.tableName].canEdit?.(String(data()[primaryKey]));
		return canEdit;
	});

	const fieldRenderer = (key: keyof DB[TName], val: DB[TName][typeof key]) => {
		// 跳过需要隐藏的字段（直接命中或通过其关联外键命中）
		if (props.hiddenFields?.some((hiddenField) => hiddenField === key)) return null;
		// 如果该字段是关系对象，且其 relationFromFields 中任意外键在 hiddenFields 中，也隐藏
		const model = MODEL_METADATA.find((m) => m.tableName === props.tableName);
		const relFieldMeta = model?.fields.find((f) => f.name === (key as string));
		if (
			relFieldMeta?.kind === "object" &&
			Array.isArray(relFieldMeta.relationFromFields) &&
			props.hiddenFields?.some((hf) => relFieldMeta.relationFromFields!.includes(hf as any))
		) {
			return null;
		}
		// 如果该关系字段或对应的外键字段已在关联内容中显示，则隐藏主内容中的该字段
		// （关系字段本身和对应的外键字段都已在 displayedRelationFieldNames 中）
		if (displayedRelationFieldNames().has(key as string)) {
			return null;
		}
		const fieldName = dictionary().db[props.tableName].fields[key].key ?? key;
		const fieldValue = val;
		const hasGenerator = "fieldGenerator" in props && props.fieldGenerator?.[key];

		// 处理嵌套结构
		if (props.dataSchema.shape[key].type === "array") {
			const content = Object.entries(val as Record<string, unknown>);
			return hasGenerator ? (
				props.fieldGenerator?.[key]?.(data(), key, dictionary().db[props.tableName])
			) : (
				<div class="Field flex flex-col gap-2">
					<span class="Title text-main-text-color text-nowrap">{String(fieldName)}</span>
					<Show when={content.length > 0}>
						<div class="List bg-area-color rounded-md p-2">
							<For each={content}>
								{([key, val]) => (
									<div class="Field flex gap-1">
										<span class="text-boundary-color w-3 text-sm text-nowrap">{key}</span>
										&nbsp;:&nbsp;
										<span class="text-sm text-nowrap">{String(val)}</span>
									</div>
								)}
							</For>
						</div>
					</Show>
				</div>
			);
		}

		return hasGenerator ? (
			props.fieldGenerator?.[key]?.(data(), key, dictionary().db[props.tableName])
		) : (
			<div class="Field flex gap-2">
				<span class="text-main-text-color text-nowrap">{String(fieldName)}</span>:
				<span class="font-bold">
					{props.dataSchema.shape[key].type === "enum"
						? (dictionary().db[props.tableName].fields[key] as EnumFieldDetail<any>).enumMap[val]
						: String(fieldValue)}
				</span>
				{/* <span class="text-dividing-color w-full text-right">{`[${kind}]`}</span> */}
			</div>
		);
	};

	const tableInfo = MODEL_METADATA.find((model) => model.tableName === props.tableName);
	if (!tableInfo) throw new Error(`Table ${props.tableName} not found in MODEL_METADATA`);

	// 关系候选：包含当前表作为 from 或 to 的所有关系，用于同时展示子关系与父关系
	const relationCandidates = RELATION_METADATA.filter((r) => r.from === props.tableName || r.to === props.tableName);
	const currentPrimaryKey = getPrimaryKeys(props.tableName)[0];
	const currentPrimaryKeyValue = props.data[currentPrimaryKey];

	const [relations, { refetch: refetchRelations }] = createResource(async () => {
		type RelationItem = { data: any; displayName: string };
		type RelationGroup = {
			tableName: keyof DB;
			prefixKey: keyof dictionary["ui"]["relationPrefix"];
			items: RelationItem[];
			isParent: boolean;
		};
		type RelationsResult = { groups: RelationGroup[]; displayedRelationFieldNames: Set<string> };
		const groupMap = new Map<
			keyof DB,
			{
				prefixKey: keyof dictionary["ui"]["relationPrefix"];
				items: RelationItem[];
				seen: Set<string>;
				isParent: boolean;
			}
		>();
		const displayedRelationFieldNames = new Set<string>();

		if (relationCandidates.length === 0) return { groups: [] as RelationGroup[], displayedRelationFieldNames };

		const db = await getDB();

		// 预构建当前记录的可读前缀：当前表指向的所有“带 name 的父表”的名称拼接
		let currentLabel = "";
		try {
			const parentNameRels = RELATION_METADATA.filter(
				(r) => r.from === props.tableName && r.type === "ManyToOne" && modelHasNameField(r.to),
			);
			const parts: string[] = [];
			for (const rel of parentNameRels) {
				// 在当前表中找到对应的外键列
				const currentModel = MODEL_METADATA.find((m) => m.tableName === props.tableName)!;
				const fkField = currentModel.fields.find(
					(f) =>
						f.kind === "object" &&
						f.relationName === rel.name &&
						f.relationFromFields &&
						f.relationFromFields.length > 0,
				);
				const fkColumn = fkField?.relationFromFields?.[0];
				if (!fkColumn) continue;
				const relatedId = props.data[fkColumn as keyof typeof props.data];
				if (typeof relatedId === "undefined") continue;
				const pk = getPrimaryKeys(rel.to as keyof DB)[0];
				const rows = await db
					.selectFrom(rel.to as any)
					.select(["name" as any])
					.where(pk as any, "=", relatedId as any)
					.limit(1)
					.execute();
				const nm = rows[0]?.name as string | undefined;
				if (nm) parts.push(nm);
			}
			currentLabel = parts.join(" - ");
			// debug removed
		} catch {
			// debug removed
		}

		// 遍历所有涉及当前表的关系（包含 OneToMany/ManyToOne/ManyToMany）
		for (const relationMetadata of relationCandidates) {
			// 若该关系对应字段被隐藏，则跳过
			const otherTable = relationMetadata.from === props.tableName ? relationMetadata.to : relationMetadata.from;
			const otherModelName = MODEL_METADATA.find((m) => m.tableName === otherTable)?.name || otherTable;
			if (
				isRelationHidden(
					props.tableName,
					{ name: relationMetadata.name, to: relationMetadata.to, from: relationMetadata.from },
					otherModelName,
					props.hiddenFields as any,
				)
			) {
				// debug removed
				continue;
			}

			// 记录该关系会在关联内容中显示，以便在主内容中隐藏对应的关系字段和外键字段
			// 查找当前表中对应的关系字段名称
			const currentModel = MODEL_METADATA.find((m) => m.tableName === props.tableName);
			const relationField = currentModel?.fields.find(
				(f) => f.kind === "object" && f.relationName === relationMetadata.name,
			);
			if (relationField) {
				// 隐藏关系字段本身
				displayedRelationFieldNames.add(relationField.name);
				// 同时隐藏对应的外键字段
				if (relationField.relationFromFields && relationField.relationFromFields.length > 0) {
					for (const fkField of relationField.relationFromFields) {
						displayedRelationFieldNames.add(fkField);
					}
				}
			}
			const relationType = relationMetadata.type;
			// 从当前表视角确定目标表
			const targetTableName = relationMetadata.from === props.tableName ? relationMetadata.to : relationMetadata.from;
			const targetPrimaryKey = getPrimaryKeys(targetTableName as keyof DB)[0];

			// 判断是否是父关系：ManyToOne 且当前表有外键，或 OneToOne 且当前表有外键
			const isParentRelation =
				(relationType === "ManyToOne" &&
					relationMetadata.from === props.tableName &&
					relationMetadata.fromHasForeignKey) ||
				(relationType === "OneToOne" &&
					relationMetadata.from === props.tableName &&
					relationMetadata.fromHasForeignKey);

			try {
				let relationData: any[] = [];

				if (relationType === "ManyToMany") {
					// 多对多关系：通过中间表查询
					const intermediateTableName =
						relationMetadata.joinTable ||
						getManyToManyTableName(props.tableName, targetTableName, relationMetadata.name);

					if (!intermediateTableName) continue;

					// 获取中间表的元数据以确定字段名
					const intermediateTableInfo = MODEL_METADATA.find((m) => m.tableName === intermediateTableName);
					if (!intermediateTableInfo) continue;

					// 查找指向当前表和目标表的外键字段
					// 中间表有两个外键字段，分别指向两个相关表
					const currentTableModelName = tableInfo.name;
					const targetTableModelName = MODEL_METADATA.find((m) => m.tableName === targetTableName)?.name;

					// 查找指向当前表的字段（relationToFields 包含当前表的主键）
					const currentTableField = intermediateTableInfo.fields.find(
						(f) => f.relationName && f.relationToFields && f.type === currentTableModelName,
					);
					// 查找指向目标表的字段
					const targetTableField = intermediateTableInfo.fields.find(
						(f) => f.relationName && f.relationToFields && f.type === targetTableModelName,
					);

					// 如果找不到，则使用默认的 A/B 字段名（Prisma 隐式多对多表的约定）
					const currentTableFieldName =
						currentTableField?.relationFromFields?.[0] || (relationMetadata.from === props.tableName ? "A" : "B");
					const targetTableFieldName =
						targetTableField?.relationFromFields?.[0] || (relationMetadata.from === props.tableName ? "B" : "A");

					relationData = await (db as any)
						.selectFrom(intermediateTableName)
						.innerJoin(
							targetTableName,
							`${intermediateTableName}.${targetTableFieldName}`,
							`${targetTableName}.${targetPrimaryKey}`,
						)
						.where(`${intermediateTableName}.${currentTableFieldName}`, "=", currentPrimaryKeyValue)
						.selectAll(targetTableName)
						.execute();
				} else if (relationType === "OneToMany") {
					if (relationMetadata.from === props.tableName) {
						// 当前为父表：在目标表中查找外键指向当前主键
						const foreignKeyField = relationMetadata.toField;
						if (!foreignKeyField) continue;

						const targetTableInfo = MODEL_METADATA.find((m) => m.tableName === targetTableName);
						const foreignKeyMetadata = targetTableInfo?.fields.find((f) => f.name === foreignKeyField);
						if (!foreignKeyMetadata || !foreignKeyMetadata.relationFromFields) continue;

						const fkFieldName = foreignKeyMetadata.relationFromFields[0];
						relationData = await db
							.selectFrom(targetTableName as any)
							.where(fkFieldName as any, "=", currentPrimaryKeyValue)
							.selectAll()
							.execute();
					} else {
						// 当前为子表：查找父表单条记录（相当于 ManyToOne 查询父）
						const currentModel = MODEL_METADATA.find((m) => m.tableName === props.tableName)!;
						const currentFkField = currentModel.fields.find(
							(f) =>
								f.kind === "object" &&
								f.relationName === relationMetadata.name &&
								f.relationFromFields &&
								f.relationFromFields.length > 0,
						);
						const currentFkColumn = currentFkField?.relationFromFields?.[0];
						if (!currentFkColumn) continue;

						const parentId = props.data[currentFkColumn as keyof typeof props.data];
						if (typeof parentId === "undefined") continue;

						relationData = await db
							.selectFrom(targetTableName as any)
							.where(targetPrimaryKey as any, "=", parentId as any)
							.selectAll()
							.execute();
					}
				} else if (relationType === "ManyToOne") {
					if (relationMetadata.from === props.tableName) {
						// 当前为子表：通过本表外键查父表单条记录
						const currentModel = MODEL_METADATA.find((m) => m.tableName === props.tableName)!;
						const currentFkField = currentModel.fields.find(
							(f) =>
								f.kind === "object" &&
								f.relationName === relationMetadata.name &&
								f.relationFromFields &&
								f.relationFromFields.length > 0,
						);
						const currentFkColumn = currentFkField?.relationFromFields?.[0];
						if (!currentFkColumn) continue;

						const parentId = props.data[currentFkColumn as keyof typeof props.data];
						if (typeof parentId === "undefined") continue;

						relationData = await db
							.selectFrom(targetTableName as any)
							.where(targetPrimaryKey as any, "=", parentId as any)
							.selectAll()
							.execute();
					} else {
						// 当前为父表：在对侧（from 表）中查找引用当前主键的行
						const childTableName = relationMetadata.from;
						const childModel = MODEL_METADATA.find((m) => m.tableName === childTableName)!;
						const childFkField = childModel.fields.find(
							(f) =>
								f.kind === "object" &&
								f.relationName === relationMetadata.name &&
								f.relationFromFields &&
								f.relationFromFields.length > 0,
						);
						const childFkColumn = childFkField?.relationFromFields?.[0];
						if (!childFkColumn) continue;

						relationData = await db
							.selectFrom(childTableName as any)
							.where(childFkColumn as any, "=", currentPrimaryKeyValue)
							.selectAll()
							.execute();
						// 此时目标表名应为 child 表
						// 覆盖 target 变量用于后续显示（本分支只有本地作用域，改用局部变量）
						// 为简化，直接将查询结果归到 child 表的分组
						const key = childTableName as keyof DB;
						const childPk = getPrimaryKeys(key)[0];
						const prefixKey = getRelationPrefixKey(
							props.tableName as string,
							childTableName,
							relationMetadata.name,
							relationMetadata.type,
						);
						if (!groupMap.has(key)) groupMap.set(key, { prefixKey, items: [], seen: new Set(), isParent: false });
						const bucket = groupMap.get(key)!;
						// 如果当前关系是父关系，更新标记
						if (isParentRelation) bucket.isParent = true;
						// 如果已存在但 prefixKey 不同，优先保留更具体的（非 related）
						if (bucket.prefixKey === "related" && prefixKey !== "related") {
							bucket.prefixKey = prefixKey;
						}
						for (const item of relationData) {
							const id = String(item[childPk as keyof typeof item]);
							// 优先：子表本身有 name 字段，直接使用
							let finalName: string | undefined;
							if ("name" in item && typeof (item as any).name === "string" && (item as any).name) {
								finalName = (item as any).name as string;
							} else {
								// 次优：子表没有 name，先尝试使用 getReadableName（可能返回 id 或其他可读字段）
								const readableName = getReadableName(childTableName, item);
								const childPk = getPrimaryKeys(childTableName as keyof DB)[0];
								const itemId = String(item[childPk as keyof typeof item]);

								// 如果 getReadableName 返回的是 id，且 id 看起来不可读（CUID2/UUID 格式），
								// 才尝试通过关联表查找名称
								let betterName: string | undefined;
								// 判断 id 是否可读：CUID2 通常是 24-30 个字符的小写字母和数字组合
								// 或者以 "cuid_" 开头，或者长度 > 30（可能是 UUID）
								const isUnreadableId =
									readableName === itemId &&
									((itemId.length >= 24 &&
										itemId.length <= 30 &&
										/^[a-z0-9]+$/.test(itemId) &&
										!itemId.includes("default")) ||
										itemId.length > 30 ||
										itemId.startsWith("cuid_"));
								if (isUnreadableId) {
									// id 不可读，尝试通过 nameSide 关联查找名称
									const nameSide = findNameSideRelation(childTableName);
									if (nameSide) {
										const childModel = MODEL_METADATA.find((m) => m.tableName === childTableName)!;
										const fkField = childModel.fields.find(
											(f) =>
												f.kind === "object" &&
												f.relationName === nameSide.name &&
												f.relationFromFields &&
												f.relationFromFields.length > 0,
										);
										const fkColumn = fkField?.relationFromFields?.[0];
										if (fkColumn && item[fkColumn as keyof typeof item]) {
											const relatedId = item[fkColumn as keyof typeof item];
											const nameTablePk = getPrimaryKeys(nameSide.to as keyof DB)[0];
											const rows = await db
												.selectFrom(nameSide.to as any)
												.select(["name" as any])
												.where(nameTablePk as any, "=", relatedId as any)
												.limit(1)
												.execute();
											const relatedName = rows[0]?.name as string | undefined;
											if (relatedName) {
												betterName = relatedName;
											}
										}
									}
								}
								finalName = betterName ?? readableName;
							}

							if (bucket.seen.has(id)) {
								// 若已存在同 id 且旧名称等于 id，而新名称更可读，则升级显示名
								const idx = bucket.items.findIndex((x) => String(x.data[childPk as keyof typeof x.data]) === id);
								if (idx >= 0) {
									const oldIsId = bucket.items[idx].displayName === id;
									if (oldIsId && finalName !== id) bucket.items[idx].displayName = finalName;
								}
								continue;
							}
							bucket.seen.add(id);
							bucket.items.push({ data: item, displayName: finalName });
						}
						continue;
					}
				} else if (relationType === "OneToOne") {
					// OneToOne 关系处理
					if (relationMetadata.from === props.tableName) {
						// 当前表是 from 表
						if (relationMetadata.fromHasForeignKey) {
							// 当前表有外键字段：通过当前表的外键查询目标表
							const currentModel = MODEL_METADATA.find((m) => m.tableName === props.tableName)!;
							const currentFkField = currentModel.fields.find(
								(f) =>
									f.kind === "object" &&
									f.relationName === relationMetadata.name &&
									f.relationFromFields &&
									f.relationFromFields.length > 0,
							);
							const currentFkColumn = currentFkField?.relationFromFields?.[0];
							if (!currentFkColumn) continue;

							const targetId = props.data[currentFkColumn as keyof typeof props.data];
							if (typeof targetId === "undefined") continue;

							relationData = await db
								.selectFrom(targetTableName as any)
								.where(targetPrimaryKey as any, "=", targetId as any)
								.selectAll()
								.execute();
						} else {
							// 目标表（to）有外键字段：在目标表中查找外键指向当前主键的记录
							const targetModel = MODEL_METADATA.find((m) => m.tableName === targetTableName);
							if (!targetModel) continue;

							const targetFkField = targetModel.fields.find(
								(f) =>
									f.kind === "object" &&
									f.relationName === relationMetadata.name &&
									f.relationFromFields &&
									f.relationFromFields.length > 0,
							);
							const targetFkColumn = targetFkField?.relationFromFields?.[0];
							if (!targetFkColumn) continue;

							relationData = await db
								.selectFrom(targetTableName as any)
								.where(targetFkColumn as any, "=", currentPrimaryKeyValue)
								.selectAll()
								.execute();
						}
					} else {
						// 当前表是 to 表，from 表有外键指向当前表
						const fromTableName = relationMetadata.from;
						const fromModel = MODEL_METADATA.find((m) => m.tableName === fromTableName);
						if (!fromModel) continue;

						const fromFkField = fromModel.fields.find(
							(f) =>
								f.kind === "object" &&
								f.relationName === relationMetadata.name &&
								f.relationFromFields &&
								f.relationFromFields.length > 0,
						);
						const fromFkColumn = fromFkField?.relationFromFields?.[0];
						if (!fromFkColumn) continue;

						// 从 from 表中查找外键指向当前主键的记录
						relationData = await db
							.selectFrom(fromTableName as any)
							.where(fromFkColumn as any, "=", currentPrimaryKeyValue)
							.selectAll()
							.execute();

						// 更新 targetTableName 为 from 表（因为我们要显示的是 from 表的数据）
						const originalTargetTableName = targetTableName;
						// 注意：这里 targetTableName 实际上已经是 from 表了（因为 relationMetadata.from !== props.tableName）
						// 但为了保持一致性，我们使用 fromTableName
						const fromPk = getPrimaryKeys(fromTableName as keyof DB)[0];
						const prefixKey = getRelationPrefixKey(
							props.tableName as string,
							fromTableName,
							relationMetadata.name,
							relationMetadata.type,
						);
						if (!groupMap.has(fromTableName as keyof DB)) {
							groupMap.set(fromTableName as keyof DB, { prefixKey, items: [], seen: new Set(), isParent: false });
						}
						const bucket = groupMap.get(fromTableName as keyof DB)!;
						// 如果当前关系是父关系，更新标记
						if (isParentRelation) bucket.isParent = true;
						if (bucket.prefixKey === "related" && prefixKey !== "related") {
							bucket.prefixKey = prefixKey;
						}
						for (const item of relationData) {
							const id = String(item[fromPk as keyof typeof item]);
							let finalName: string | undefined;
							if ("name" in item && typeof (item as any).name === "string" && (item as any).name) {
								finalName = (item as any).name as string;
							} else {
								const readableName = getReadableName(fromTableName, item);
								const itemId = String(item[fromPk as keyof typeof item]);
								const isUnreadableId =
									readableName === itemId &&
									((itemId.length >= 24 &&
										itemId.length <= 30 &&
										/^[a-z0-9]+$/.test(itemId) &&
										!itemId.includes("default")) ||
										itemId.length > 30 ||
										itemId.startsWith("cuid_"));
								if (isUnreadableId) {
									const nameSide = findNameSideRelation(fromTableName);
									if (nameSide) {
										const fkField = fromModel.fields.find(
											(f) =>
												f.kind === "object" &&
												f.relationName === nameSide.name &&
												f.relationFromFields &&
												f.relationFromFields.length > 0,
										);
										const fkColumn = fkField?.relationFromFields?.[0];
										if (fkColumn && item[fkColumn as keyof typeof item]) {
											const relatedId = item[fkColumn as keyof typeof item];
											const nameTablePk = getPrimaryKeys(nameSide.to as keyof DB)[0];
											const rows = await db
												.selectFrom(nameSide.to as any)
												.select(["name" as any])
												.where(nameTablePk as any, "=", relatedId as any)
												.limit(1)
												.execute();
											const relatedName = rows[0]?.name as string | undefined;
											if (relatedName) {
												finalName = relatedName;
											}
										}
									}
								}
								finalName = finalName ?? readableName;
							}

							if (bucket.seen.has(id)) {
								const idx = bucket.items.findIndex((x) => String(x.data[fromPk as keyof typeof x.data]) === id);
								if (idx >= 0) {
									const oldIsId = bucket.items[idx].displayName === id;
									if (oldIsId && finalName !== id) bucket.items[idx].displayName = finalName;
								}
								continue;
							}
							bucket.seen.add(id);
							bucket.items.push({ data: item, displayName: finalName });
						}
						continue;
					}
				}

				// 处理查询到的关联数据
				for (const item of relationData) {
					let displayName: string | undefined;

					// 优先：目标表本身有 name 字段，直接使用（不拼接 currentLabel）
					if ("name" in item && typeof (item as any).name === "string" && (item as any).name) {
						displayName = (item as any).name as string;
					} else {
						// 次优：目标表没有 name，先尝试使用 getReadableName（可能返回 id 或其他可读字段）
						const readableName = getReadableName(targetTableName, item);
						const targetPk = getPrimaryKeys(targetTableName as keyof DB)[0];
						const itemId = String(item[targetPk as keyof typeof item]);

						// 如果 getReadableName 返回的是 id，且 id 看起来不可读（CUID2/UUID 格式），
						// 才尝试通过关联表查找名称
						// 判断 id 是否可读：CUID2 通常是 24-30 个字符的小写字母和数字组合
						// 或者以 "cuid_" 开头，或者长度 > 30（可能是 UUID）
						const isUnreadableId =
							readableName === itemId &&
							((itemId.length >= 24 &&
								itemId.length <= 30 &&
								/^[a-z0-9]+$/.test(itemId) &&
								!itemId.includes("default")) ||
								itemId.length > 30 ||
								itemId.startsWith("cuid_"));
						if (isUnreadableId) {
							// id 不可读，尝试通过 nameSide 关联查找名称
							const nameSide = findNameSideRelation(targetTableName);
							if (nameSide) {
								// 目标表（targetTableName）中，与 nameSide 关系对应的外键列名
								const targetModel = MODEL_METADATA.find((m) => m.tableName === targetTableName)!;
								const fkField = targetModel.fields.find(
									(f) =>
										f.kind === "object" &&
										f.relationName === nameSide.name &&
										f.relationFromFields &&
										f.relationFromFields.length > 0,
								);
								const fkColumn = fkField?.relationFromFields?.[0];

								if (fkColumn && item[fkColumn as keyof typeof item]) {
									const relatedId = item[fkColumn as keyof typeof item];
									const nameTablePk = getPrimaryKeys(nameSide.to as keyof DB)[0];
									const rows = await db
										.selectFrom(nameSide.to as any)
										.select(["name" as any])
										.where(nameTablePk as any, "=", relatedId as any)
										.limit(1)
										.execute();
									const relatedName = rows[0]?.name as string | undefined;

									if (relatedName) {
										displayName = relatedName;
									}
								}
							}
						}

						// 兜底：使用 getReadableName 的结果
						if (!displayName) {
							displayName = readableName;
						}
					}

					const key = targetTableName as keyof DB;
					const prefixKey = getRelationPrefixKey(
						props.tableName as string,
						targetTableName,
						relationMetadata.name,
						relationMetadata.type,
					);
					if (!groupMap.has(key)) groupMap.set(key, { prefixKey, items: [], seen: new Set(), isParent: false });
					const bucket = groupMap.get(key)!;
					// 如果当前关系是父关系，更新标记
					if (isParentRelation) bucket.isParent = true;
					// 如果已存在但 prefixKey 不同，优先保留更具体的（非 related）
					if (bucket.prefixKey === "related" && prefixKey !== "related") {
						bucket.prefixKey = prefixKey;
					}
					const id = String(item[targetPrimaryKey as keyof typeof item]);
					if (bucket.seen.has(id)) {
						// 如果已有同 id 项且旧名称是 id，而新 displayName 更可读，则升级
						const idx = bucket.items.findIndex((x) => String(x.data[targetPrimaryKey as keyof typeof x.data]) === id);
						if (idx >= 0) {
							const oldIsId = bucket.items[idx].displayName === id;
							if (oldIsId && displayName !== id) bucket.items[idx].displayName = displayName;
						}
					} else {
						bucket.seen.add(id);
						bucket.items.push({ data: item, displayName });
					}
				}
			} catch (error) {
				console.error(`查询关联表 ${targetTableName} 失败:`, error);
			}
		}

		// 转换为分组数组，先按是否是父关系排序（父关系在后），再按表名排序，并过滤空分组
		const groups = Array.from(groupMap.entries())
			.sort((a, b) => {
				// 先按是否是父关系排序：父关系（true）在后
				if (a[1].isParent !== b[1].isParent) {
					return a[1].isParent ? 1 : -1;
				}
				// 再按表名排序
				return String(a[0]).localeCompare(String(b[0]));
			})
			.map(([tableName, bucket]) => ({
				tableName,
				prefixKey: bucket.prefixKey,
				items: bucket.items,
				isParent: bucket.isParent,
			}))
			.filter((g) => g.items.length > 0);

		return { groups, displayedRelationFieldNames };
	});

	// 提取已显示的关系字段名称集合
	const displayedRelationFieldNames = createMemo(() => {
		const relationsData = relations();
		return relationsData ? relationsData.displayedRelationFieldNames : new Set<string>();
	});

	return (
		<div class="FieldGroupContainer flex w-full flex-1 flex-col gap-3">
			<div class="Image bg-area-color h-[18vh] w-full rounded"></div>
			{/* 前置内容 */}
			<Show when={props.before}>
				{(before) => before()(data(), setData, props.dataSchema, dictionary().db[props.tableName])}
			</Show>
			{/* 主内容 */}
			<Show
				when={"fieldGroupMap" in props && Object.keys(props.fieldGroupMap ?? {}).length > 0}
				fallback={
					<For each={Object.entries(data())}>
						{([_key, _val]) => <>{fieldRenderer(_key as keyof DB[TName], _val as DB[TName][keyof DB[TName]])}</>}
					</For>
				}
			>
				<For
					each={Object.entries(props.fieldGroupMap!).filter(([_, keys]) =>
						keys.some((key) => !props.hiddenFields?.includes(key)),
					)}
				>
					{([groupName, keys]) => (
						<section class="FieldGroup flex w-full flex-col gap-2">
							<h3 class="text-accent-color flex items-center gap-2 font-bold">
								{groupName}
								<div class="Divider bg-dividing-color h-px w-full flex-1" />
							</h3>
							<div class="Content flex flex-col gap-3 p-1">
								<For each={keys}>{(key) => <>{fieldRenderer(key, data()[key])}</>}</For>
							</div>
						</section>
					)}
				</For>
			</Show>
			{/* 关联内容 */}
			<Show when={relationCandidates.length > 0 && relations.latest}>
				<Show when={relations()}>
					{(relationsData) => (
						<For each={relationsData().groups}>
							{(group) => (
								<section class="FieldGroup flex w-full flex-col gap-2">
									<h3 class="text-accent-color flex items-center gap-2 font-bold">
										{dictionary().ui.relationPrefix[group.prefixKey]} {dictionary().db[group.tableName].selfName}
										<div class="Divider bg-dividing-color h-px w-full flex-1" />
									</h3>
									<div class="Content flex flex-col gap-3 p-1">
										<For each={group.items}>
											{(item) => (
												<Button
													level={group.isParent ? "quaternary" : "default"}
													onclick={() => {
														const itemPrimaryKey = getPrimaryKeys(group.tableName)[0];
														const itemId = String(item.data[itemPrimaryKey as keyof typeof item.data]);
														setStore("pages", "cardGroup", store.pages.cardGroup.length, {
															type: group.tableName,
															id: itemId,
														});
													}}
												>
													{item.displayName}
												</Button>
											)}
										</For>
									</div>
								</section>
							)}
						</For>
					)}
				</Show>
			</Show>
			{/* 后置内容 */}
			<Show when={props.after}>
				{(after) => after()(data(), setData, props.dataSchema, dictionary().db[props.tableName])}
			</Show>
			{/* 操作按钮 */}
			<Show when={canEdit()}>
				<section class="FunFieldGroup flex w-full flex-col gap-2">
					<h3 class="text-accent-color flex items-center gap-2 font-bold">
						{dictionary().ui.actions.operation}
						<div class="Divider bg-dividing-color h-px w-full flex-1" />
					</h3>
					<div class="FunGroup flex gap-1">
						<Button
							class="w-fit"
							icon={<Icons.Outline.Trash />}
							onclick={async () => {
								// 执行删除方法
								repositoryMethods[props.tableName].delete?.(String(data()[primaryKey]));
								// 关闭当前卡片
								setStore("pages", "cardGroup", (pre) => pre.slice(0, -1));
							}}
						/>
						<Button
							class="w-fit"
							icon={<Icons.Outline.Edit />}
							onclick={() => {
								// 关闭当前卡片
								setStore("pages", "cardGroup", (pre) => pre.slice(0, -1));
								// 打开表单
								setStore("pages", "formGroup", store.pages.formGroup.length, {
									type: props.tableName,
									data: props.data,
								});
							}}
						/>
					</div>
				</section>
			</Show>
		</div>
	);
}
