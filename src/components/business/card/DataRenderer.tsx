import { DB_RELATION, getPrimaryKeys, MODEL_METADATA, RELATION_METADATA } from "@db/generated/dmmf-utils";
import type { DB } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { type Accessor, createEffect, createMemo, createResource, createSignal, For, type JSX, Show } from "solid-js";
import type { ZodObject, ZodType } from "zod/v4";
import { Button } from "~/components/controls/button";
import { Icons } from "~/components/icons";
import { useDictionary } from "~/contexts/Dictionary";
import type { Dic, Dictionary, EnumFieldDetail } from "~/locales/type";
import { DATA_CONFIG, type EmbedsDecl, type InheritsFromDecl, type RelationQueryMap } from "../data-config";

/**
 * 对自动推导出的外键关联内容进行覆盖
 */
export type RelationOverridesDecl = {
	/** 黑名单：这些目标表的关联不显示 */
	hide?: Array<keyof DB>;
	/** 白名单：只显示这些目标表的关联（与 hide 互斥，同时声明时 only 优先） */
	only?: Array<keyof DB>;
	/** 按目标表覆盖关联前缀文案 */
	prefix?: Partial<Record<keyof DB, keyof Dictionary["ui"]["relationPrefix"]>>;
};

export type DataRendererProps<
	T extends Record<string, unknown>,
	TSchema extends ZodObject<{ [K in keyof T]: ZodType }>,
> = {
	// 数据表名
	tableName: string;
	// 当前数据访问器
	data: Accessor<T>;
	// 数据Schema
	dataSchema: TSchema;
	// 主键
	primaryKey: keyof T;
	// 字典
	dictionary: Dic<T>;
	// 隐藏字段
	hiddenFields?: Array<keyof T>;
	// 字段分组
	fieldGroupMap?: Record<string, Array<keyof T>>;
	// 字段生成器
	fieldGenerator?: Partial<{
		[K in keyof T]: (data: T, key: K, dictionary: Dic<T>) => JSX.Element;
	}>;
	/**
	 * 当前表记录在详情入口和关联入口里的显示名。
	 * 设计目的：把“某条记录如何被引用入口命名”的规则收敛到所属表配置，避免通用渲染器按字段顺序猜测业务文案。
	 */
	displayName?: (data: T, dictionary: Dictionary) => string;
	// 继承关系声明（自动合并父表字典/字段生成器，并把父表反向关联并入关联内容）
	inheritsFrom?: InheritsFromDecl;
	// 内嵌子表声明（1:N 子表在卡片内以列表展示）
	embeds?: EmbedsDecl[];
	// 自动关联内容覆盖
	relationOverrides?: RelationOverridesDecl;
	// 删除回调
	deleteCallback: (id: string) => Promise<T | undefined>;
	// 编辑回调
	openEditor: (data: T) => void;
	// 关联记录选择回调；具体是 pushDialog、局部切换还是其它交互由外层决定
	onOpenRecord?: (type: keyof DB, data: Record<string, unknown>) => void;
	// 删除完成回调；具体是否关闭 dialog、清空选择或刷新局部状态由外层决定
	onDeleted?: (data: T | undefined) => void;
	// 编辑权限计算回调
	editAbleCallback: (data: T) => Promise<boolean>;
	// 可选媒体内容
	media?: JSX.Element;
	// 前置内容，通常是当前记录的派生展示控制器
	before?: (data: Accessor<T>, setDisplayData: (data: T | undefined) => void) => JSX.Element;
	// 后置内容
	after?: JSX.Element;
};

// ---------- 辅助：字段可读名称推导 ----------

/**
 * 设计思路：展示名推导只依赖生成出的模型元数据，不额外查询数据库。
 * 函数职责：判断目标表是否拥有可直接用于命名的 name 字段。
 */
function modelHasNameField(tableName: string): boolean {
	const model = MODEL_METADATA.find((m) => m.tableName === tableName);
	return !!model?.fields.some((f) => f.name === "name");
}

/**
 * 设计思路：当当前记录缺少可读名称时，优先沿多对一关系寻找带 name 的相邻表。
 * 函数职责：找出当前表指向的第一个可命名父侧关系。
 */
