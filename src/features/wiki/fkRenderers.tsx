/**
 * wiki 功能层的外键级联渲染工厂（DMMF 自动检测版）。
 *
 * 设计职责分层：
 *  - DMMF（FOREIGN_KEY_RELATIONS / DB_REFERENCED_BY）：物理外键事实，自动检测
 *  - 本文件（wiki 功能层）：把检测到的FK关系翻译为渲染器，知道 overlay、字典
 *  - ObjRenderer / Form（通用组件层）：只接受渲染器结果，不感知数据库结构
 *
 * 外键渲染分两类：
 *  - 字段级（buildFKCardRenderers / buildFKFormRenderers）：覆盖自动检测到的FK列渲染
 *  - 关联区块（ReferencedBySection）：在 after 槽展示指向当前记录的子表条目列表
 *
 * 过滤规则：hiddenFields 里的列直接跳过（认为是有意隐藏，如审计字段）
 */

import { FOREIGN_KEY_RELATIONS, getPrimaryKeys, MODEL_METADATA } from "@db/generated/dmmf-utils";
import { repositoryReaders } from "@db/generated/repositories";
import type { DB } from "@db/generated/zod/index";
import { type Accessor, createMemo, For, type JSX, Show } from "solid-js";
import { Autocomplete } from "~/components/controls/autoComplete";
import { Button } from "~/components/controls/button";
import { Input } from "~/components/controls/input";
import type { ObjRenderers } from "~/components/dataDisplay/ObjRenderer";
import type { FormRenderers } from "~/components/form/fields";
import { Icons } from "~/components/icons/index";
import { createLiveKyselyQuery } from "~/lib/pglite/liveQuery";
import type { Dictionary } from "~/locales/type";
import { getRowPrimaryKeyValue } from "./tableConfig";

// ---------------------------------------------------------------------------
// 通用：从 MODEL_METADATA.displayFields 或 name 字段取显示名称
// ---------------------------------------------------------------------------

/**
 * 根据表名和行数据推断显示名称。
 * 优先取 `name` 字段；其次按 `@displayName` 注释标记的字段拼接（" / "）；最终降级为主键值。
 */
export function getDisplayName(tableName: keyof DB, row: Record<string, unknown>, dictionary?: Dictionary): string {
	if (typeof row.name === "string" && row.name) return row.name;

	const meta = MODEL_METADATA.find((m) => m.tableName === tableName);
	const displayFields = (meta as { displayFields?: string[] }).displayFields ?? [];
	if (displayFields.length > 0) {
		const parts = displayFields
			.map((f) => {
				const rawValue = row[f];
				if (rawValue == null) return undefined;
				// 通过字典 enumMap 做 i18n 翻译，无映射时降级到原始值
				const fieldDic = (dictionary?.db[tableName] as Record<string, unknown> | undefined)?.fields as
					| Record<string, { enumMap?: Record<string, string> }>
					| undefined;
				const translated = fieldDic?.[f]?.enumMap?.[String(rawValue)];
				return translated ?? String(rawValue);
			})
			.filter(Boolean);
		if (parts.length > 0) return parts.join(" / ");
	}

	const pk = getPrimaryKeys(tableName)[0];
	return pk ? String(row[String(pk)] ?? "") : "";
}

// ---------------------------------------------------------------------------
// buildFKCardRenderers — 从 DMMF 自动检测并生成 Card 字段级渲染器
// ---------------------------------------------------------------------------

/**
 * 为 ObjRenderer（卡片视图）自动检测并生成 FK 字段渲染器。
 * 扫描 FOREIGN_KEY_RELATIONS 找出当前表的所有FK列（排除 hiddenFields），
 * 为每列生成：查询关联记录 → 显示为按钮（1行）。
 *
 * @param tableName    当前表名
 * @param hiddenFields 已隐藏的字段（跳过其中的FK列）
 * @param dictionary   全局字典（取关联表 selfName 作为按钮提示）
 * @param onOpenCard   点击按钮的回调，由 wiki 页面层传入（负责打开 overlay）
 */
