import {
	DB_RELATION,
	getChildrenDatas,
	getParentDatas,
	getPrimaryKeys,
	MODEL_METADATA,
	RELATION_METADATA,
} from "@db/generated/dmmf-utils";
import type { DB } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createMemo, createResource, createSignal, For, type JSX, Show } from "solid-js";
import type { ZodObject, ZodType } from "zod/v4";
import { Button } from "~/components/controls/button";
import { Icons } from "~/components/icons";
import { useDictionary } from "~/contexts/Dictionary";
import type { Dic, Dictionary, EnumFieldDetail } from "~/locales/type";
import { setStore, store } from "~/store";
import { DATA_CONFIG, type EmbedsDecl, type InheritsFromDecl, type RelationOverridesDecl } from "../data-config";

export type DataRendererProps<
	T extends Record<string, unknown>,
	TSchema extends ZodObject<{ [K in keyof T]: ZodType }>,
> = {
	// 数据表名
	tableName: string;
	// 数据值
	data: T;
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
	// 编辑权限计算回调
	editAbleCallback: (data: T) => Promise<boolean>;
	// 前置内容，通常是卡片数据控制器
	before?: (data: T, setData: (data: T) => void) => JSX.Element;
	// 后置内容，通常是外键关联数据弹出按钮组
	after?: JSX.Element;
};

// ---------- 辅助：字段可读名称推导 ----------

function modelHasNameField(tableName: string): boolean {
	const model = MODEL_METADATA.find((m) => m.tableName === tableName);
	return !!model?.fields.some((f) => f.name === "name");
}

function findNameSideRelation(fromTable: string) {
	return RELATION_METADATA.find(
		(r) => r.from === fromTable && r.type === "ManyToOne" && modelHasNameField(r.to),
	);
}

function getReadableName(tableName: string, record: any): string {
	if (typeof record?.name === "string" && record.name) return record.name;
	const candidates = ["title", "label", "displayName", "subName"] as const;
	for (const key of candidates) {
		if (typeof record?.[key] === "string" && record[key]) return String(record[key]);
	}
	const model = MODEL_METADATA.find((m) => m.tableName === tableName);
	if (model) {
		const stringFields = model.fields.filter((f) => f.kind !== "object");
		const requiredString = stringFields.find((f) => typeof record?.[f.name] === "string" && f.isRequired);
		if (requiredString) return String(record[requiredString.name as keyof typeof record]);
		const anyString = stringFields.find((f) => typeof record?.[f.name] === "string");
		if (anyString) return String(record[anyString.name as keyof typeof record]);
	}
	const pkArr = getPrimaryKeys(tableName as keyof DB);
	const pk = pkArr[0];
	return String((pk !== undefined ? record?.[pk as keyof typeof record] : "") ?? "");
}

// ---------- 辅助：关系前缀文案推导 ----------

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

/** 找出与 selfTable 同样以 (PK == 指向 parentTable 的 FK) 形式 1:1 继承 parentTable 的所有表，不包括 selfTable 和 parentTable */
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

export function DataRenderer<
	T extends Record<string, unknown>,
	TSchema extends ZodObject<{ [K in keyof T]: ZodType }>,