function findNameSideRelation(fromTable: string) {
	return RELATION_METADATA.find((r) => r.from === fromTable && r.type === "ManyToOne" && modelHasNameField(r.to));
}

/**
 * 设计思路：通用渲染器不假设所有表都有相同命名字段，因此按稳定优先级推导兜底名称。
 * 函数职责：从单条记录中提取一个适合入口展示的文本。
 */
function getReadableName(tableName: string, record: Record<string, unknown>): string {
	if (typeof record?.name === "string" && record.name) return record.name;
	const candidates = ["title", "label", "displayName", "subName"] as const;
	for (const key of candidates) {
		if (typeof record[key] === "string" && record[key]) return String(record[key]);
	}
	const model = MODEL_METADATA.find((m) => m.tableName === tableName);
	if (model) {
		const stringFields = model.fields.filter((f) => f.kind !== "object");
		const requiredString = stringFields.find((f) => typeof record[f.name] === "string" && f.isRequired);
		if (requiredString) return String(record[requiredString.name as keyof typeof record]);
		const anyString = stringFields.find((f) => typeof record[f.name] === "string");
		if (anyString) return String(record[anyString.name as keyof typeof record]);
	}
	const pkArr = getPrimaryKeys(tableName as keyof DB);
	const pk = pkArr[0];
	return String((pk !== undefined ? record[pk as keyof typeof record] : "") ?? "");
}

/**
 * 设计思路：业务配置比通用字段猜测更了解某张表如何命名实体。
 * 函数职责：读取目标表详情配置中的展示名规则。
 */
function getConfiguredDisplayName(
	tableName: keyof DB,
	record: Record<string, unknown>,
	dictionary: Dictionary,
): string | undefined {
	const config = DATA_CONFIG[tableName]?.(() => dictionary);
	return config?.card.displayName?.(record, dictionary);
}

// ---------- 辅助：关系前缀文案推导 ----------

/**
 * 设计思路：关联按钮的前缀应来自关系字段语义，而不是硬编码目标表。
 * 函数职责：根据关系名和两侧模型字段推导关联前缀文案键。
 */
function getRelationPrefixKey(
	currentTable: string,
	targetTable: string,
	relationName: string,
): keyof Dictionary["ui"]["relationPrefix"] {
	const currentModel = MODEL_METADATA.find((m) => m.tableName === currentTable);
	const targetModel = MODEL_METADATA.find((m) => m.tableName === targetTable);
	const currentModelName = currentModel?.name || currentTable;
	const targetModelName = targetModel?.name || targetTable;

	let field = currentModel?.fields.find(
		(f) => f.kind === "object" && f.relationName === relationName && f.type === targetModelName,
	);
	if (!field) {
		field = targetModel?.fields.find(
			(f) => f.kind === "object" && f.relationName === relationName && f.type === currentModelName,
		);
	}
	const fieldName = field?.name?.toLowerCase() || "";

	if (fieldName.startsWith("belongto")) return "belongsTo";
	if (fieldName.startsWith("usedby")) return "usedBy";
	if (fieldName.startsWith("updatedby")) return "updatedBy";
	if (fieldName.startsWith("createdby")) return "createdBy";
	if (fieldName.startsWith("link") || fieldName.includes("related")) return "related";
	return "none";
}

// ---------- 辅助：自动推导兄弟子类表 ----------

/**
 * 设计思路：继承型子表共享父表反向关系，自动关联区需要排除同级子类，避免同一实体被重复展示。
 * 函数职责：找出与当前表继承同一父表的其他子表。
 */
function detectSiblingSubtypes(parentTable: keyof DB, selfTable: keyof DB): Array<keyof DB> {
	const parentModel = MODEL_METADATA.find((m) => m.tableName === parentTable);
	if (!parentModel) return [];
	const parentModelName = parentModel.name;
	const siblings: Array<keyof DB> = [];
	for (const model of MODEL_METADATA) {
		if (model.tableName === parentTable) continue;
		if (model.tableName === selfTable) continue;
		const pks = getPrimaryKeys(model.tableName as keyof DB);
		if (pks.length !== 1) continue;
		const pk = String(pks[0]);
		const hasInheritance = model.fields.some(
			(f) =>
				f.kind === "object" &&
				f.type === parentModelName &&
				Array.isArray(f.relationFromFields) &&
				f.relationFromFields.length === 1 &&
				f.relationFromFields[0] === pk,
		);
		if (hasInheritance) siblings.push(model.tableName as keyof DB);
	}
	return siblings;
}