function FKCardField(props: {
	fkId: Accessor<string | null | undefined>;
	relatedTable: keyof DB;
	relatedPK: string | undefined;
	fieldLabel: string;
	dictionary: Dictionary;
	onOpenCard: (id: string) => void;
}) {
	const relatedRecord = createLiveKyselyQuery((db) => {
		const id = props.fkId();
		if (!id || !props.relatedPK) return null;
		return repositoryReaders[props.relatedTable]?.get?.(db, id) ?? null;
	});

	const displayName = () => {
		const row = relatedRecord.rows()[0] as Record<string, unknown> | undefined;
		if (!row) return props.fkId() ?? "";
		return getDisplayName(props.relatedTable, row, props.dictionary);
	};

	return (
		<div class="FKField flex gap-2 items-center">
			<span class="text-main-text-color text-nowrap">{props.fieldLabel}</span>:
			<Show when={props.fkId()} fallback={<span class="text-boundary-color text-sm">—</span>}>
				<Button level="secondary" onClick={() => props.onOpenCard(props.fkId()!)}>
					{displayName()}
				</Button>
			</Show>
		</div>
	);
}

export function buildFKCardRenderers<TTableName extends keyof DB>(
	tableName: TTableName,
	hiddenFields: Array<keyof DB[TTableName]>,
	dictionary: Dictionary,
	onOpenCard: (relatedTable: keyof DB, id: string) => void,
): ObjRenderers<DB[TTableName]> {
	const fields: Record<
		string,
		(ctx: {
			value: Accessor<unknown>;
			renderDefault: () => JSX.Element;
			dictionary?: { key?: string };
			path: string;
		}) => JSX.Element
	> = {};

	const hiddenSet = new Set(hiddenFields.map(String));
	const fkRelations = FOREIGN_KEY_RELATIONS.filter((r) => r.sourceTable === tableName);

	for (const fk of fkRelations) {
		const fkColumn = fk.sourceColumns[0];
		if (!fkColumn || hiddenSet.has(fkColumn)) continue;

		const relatedTable = fk.targetTable;
		const relatedPK = getPrimaryKeys(relatedTable)[0];

		fields[fkColumn] = ({ value, dictionary: fieldDic, path }) => (
			<FKCardField
				fkId={() => value() as string | null | undefined}
				relatedTable={relatedTable}
				relatedPK={relatedPK}
				fieldLabel={fieldDic?.key ?? path}
				dictionary={dictionary}
				onOpenCard={(id) => onOpenCard(relatedTable, id)}
			/>
		);
	}

	return { fields } as ObjRenderers<DB[TTableName]>;
}

// ---------------------------------------------------------------------------
// buildFKFormRenderers — 从 DMMF 自动检测并生成 Form 字段级渲染器
// ---------------------------------------------------------------------------

/**
 * 为 Form 自动检测并生成 FK 字段渲染器。
 * 扫描 FOREIGN_KEY_RELATIONS 找出当前表的所有FK列（排除 hiddenFields），
 * 为每列生成：Autocomplete（选择关联记录id）+ 打开按钮。
 *
 * @param tableName      当前表名
 * @param hiddenFields   已隐藏的字段
 * @param dictionary     全局字典
 * @param onOpenRelated  点击"打开"按钮的回调
 */
function FKFormField(props: {
	tableName: keyof DB;
	fkColumn: string;
	relatedTable: keyof DB;
	pk: string | undefined;
	fieldLabel: string;
	fieldDesc: string;
	dictionary: Dictionary;
	value: Accessor<string | null | undefined>;
	setValue: (v: unknown) => void;
	onOpenRelated: (id: string) => void;
}) {
	const allOptions = createLiveKyselyQuery((db) => repositoryReaders[props.relatedTable]?.getAll?.(db) ?? null);

	const selectedOption = () =>
		props.pk ? allOptions.rows().find((o) => String(o[props.pk! as keyof typeof o]) === props.value()) : undefined;

	const relatedDic = () => props.dictionary.db[props.relatedTable];

	return (
		<Input title={props.fieldLabel} description={props.fieldDesc}>
			<div class="FKFormField w-full flex items-center gap-2">
				<div class="min-w-0 flex-1">
					<Autocomplete
						id={`fk-${String(props.tableName)}-${props.fkColumn}`}
						options={allOptions.rows()}
						value={props.value() ?? undefined}
						onChange={(id) => props.setValue(id)}
						getOptionValue={(o) => (props.pk ? String(o[props.pk as keyof typeof o]) : "")}
						getOptionLabel={(o) => {
							const row = o as Record<string, unknown>;
							if (typeof row.name === "string" && row.name) return row.name;
							return props.pk ? String(row[String(props.pk)] ?? "") : "";
						}}
					/>
				</div>
				<Show when={selectedOption()}>
					<Button
						level="quaternary"
						title={`打开 ${relatedDic()?.selfName ?? String(props.relatedTable)}`}
						onClick={() => {
							const id = props.value();
							if (id) props.onOpenRelated(id);
						}}
					>
						<Icons.Outline.ZoomIn />
					</Button>
				</Show>
			</div>
		</Input>
	);
}

