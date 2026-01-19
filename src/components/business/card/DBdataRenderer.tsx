import {
	DB_RELATION,
	getChildrenDatas,
	getParentDatas,
	getPrimaryKeys,
	isFkColumn,
	MODEL_METADATA,
	RELATION_METADATA,
} from "@db/generated/dmmf-utils";
import { repositoryMethods } from "@db/generated/repositories";
import type { DB } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createMemo, createResource, createSignal, For, type JSX, Show } from "solid-js";
import type { ZodObject, ZodType } from "zod/v4";
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
	const [canEdit] = createResource(async () => {
		// 主键字段的值总是 string 类型
		const canEdit = await repositoryMethods[props.tableName].canEdit?.(String(data()[primaryKey]));
		return canEdit;
	});

	const isFieldHidden = (fieldName: keyof DB[TName]) => {
		let isHidden = false;
		// 规则0：配置直接隐藏
		if (props.hiddenFields?.some((hiddenField) => hiddenField === fieldName)) {
			// console.log("配置中规定隐藏此字段", fieldName);
			isHidden = true;
		}

		// 规则2：如果此字段是关系字段则隐藏
		if (isFkColumn(props.tableName, fieldName)) {
			// console.log("关联内容中将显示此字段", fieldName);
			isHidden = true;
		}
		// console.log("字段可见性", fieldName, !isHidden);
		return isHidden;
	};

	const isGroupdHidden = (groupName: string) => {
		let isHidden = false;
		// 当group内的field都被隐藏时，group也隐藏
		const fields = props.fieldGroupMap?.[groupName];
		isHidden = fields?.every((fieldName) => isFieldHidden(fieldName)) ?? false;
		// console.log("组可见性", groupName, !isHidden);
		return isHidden;
	};

	const fieldRenderer = (key: keyof DB[TName], val: DB[TName][typeof key]) => {
		if (isFieldHidden(key)) return null;
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

	const currentPrimaryKey = getPrimaryKeys(props.tableName)[0];
	const currentPrimaryKeyValue = props.data[currentPrimaryKey];

	const [relations] = createResource(async () => {
		type RelationItem = { data: any; displayName: string };
		type RelationGroup = {
			tableName: keyof DB;
			prefixKey: keyof dictionary["ui"]["relationPrefix"];
			items: RelationItem[];
			isParent: boolean;
		};
		const groupMap = new Map<
			keyof DB,
			{
				prefixKey: keyof dictionary["ui"]["relationPrefix"];
				items: RelationItem[];
				seen: Set<string>;
				isParent: boolean;
			}
		>();

		const db = await getDB();
		const primaryKeyValue = String(currentPrimaryKeyValue);

		// 统一通过生成的关系 API 获取父/子关系数据，避免在组件里手写关系查询
		const [parentDatas, childrenDatas] = await Promise.all([
			getParentDatas(db, props.tableName, primaryKeyValue),
			getChildrenDatas(db, props.tableName, primaryKeyValue),
		]);

		// 关联内容辅助：本次 relations 计算周期内的名称缓存（减少重复 select name）
		const nameByPkCache = new Map<string, string>();
		const cacheKey = (tableName: string, id: unknown) => `${tableName}:${String(id)}`;

		const isUnreadableId = (readableName: string, itemId: string) => {
			if (readableName !== itemId) return false;
			// 判断 id 是否可读：CUID2 通常是 24-30 个字符的小写字母和数字组合
			// 或者以 "cuid_" 开头，或者长度 > 30（可能是 UUID）
			return (
				(itemId.length >= 24 && itemId.length <= 30 && /^[a-z0-9]+$/.test(itemId) && !itemId.includes("default")) ||
				itemId.length > 30 ||
				itemId.startsWith("cuid_")
			);
		};

		const selectNameByPkCached = async (tableName: string, id: unknown): Promise<string | undefined> => {
			if (typeof id === "undefined" || id === null) return;
			const key = cacheKey(tableName, id);
			const cached = nameByPkCache.get(key);
			if (cached) return cached;

			const pk = getPrimaryKeys(tableName as keyof DB)[0];
			const rows = await db
				.selectFrom(tableName as any)
				.select(["name" as any])
				.where(pk as any, "=", id as any)
				.limit(1)
				.execute();
			const nm = rows[0]?.name as string | undefined;
			if (nm) nameByPkCache.set(key, nm);
			return nm;
		};

		const resolveDisplayName = async (tableName: string, item: any): Promise<string> => {
			if ("name" in item && typeof (item as any).name === "string" && (item as any).name) {
				return (item as any).name as string;
			}

			const readableName = getReadableName(tableName, item);
			const pk = getPrimaryKeys(tableName as keyof DB)[0];
			const itemId = String(item?.[pk as keyof typeof item] ?? "");

			if (isUnreadableId(readableName, itemId)) {
				const nameSide = findNameSideRelation(tableName);
				if (nameSide) {
					const targetModel = MODEL_METADATA.find((m) => m.tableName === tableName);
					const fkField = targetModel?.fields.find(
						(f) =>
							f.kind === "object" &&
							f.relationName === nameSide.name &&
							f.relationFromFields &&
							f.relationFromFields.length > 0,
					);
					const fkColumn = fkField?.relationFromFields?.[0];
					if (fkColumn && item?.[fkColumn as keyof typeof item]) {
						const relatedId = item[fkColumn as keyof typeof item];
						const relatedName = await selectNameByPkCached(nameSide.to, relatedId);
						if (relatedName) return relatedName;
					}
				}
			}

			return readableName;
		};

		const ensureBucket = (args: {
			tableName: keyof DB;
			prefixKey: keyof dictionary["ui"]["relationPrefix"];
			isParentRelation: boolean;
		}) => {
			if (!groupMap.has(args.tableName)) {
				groupMap.set(args.tableName, {
					prefixKey: args.prefixKey,
					items: [],
					seen: new Set(),
					isParent: false,
				});
			}
			const bucket = groupMap.get(args.tableName);
			if (!bucket) return;
			if (args.isParentRelation) bucket.isParent = true;
			if (bucket.prefixKey === "related" && args.prefixKey !== "related") {
				bucket.prefixKey = args.prefixKey;
			}
		};

		const upsertRelationItem = (args: {
			tableName: keyof DB;
			prefixKey: keyof dictionary["ui"]["relationPrefix"];
			isParentRelation: boolean;
			item: any;
			primaryKey: string;
			displayName: string;
		}) => {
			const id = String(args.item?.[args.primaryKey as keyof typeof args.item] ?? "");
			if (!id) return;

			ensureBucket(args);
			const bucket = groupMap.get(args.tableName);
			if (!bucket) return;

			if (bucket.seen.has(id)) {
				const idx = bucket.items.findIndex(
					(x) => String(x.data?.[args.primaryKey as keyof typeof x.data] ?? "") === id,
				);
				if (idx >= 0) {
					const oldIsId = bucket.items[idx].displayName === id;
					if (oldIsId && args.displayName !== id) bucket.items[idx].displayName = args.displayName;
				}
				return;
			}

			bucket.seen.add(id);
			bucket.items.push({ data: args.item, displayName: args.displayName });
		};

		// 父关系
		for (const [tableName, items] of Object.entries(parentDatas) as Array<[keyof DB, any[]]>) {
			const relationEntries = DB_RELATION[props.tableName]?.parents?.[tableName] ?? [];
			const otherModelName = MODEL_METADATA.find((m) => m.tableName === tableName)?.name || String(tableName);
			const visibleEntries = relationEntries.filter(
				(entry) =>
					!isRelationHidden(
						props.tableName,
						{ name: entry.relationName, to: String(tableName), from: props.tableName as string },
						otherModelName,
						props.hiddenFields as any,
					),
			);
			// 全部被隐藏则不展示该表的关联内容
			if (visibleEntries.length === 0) continue;

			const targetPrimaryKey = getPrimaryKeys(tableName)[0];
			for (const item of items ?? []) {
				const displayName = await resolveDisplayName(String(tableName), item);
				const prefixKey =
					visibleEntries.length > 0
						? getRelationPrefixKey(props.tableName as string, String(tableName), visibleEntries[0].relationName)
						: "none";
				upsertRelationItem({
					tableName,
					prefixKey,
					isParentRelation: true,
					item,
					primaryKey: String(targetPrimaryKey),
					displayName,
				});
			}
		}

		// 子关系
		for (const [tableName, items] of Object.entries(childrenDatas) as Array<[keyof DB, any[]]>) {
			const relationEntries = DB_RELATION[props.tableName]?.children?.[tableName] ?? [];
			const otherModelName = MODEL_METADATA.find((m) => m.tableName === tableName)?.name || String(tableName);
			const visibleEntries = relationEntries.filter(
				(entry) =>
					!isRelationHidden(
						props.tableName,
						{ name: entry.relationName, to: String(tableName), from: props.tableName as string },
						otherModelName,
						props.hiddenFields as any,
					),
			);
			// 全部被隐藏则不展示该表的关联内容
			if (visibleEntries.length === 0) continue;

			const targetPrimaryKey = getPrimaryKeys(tableName)[0];
			for (const item of items ?? []) {
				const displayName = await resolveDisplayName(String(tableName), item);
				const prefixKey =
					visibleEntries.length > 0
						? getRelationPrefixKey(props.tableName as string, String(tableName), visibleEntries[0].relationName)
						: "none";
				upsertRelationItem({
					tableName,
					prefixKey,
					isParentRelation: false,
					item,
					primaryKey: String(targetPrimaryKey),
					displayName,
				});
			}
		}

		// 转换为分组数组，先按是否是父关系排序（父关系在后），再按表名排序，并过滤空分组
		const groups: RelationGroup[] = Array.from(groupMap.entries())
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

		return { groups };
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
						{([key, val]) => fieldRenderer(key as keyof DB[TName], val as DB[TName][keyof DB[TName]])}
					</For>
				}
			>
				<For each={Object.entries(props.fieldGroupMap ?? {})}>
					{([groupName, keys]) => {
						// console.log("------------当前组:", groupName);
						if (isGroupdHidden(groupName)) return null;
						return (
							<section class="FieldGroup flex w-full flex-col gap-2">
								<h3 class="text-accent-color flex items-center gap-2 font-bold">
									{groupName}
									<div class="Divider bg-dividing-color h-px w-full flex-1" />
								</h3>
								<div class="Content flex flex-col gap-3 p-1">
									<For each={keys}>{(key) => <>{fieldRenderer(key, data()[key])}</>}</For>
								</div>
							</section>
						);
					}}
				</For>
			</Show>
			{/* 关联内容 */}
			<Show when={(relations.latest && (relations()?.groups?.length ?? 0) > 0) as boolean}>
				<Show when={relations()}>
					{(relationsData) => (
						<For each={relationsData().groups}>
							{(group) => (
								<section class="FieldGroup flex w-full flex-col gap-2">
									<h3 class="text-accent-color flex items-center gap-2 font-bold">
										{dictionary().ui.relationPrefix[group.prefixKey]} {dictionary().db[group.tableName].selfName}
										<div class="Divider bg-dividing-color h-px w-full flex-1" />
									</h3>
									<div class="Content flex flex-col lg:flex-row gap-3 p-1">
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
													class="lg:w-fit lg:border-dividing-color lg:border-2"
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