>(props: DataRendererProps<T, TSchema>) {
	// 全局字典（供关联内容展示、父表字段合并使用）
	const dictionary = useDictionary();

	const [data, setData] = createSignal<T>(props.data);
	const [canEdit] = createResource(async () => props.editAbleCallback(data()));

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

	const [relations] = createResource(async () => {
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
		const selfPkValue = String(props.data[props.primaryKey] ?? "");
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
		const hideSet = props.relationOverrides?.hide ? new Set(props.relationOverrides.hide.map(String)) : new Set<string>();
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

		const selectNameByPkCached = async (tableName: string, id: unknown): Promise<string | undefined> => {
			if (id == null) return;
			const k = cacheKey(tableName, id);
			const cached = nameByPkCache.get(k);
			if (cached) return cached;
			const pkArr = getPrimaryKeys(tableName as keyof DB);
			if (pkArr.length === 0) return;
			const pk = String(pkArr[0]);
			try {
				const rows = await (db as any)
					.selectFrom(tableName)
					.select(["name"])
					.where(pk, "=", id)
					.limit(1)
					.execute();
				const nm = rows[0]?.name as string | undefined;
				if (nm) nameByPkCache.set(k, nm);
				return nm;
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

		const resolveDisplayName = async (tableName: string, item: any): Promise<string> => {
			if (typeof item?.name === "string" && item.name) return item.name;
			const readable = getReadableName(tableName, item);
			const pkArr = getPrimaryKeys(tableName as keyof DB);
			const pk = pkArr[0];
			const itemId = String(pk !== undefined ? (item?.[pk as keyof typeof item] ?? "") : "");
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
					if (fkCol && item?.[fkCol] != null) {
						const relatedName = await selectNameByPkCached(nameSide.to, item[fkCol]);
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
			item: any;
			displayName: string;
		}) => {
			const pkArr = getPrimaryKeys(args.tableName);
			const pk = pkArr[0];
			const id = String(pk !== undefined ? (args.item?.[pk as keyof typeof args.item] ?? "") : "");
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
				const displayName = await resolveDisplayName(String(tableName), item);
				const prefixKey: keyof Dictionary["ui"]["relationPrefix"] =
					prefixOverride ??
					getRelationPrefixKey(String(sourceTable), String(tableName), firstRelation.relationName);
				upsert({ tableName, prefixKey, isParent: isParentBucket, item, displayName });
			}
		};

		// 自身关系
		const [selfParents, selfChildren] = await Promise.all([
			getParentDatas(db, selfTable, selfPkValue),
			getChildrenDatas(db, selfTable, selfPkValue),
		]);

		// 父表反向关系（仅在声明 inheritsFrom 时）
		let parentParents: Partial<{ [K in keyof DB]: any[] }> | null = null;
		let parentChildren: Partial<{ [K in keyof DB]: any[] }> | null = null;
		if (props.inheritsFrom) {
			const parentFkVal = (props.data as Record<string, unknown>)[props.inheritsFrom.via];
			const parentPkValue = parentFkVal != null ? String(parentFkVal) : "";
			if (parentPkValue) {
				const [pp, pc] = await Promise.all([
					getParentDatas(db, props.inheritsFrom.table, parentPkValue),
					getChildrenDatas(db, props.inheritsFrom.table, parentPkValue),
				]);
				parentParents = pp;
				parentChildren = pc;
			}
		}

		for (const [tn, items] of Object.entries(selfParents) as Array<[keyof DB, any[]]>) {
			await collectBucket(tn, items, true, selfTable);
		}
		for (const [tn, items] of Object.entries(selfChildren) as Array<[keyof DB, any[]]>) {
			await collectBucket(tn, items, false, selfTable);
		}
		if (props.inheritsFrom && parentParents) {
			for (const [tn, items] of Object.entries(parentParents) as Array<[keyof DB, any[]]>) {
				await collectBucket(tn, items, true, props.inheritsFrom.table);
			}
		}
		if (props.inheritsFrom && parentChildren) {
			for (const [tn, items] of Object.entries(parentChildren) as Array<[keyof DB, any[]]>) {
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
	});

	return (
		<div class="FieldGroupContainer flex w-full flex-1 flex-col gap-3">
			<div class="Image bg-area-color h-[18vh] w-full rounded"></div>
			{/* 前置内容 */}
			<Show when={props.before}>{(before) => before()(data(), setData)}</Show>
			{/* 主内容 */}
			<Show
				when={"fieldGroupMap" in props && Object.keys(props.fieldGroupMap ?? {}).length > 0}
				fallback={
					<For each={Object.entries(data())}>
						{([key, val]) => fieldRenderer(key as keyof T, val as T[keyof T])}
					</For>
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
												if (typeof item?.name === "string" && item.name) return item.name as string;
												return getReadableName(String(embed.table), item);
											};
											return (
												<Button
													level="default"
													onclick={() => {
														setStore("pages", "cardGroup", store.pages.cardGroup.length, {
															type: embed.table,
															data: item as Record<string, unknown>,
														});
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
														setStore("pages", "cardGroup", store.pages.cardGroup.length, {
															type: group.tableName,
															data: item.data as Record<string, unknown>,
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
								props.deleteCallback(data()[props.primaryKey] as string);
								setStore("pages", "cardGroup", (pre) => pre.slice(0, -1));
							}}
						/>
						<Button
							class="w-fit"
							icon={<Icons.Outline.Edit />}
							onclick={() => {
								setStore("pages", "cardGroup", (pre) => pre.slice(0, -1));
								props.openEditor(data());
							}}
						/>
					</div>
				</section>
			</Show>
		</div>
	);
}