export function buildFKFormRenderers<TTableName extends keyof DB>(
	tableName: TTableName,
	hiddenFields: Array<keyof DB[TTableName]>,
	dictionary: Dictionary,
	onOpenRelated: (relatedTable: keyof DB, id: string) => void,
): FormRenderers<DB[TTableName]> {
	const fields: Record<
		string,
		(ctx: {
			value: () => unknown;
			setValue: (v: unknown) => void;
			dictionary?: { key?: string; formFieldDescription?: string };
		}) => JSX.Element
	> = {};

	const hiddenSet = new Set(hiddenFields.map(String));
	const fkRelations = FOREIGN_KEY_RELATIONS.filter((r) => r.sourceTable === tableName);

	for (const fk of fkRelations) {
		const fkColumn = fk.sourceColumns[0];
		if (!fkColumn || hiddenSet.has(fkColumn)) continue;

		const relatedTable = fk.targetTable;
		const pk = getPrimaryKeys(relatedTable)[0];

		fields[fkColumn] = (ctx) => (
			<FKFormField
				tableName={tableName}
				fkColumn={fkColumn}
				relatedTable={relatedTable}
				pk={pk}
				fieldLabel={ctx.dictionary?.key ?? fkColumn}
				fieldDesc={ctx.dictionary?.formFieldDescription ?? ""}
				dictionary={dictionary}
				value={() => ctx.value() as string | null | undefined}
				setValue={ctx.setValue}
				onOpenRelated={(id) => onOpenRelated(relatedTable, id)}
			/>
		);
	}

	return { fields } as FormRenderers<DB[TTableName]>;
}

// ---------------------------------------------------------------------------
// ReferencedBySection — 卡片/表单底部展示指向当前记录的子表条目
// ---------------------------------------------------------------------------

/** 声明形如 `{ relation: "skill_variant.belongToSkill", tableName: "skill_variant" }`。 */
type ReferencedByDecl = { relation: string; tableName: keyof DB };

/** 声明里的 relation 可能带 `表名.` 前缀，取关系字段名部分。 */
const declRelationField = (decl: ReferencedByDecl): string => decl.relation.split(".")[1] ?? decl.relation;

/**
 * 查询「FK 指向当前记录」的子表行。
 * 全量拉取后在内存过滤（PGlite 本地 DB，适合小型游戏数据集）。
 *
 * 卡片视图与表单视图共用同一查询语义，差异只在主键从哪来、点击做什么。
 */
function useReferencedByRows(props: {
	sourceTable: keyof DB;
	relationField: string;
	selfId: Accessor<string | undefined>;
}) {
	// 子表持有的 FK 列名（指向当前表）
	const fkColumn = createMemo(
		() =>
			FOREIGN_KEY_RELATIONS.find((r) => r.sourceTable === props.sourceTable && r.relationField === props.relationField)
				?.sourceColumns[0],
	);

	const allRows = createLiveKyselyQuery((db) => repositoryReaders[props.sourceTable]?.getAll?.(db) ?? null);

	const rows = () => {
		const selfId = props.selfId();
		const column = fkColumn();
		if (!column || !selfId) return [];
		return (allRows.rows() as Record<string, unknown>[]).filter((row) => String(row[column] ?? "") === selfId);
	};

	return { fkColumn, rows };
}

/**
 * 单个 referencedBy 条目：一行「子表名: [条目按钮...] [新增]」。
 * 传 onCreate 时才渲染新增按钮（表单模式独有，卡片是只读视图）。
 */