type RelationRowsByTable = Partial<Record<keyof DB, unknown[]>>;

/**
 * 设计思路：关联生成器返回的是按目标表分组的查询集合，执行边界应留在数据库对象展示区。
 * 函数职责：执行一组关联查询，并保留目标表分组结构。
 */
async function executeRelationQueryMap(queryMap: RelationQueryMap | null | undefined): Promise<RelationRowsByTable> {
	const result: RelationRowsByTable = {};
	if (!queryMap) return result;

	await Promise.all(
		(Object.entries(queryMap) as Array<[keyof DB, NonNullable<RelationQueryMap[keyof DB]> | undefined]>).map(
			async ([tableName, queries]) => {
				if (!queries || queries.length === 0) return;
				const rows = (await Promise.all(queries.map((query) => query.execute()))).flat();
				if (rows.length > 0) result[tableName] = rows;
			},
		),
	);

	return result;
}

/**
 * 设计思路：DataRenderer 只消费当前行访问器，所有数据库变化都通过查询订阅回流，局部派生展示只作为临时覆盖。
 * 函数职责：渲染单条业务记录、内嵌子表、自动关联内容以及编辑删除入口。
 */
export function DataRenderer<T extends Record<string, unknown>, TSchema extends ZodObject<{ [K in keyof T]: ZodType }>>(
	props: DataRendererProps<T, TSchema>,
) {
	// 全局字典（供关联内容展示、父表字段合并使用）
	const dictionary = useDictionary();

	const sourceData = createMemo(() => props.data());
	const [displayData, setDisplayData] = createSignal<T>();
	createEffect(() => {
		sourceData();
		setDisplayData(undefined);
	});
	const data = createMemo(() => displayData() ?? sourceData());
	const [canEdit] = createResource(data, props.editAbleCallback);

	// ---------- 合并 inheritsFrom 带来的父表字典/字段生成器（child 优先） ----------

	const mergedDictionary = createMemo<Dic<T>>(() => {
		if (!props.inheritsFrom) return props.dictionary;
		const parentDic = dictionary().db[props.inheritsFrom.table];
		return {
			...props.dictionary,
			fields: {
				...((parentDic?.fields as object) ?? {}),
				...(props.dictionary.fields as object),
			},
		} as Dic<T>;
	});

	const mergedFieldGenerator = createMemo(() => {
		const own = props.fieldGenerator ?? {};
		if (!props.inheritsFrom) return own as NonNullable<typeof props.fieldGenerator>;
		const parentCard = DATA_CONFIG[props.inheritsFrom.table]?.(dictionary).card;
		return {
			...((parentCard?.fieldGenerator as object) ?? {}),
			...(own as object),
		} as NonNullable<typeof props.fieldGenerator>;
	});

	// ---------- embed 字段从普通字段渲染流程中剔除 ----------

	const embedFieldNames = createMemo(() => new Set((props.embeds ?? []).map((e) => e.field)));

	const isFieldHidden = (key: keyof T): boolean => {
		if (props.hiddenFields?.some((h) => h === key)) return true;
		if (embedFieldNames().has(String(key))) return true;
		return false;
	};

	const isGroupdHidden = (groupName: string) => {
		const fields = props.fieldGroupMap?.[groupName];
		return fields?.every((f) => isFieldHidden(f)) ?? false;
	};

	const fieldRenderer = (key: keyof T, val: T[typeof key]) => {
		if (isFieldHidden(key)) return null;
		const fieldDic = (mergedDictionary().fields as Record<string, { key?: string } & Record<string, unknown>>)[
			String(key)
		];
		const fieldName = fieldDic?.key ?? String(key);
		const fieldValue = val;
		const generator = mergedFieldGenerator()[key];
		const hasGenerator = !!generator;

		if (props.dataSchema.shape[key].type === "array") {
			const content = Object.entries(val as Record<string, unknown>);
			return hasGenerator ? (
				generator(data(), key, mergedDictionary())
			) : (
				<div class="Field flex flex-col gap-2">
					<span class="Title text-main-text-color text-nowrap">{String(fieldName)}</span>
					<Show when={content.length > 0}>
						<div class="List bg-area-color rounded-md p-2">
							<For each={content}>
								{([k, v]) => (
									<div class="Field flex gap-1">
										<span class="text-boundary-color w-3 text-sm text-nowrap">{k}</span>
										&nbsp;:&nbsp;
										<span class="text-sm text-nowrap">{String(v)}</span>
									</div>
								)}
							</For>
						</div>
					</Show>
				</div>
			);
		}

		return hasGenerator ? (
			generator(data(), key, mergedDictionary())
		) : (
			<div class="Field flex gap-2">
				<span class="text-main-text-color text-nowrap">{String(fieldName)}</span>:
				<span class="font-bold">
					{props.dataSchema.shape[key].type === "enum"
						? ((fieldDic as EnumFieldDetail<string> | undefined)?.enumMap?.[val as unknown as string] ??
							String(fieldValue))
						: String(fieldValue)}
				</span>
			</div>
		);
	};

	// ---------- embeds (inline) ----------

	const inlineEmbeds = () => (props.embeds ?? []).filter((e) => (e.mode ?? "inline") === "inline");

	// ---------- 自动 FK 关联内容 ----------

	const [relations] = createResource(
		() => String(data()[props.primaryKey] ?? ""),
		async () => {
			type RelationItem = { data: unknown; displayName: string };
			type RelationGroup = {
				tableName: keyof DB;
				prefixKey: keyof Dictionary["ui"]["relationPrefix"];
				items: RelationItem[];
				isParent: boolean;
			};
			const groupMap = new Map<
				keyof DB,
				{
					prefixKey: keyof Dictionary["ui"]["relationPrefix"];
					items: RelationItem[];
					seen: Set<string>;
					isParent: boolean;
				}
			>();

			const db = await getDB();
			const selfTable = props.tableName as keyof DB;
			const selfPkValue = String(data()[props.primaryKey] ?? "");
			if (!selfPkValue) return { groups: [] as RelationGroup[] };

			// 排除集合：inheritsFrom 父表自身、兄弟子类、embed 目标、self
			const autoSiblings = props.inheritsFrom ? detectSiblingSubtypes(props.inheritsFrom.table, selfTable) : [];
			const excludeSet = new Set<string>([
				...(props.inheritsFrom ? [String(props.inheritsFrom.table)] : []),
				...(props.inheritsFrom?.excludeSiblings ?? []).map(String),
				...autoSiblings.map(String),
				...(props.embeds ?? []).map((e) => String(e.table)),
				String(selfTable),
			]);
			const onlySet = props.relationOverrides?.only ? new Set(props.relationOverrides.only.map(String)) : null;
			const hideSet = props.relationOverrides?.hide
				? new Set(props.relationOverrides.hide.map(String))
				: new Set<string>();
			const prefixMap = props.relationOverrides?.prefix;

			const passFilter = (tableName: keyof DB) => {
				const s = String(tableName);
				if (excludeSet.has(s)) return false;
				if (onlySet) return onlySet.has(s);
				return !hideSet.has(s);
			};

			// 名称缓存：避免重复 select name
			const nameByPkCache = new Map<string, string>();
			const cacheKey = (t: string, id: unknown) => `${t}:${String(id)}`;

			const selectNameByPkCached = async (tableName: keyof DB, id: unknown): Promise<string | undefined> => {
				if (id == null) return;
				const k = cacheKey(String(tableName), id);
				const cached = nameByPkCache.get(k);
				if (cached) return cached;
				try {
					const query = DATA_CONFIG[tableName]?.(dictionary).queries.get;
					const row = await query?.(db, String(id)).executeTakeFirst();
					const name = (row as Record<string, unknown> | undefined)?.name;
					if (typeof name !== "string") return;
					nameByPkCache.set(k, name);
					return name;
				} catch {
					return;
				}
			};

			const isUnreadableId = (readableName: string, itemId: string) => {
				if (readableName !== itemId) return false;
				return (
					(itemId.length >= 24 && itemId.length <= 30 && /^[a-z0-9]+$/.test(itemId) && !itemId.includes("default")) ||
					itemId.length > 30 ||
					itemId.startsWith("cuid_")
				);
			};

			const resolveDisplayName = async (tableName: keyof DB, item: Record<string, unknown>): Promise<string> => {
				const configuredName = getConfiguredDisplayName(tableName, item, dictionary());
				if (configuredName) return configuredName;
				if (typeof item?.name === "string" && item.name) return item.name;
				const readable = getReadableName(String(tableName), item);
				const pkArr = getPrimaryKeys(tableName);
				const pk = pkArr[0];
				const itemId = String(pk !== undefined ? (item[pk] ?? "") : "");
				if (isUnreadableId(readable, itemId)) {
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
						const fkCol = fkField?.relationFromFields?.[0];
						if (fkCol && item[fkCol] != null) {
							const relatedName = await selectNameByPkCached(nameSide.to as keyof DB, item[fkCol]);
							if (relatedName) return relatedName;
						}
					}
				}
				return readable;
			};

			const upsert = (args: {
				tableName: keyof DB;
				prefixKey: keyof Dictionary["ui"]["relationPrefix"];
				isParent: boolean;
				item: Record<string, unknown>;
				displayName: string;
			}) => {
				const pkArr = getPrimaryKeys(args.tableName);
				const pk = pkArr[0];
				const id = String(pk !== undefined ? (args.item[pk] ?? "") : "");
				if (!id) return;
				let bucket = groupMap.get(args.tableName);
				if (!bucket) {
					bucket = { prefixKey: args.prefixKey, items: [], seen: new Set(), isParent: false };
					groupMap.set(args.tableName, bucket);
				}
				if (args.isParent) bucket.isParent = true;
				if (bucket.prefixKey === "related" && args.prefixKey !== "related") {
					bucket.prefixKey = args.prefixKey;
				}
				if (bucket.seen.has(id)) return;
				bucket.seen.add(id);
				bucket.items.push({ data: args.item, displayName: args.displayName });
			};

			const collectBucket = async (
				tableName: keyof DB,
				items: unknown[] | undefined,
				isParentBucket: boolean,
				sourceTable: keyof DB,
			) => {
				if (!items || items.length === 0) return;
				if (!passFilter(tableName)) return;
				const relationEntries = isParentBucket
					? (DB_RELATION[sourceTable]?.parents?.[tableName] ?? [])
					: (DB_RELATION[sourceTable]?.children?.[tableName] ?? []);
				if (relationEntries.length === 0) return;
				const firstRelation = relationEntries[0];
				const prefixOverride = prefixMap?.[tableName];
				for (const item of items) {
					const record = item as Record<string, unknown>;
					const displayName = await resolveDisplayName(tableName, record);
					const prefixKey: keyof Dictionary["ui"]["relationPrefix"] =
						prefixOverride ?? getRelationPrefixKey(String(sourceTable), String(tableName), firstRelation.relationName);
					upsert({ tableName, prefixKey, isParent: isParentBucket, item: record, displayName });
				}
			};

			// 自身关系
			// 自身关系
			const selfConfig = DATA_CONFIG[selfTable]?.(dictionary);
			const [selfParents, selfChildren] = await Promise.all([
				executeRelationQueryMap(selfConfig?.queries.getParentsById?.(db, selfPkValue)),
				executeRelationQueryMap(selfConfig?.queries.getChildrenById?.(db, selfPkValue)),
			]);

			// 父表反向关系（仅在声明 inheritsFrom 时）
			let parentParents: RelationRowsByTable | null = null;
			let parentChildren: RelationRowsByTable | null = null;
			if (props.inheritsFrom) {
				const parentFkVal = (data() as Record<string, unknown>)[props.inheritsFrom.via];
				const parentPkValue = parentFkVal != null ? String(parentFkVal) : "";
				if (parentPkValue) {
					const parentConfig = DATA_CONFIG[props.inheritsFrom.table]?.(dictionary);
					const [pp, pc] = await Promise.all([
						executeRelationQueryMap(parentConfig?.queries.getParentsById?.(db, parentPkValue)),
						executeRelationQueryMap(parentConfig?.queries.getChildrenById?.(db, parentPkValue)),
					]);
					parentParents = pp;
					parentChildren = pc;
				}
			}
			for (const [tn, items] of Object.entries(selfParents) as Array<[keyof DB, unknown[]]>) {
				await collectBucket(tn, items, true, selfTable);
			}
			for (const [tn, items] of Object.entries(selfChildren) as Array<[keyof DB, unknown[]]>) {
				await collectBucket(tn, items, false, selfTable);
			}
			if (props.inheritsFrom && parentParents) {
				for (const [tn, items] of Object.entries(parentParents) as Array<[keyof DB, unknown[]]>) {
					await collectBucket(tn, items, true, props.inheritsFrom.table);
				}
			}
			if (props.inheritsFrom && parentChildren) {
				for (const [tn, items] of Object.entries(parentChildren) as Array<[keyof DB, unknown[]]>) {
					await collectBucket(tn, items, false, props.inheritsFrom.table);
				}
			}

			const groups: RelationGroup[] = Array.from(groupMap.entries())
				.sort((a, b) => {
					if (a[1].isParent !== b[1].isParent) return a[1].isParent ? 1 : -1;
					return String(a[0]).localeCompare(String(b[0]));
				})
				.map(([tn, bucket]) => ({
					tableName: tn,
					prefixKey: bucket.prefixKey,
					items: bucket.items,
					isParent: bucket.isParent,
				}))
				.filter((g) => g.items.length > 0);

			return { groups };
		},
	);

	return (
		<div class="FieldGroupContainer flex w-full flex-1 flex-col gap-3">
			<Show when={props.media}>{(media) => media()}</Show>
			{/* 前置内容 */}
			<Show when={props.before}>{(before) => before()(sourceData, setDisplayData)}</Show>
			{/* 主内容 */}
			<Show
				when={"fieldGroupMap" in props && Object.keys(props.fieldGroupMap ?? {}).length > 0}
				fallback={
					<For each={Object.entries(data())}>{([key, val]) => fieldRenderer(key as keyof T, val as T[keyof T])}</For>
				}
			>
				<For each={Object.entries(props.fieldGroupMap ?? {})}>
					{([groupName, keys]) => {
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
			{/* 内嵌子表（inline） */}
			<For each={inlineEmbeds()}>
				{(embed) => {
					const childConfig = DATA_CONFIG[embed.table]?.(dictionary);
					const items = () => {
						const v = (data() as Record<string, unknown>)[embed.field];
						return Array.isArray(v) ? (v as Array<Record<string, unknown>>) : [];
					};
					const label = () => childConfig?.dictionary.selfName ?? embed.field;
					return (
						<Show when={items().length > 0}>
							<section class="FieldGroup flex w-full flex-col gap-2">
								<h3 class="text-accent-color flex items-center gap-2 font-bold">
									{label()}
									<div class="Divider bg-dividing-color h-px w-full flex-1" />
								</h3>
								<div class="Content flex flex-col lg:flex-row gap-3 p-1">
									<For each={items()}>
										{(item) => {
											const display = () => {
												return (
													getConfiguredDisplayName(embed.table, item, dictionary()) ??
													getReadableName(String(embed.table), item)
												);
											};
											return (
												<Button
													level="default"
													onclick={() => {
														props.onOpenRecord?.(embed.table, item as Record<string, unknown>);
													}}
													class="lg:w-fit lg:border-dividing-color lg:border-2"
												>
													{display()}
												</Button>
											);
										}}
									</For>
								</div>
							</section>
						</Show>
					);
				}}
			</For>
			{/* 自动 FK 关联内容 */}
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
														props.onOpenRecord?.(group.tableName, item.data as Record<string, unknown>);
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
			{props.after}
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
								const deleted = await props.deleteCallback(data()[props.primaryKey] as string);
								props.onDeleted?.(deleted);
							}}
						/>
						<Button
							class="w-fit"
							icon={<Icons.Outline.Edit />}
							onclick={() => {
								// 只发起编辑请求；具体使用 sheet、dialog 或局部编辑由外层 openEditor 决定。
								props.openEditor(data());
							}}
						/>
					</div>
				</section>
			</Show>
		</div>
	);
}