function ReferencedByEntry(props: {
	sourceTable: keyof DB;
	relationField: string;
	selfId: Accessor<string | undefined>;
	dictionary: Dictionary;
	onOpen: (sourceTable: keyof DB, rowData: Record<string, unknown>) => void;
	onCreate?: (sourceTable: keyof DB, fkColumn: string) => void;
}) {
	const { fkColumn, rows } = useReferencedByRows(props);

	const relatedDic = props.dictionary.db[props.sourceTable];
	// 新增按钮需要知道往哪个列写当前主键；FK 列解析不出来时只能退化成只读列表。
	const canCreate = () => Boolean(props.onCreate && fkColumn() && props.selfId());

	return (
		<Show when={rows().length > 0 || canCreate()}>
			<div class="ReferencedByGroup flex flex-col gap-1">
				<span class="text-main-text-color text-nowrap">{relatedDic?.selfName ?? String(props.sourceTable)}:</span>
				<div class="flex flex-wrap items-center gap-1">
					<For each={rows()}>
						{(row) => {
							const displayName = () => getDisplayName(props.sourceTable, row, props.dictionary);
							return (
								<Button level="secondary" onClick={() => props.onOpen(props.sourceTable, row)}>
									{displayName()}
								</Button>
							);
						}}
					</For>
					<Show when={canCreate()}>
						<Button
							level="quaternary"
							icon={<Icons.Outline.DocmentAdd />}
							onClick={() => {
								const column = fkColumn();
								if (column) props.onCreate?.(props.sourceTable, column);
							}}
						>
							{props.dictionary.ui.actions.add}
						</Button>
					</Show>
				</div>
			</div>
		</Show>
	);
}

/**
 * 卡片（ObjRenderer.after 槽）里的被引用方列表 —— 只读，点条目打开子记录卡片。
 * 使用 data-config 中显式声明的 referencedBy 列表，不做自动检测；声明为 [] 则不渲染。
 */
export function ReferencedBySection<TTableName extends keyof DB>(props: {
	tableName: TTableName;
	referencedBy: ReferencedByDecl[];
	data: Accessor<DB[TTableName] | undefined>;
	dictionary: Dictionary;
	onOpenCard: (relatedTable: keyof DB, rowData: Record<string, unknown>) => void;
}) {
	const selfId = () => getRowPrimaryKeyValue(props.tableName, props.data() as Record<string, unknown> | undefined);

	return (
		<Show when={props.referencedBy.length > 0}>
			<div class="ReferencedBySection border-dividing-color flex flex-col gap-2 border-t pt-3">
				<For each={props.referencedBy}>
					{(ref) => (
						<ReferencedByEntry
							sourceTable={ref.tableName}
							relationField={declRelationField(ref)}
							selfId={selfId}
							dictionary={props.dictionary}
							onOpen={props.onOpenCard}
						/>
					)}
				</For>
			</div>
		</Show>
	);
}

/**
 * 表单（Form.extraSections 槽）里的被引用方列表 —— 可编辑：
 *  - 点条目打开该子记录的**编辑表单**
 *  - 点新增打开子表新建表单，并预填指向当前记录的 FK 列
 *
 * selfId 为空（新建模式，记录还没主键）时整块不渲染：此时没有任何行能引用它。
 */
export function ReferencedByFormSection(props: {
	referencedBy: ReferencedByDecl[];
	selfId: Accessor<string | undefined>;
	dictionary: Dictionary;
	onOpenRecord: (sourceTable: keyof DB, rowData: Record<string, unknown>) => void;
	onCreateRecord: (sourceTable: keyof DB, fkColumn: string) => void;
}) {
	return (
		<Show when={props.referencedBy.length > 0 && props.selfId()}>
			<div class="ReferencedByFormSection border-dividing-color mx-3 flex flex-col gap-2 border-t pt-3 pb-3">
				<For each={props.referencedBy}>
					{(ref) => (
						<ReferencedByEntry
							sourceTable={ref.tableName}
							relationField={declRelationField(ref)}
							selfId={props.selfId}
							dictionary={props.dictionary}
							onOpen={props.onOpenRecord}
							onCreate={props.onCreateRecord}
						/>
					)}
				</For>
			</div>
		</Show>
	);
}
