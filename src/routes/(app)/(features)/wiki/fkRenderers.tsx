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
import { For, Show, type Accessor, type JSX } from "solid-js";
import { Autocomplete } from "~/components/controls/autoComplete";
import { Button } from "~/components/controls/button";
import { Input } from "~/components/controls/input";
import type { ObjRenderers } from "~/components/dataDisplay/ObjRenderer";
import type { FormRenderers } from "~/components/form/fields";
import { Icons } from "~/components/icons/index";
import { createLiveKyselyQuery } from "~/lib/pglite/liveQuery";
import type { Dictionary } from "~/locales/type";

// ---------------------------------------------------------------------------
// 通用：从 MODEL_METADATA.displayFields 或 name 字段取显示名称
// ---------------------------------------------------------------------------

/**
 * 根据表名和行数据推断显示名称。
 * 优先取 `name` 字段；其次按 `@displayName` 注释标记的字段拼接（" / "）；最终降级为主键值。
 */
export function getDisplayName(
	tableName: keyof DB,
	row: Record<string, unknown>,
	dictionary?: Dictionary,
): string {
	if (typeof row.name === "string" && row.name) return row.name;

	const meta = MODEL_METADATA.find((m) => m.tableName === tableName);
	const displayFields = (meta as { displayFields?: string[] }).displayFields ?? [];
	if (displayFields.length > 0) {
		const parts = displayFields.map((f) => {
			const rawValue = row[f];
			if (rawValue == null) return undefined;
			// 通过字典 enumMap 做 i18n 翻译，无映射时降级到原始值
			const fieldDic = (dictionary?.db[tableName] as Record<string, unknown> | undefined)?.fields as
				| Record<string, { enumMap?: Record<string, string> }>
				| undefined;
			const translated = fieldDic?.[f]?.enumMap?.[String(rawValue)];
			return translated ?? String(rawValue);
		}).filter(Boolean);
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
export function buildFKCardRenderers<TTableName extends keyof DB>(
	tableName: TTableName,
	hiddenFields: Array<keyof DB[TTableName]>,
	dictionary: Dictionary,
	onOpenCard: (relatedTable: keyof DB, id: string) => void,
): ObjRenderers<DB[TTableName]> {
	const fields: Record<
		string,
		(ctx: { value: Accessor<unknown>; renderDefault: () => JSX.Element; dictionary?: { key?: string }; path: string }) => JSX.Element
	> = {};

	const hiddenSet = new Set(hiddenFields.map(String));

	// 自动检测当前表的所有FK列
	const fkRelations = FOREIGN_KEY_RELATIONS.filter((r) => r.sourceTable === tableName);

	for (const fk of fkRelations) {
		const fkColumn = fk.sourceColumns[0];
		if (!fkColumn || hiddenSet.has(fkColumn)) continue;

		const relatedTable = fk.targetTable;
		const relatedDic = dictionary.db[relatedTable];
		const relatedPK = getPrimaryKeys(relatedTable)[0];

		fields[fkColumn] = ({ value, dictionary: fieldDic, path }) => {
			const fkId = () => value() as string | null | undefined;

			const relatedRecord = createLiveKyselyQuery((db) => {
				const id = fkId();
				if (!id || !relatedPK) return null;
				return repositoryReaders[relatedTable]?.get?.(db, id) ?? null;
			});

			const displayName = () => {
				const row = relatedRecord.rows()[0] as Record<string, unknown> | undefined;
				if (!row) return fkId() ?? "";
				return getDisplayName(relatedTable, row, dictionary);
			};

			const fieldLabel = fieldDic?.key ?? path;

			return (
				<div class="FKField flex gap-2 items-center">
					<span class="text-main-text-color text-nowrap">{fieldLabel}</span>:
					<Show
						when={fkId()}
						fallback={<span class="text-boundary-color text-sm">—</span>}
					>
						<Button
							level="secondary"
							onClick={() => onOpenCard(relatedTable, fkId()!)}
						>
							{displayName()}
						</Button>
					</Show>
				</div>
			);
		};
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
export function buildFKFormRenderers<TTableName extends keyof DB>(
	tableName: TTableName,
	hiddenFields: Array<keyof DB[TTableName]>,
	dictionary: Dictionary,
	onOpenRelated: (relatedTable: keyof DB, id: string) => void,
): FormRenderers<DB[TTableName]> {
	const fields: Record<
		string,
		(ctx: { value: () => unknown; setValue: (v: unknown) => void; dictionary?: { key?: string; formFieldDescription?: string } }) => JSX.Element
	> = {};

	const hiddenSet = new Set(hiddenFields.map(String));
	const fkRelations = FOREIGN_KEY_RELATIONS.filter((r) => r.sourceTable === tableName);

	for (const fk of fkRelations) {
		const fkColumn = fk.sourceColumns[0];
		if (!fkColumn || hiddenSet.has(fkColumn)) continue;

		const relatedTable = fk.targetTable;
		const relatedDic = dictionary.db[relatedTable];
		const pk = getPrimaryKeys(relatedTable)[0];

		fields[fkColumn] = (ctx) => {
			const allOptions = createLiveKyselyQuery(
				(db) => repositoryReaders[relatedTable]?.getAll?.(db) ?? null,
			);

			const currentId = () => ctx.value() as string | null | undefined;

			const selectedOption = () =>
				pk
					? allOptions.rows().find((o) => String(o[pk as keyof typeof o]) === currentId())
					: undefined;

			// label/description 来自字典，与默认字段渲染保持一致
			const fieldLabel = ctx.dictionary?.key ?? fkColumn;
			const fieldDesc = ctx.dictionary?.formFieldDescription ?? "";

			return (
				<Input title={fieldLabel} description={fieldDesc}>
					<div class="FKFormField flex items-center gap-2">
						<div class="min-w-0 flex-1">
							<Autocomplete
								id={`fk-${String(tableName)}-${fkColumn}`}
								options={allOptions.rows()}
								value={currentId() ?? undefined}
								onChange={(id) => ctx.setValue(id)}
								getOptionValue={(o) => (pk ? String(o[pk as keyof typeof o]) : "")}
								getOptionLabel={(o) => {
									const row = o as Record<string, unknown>;
									if (typeof row.name === "string" && row.name) return row.name;
									return pk ? String(row[String(pk)] ?? "") : "";
								}}
							/>
						</div>
						<Show when={selectedOption()}>
							<Button
								level="quaternary"
								title={`打开 ${relatedDic?.selfName ?? String(relatedTable)}`}
								onClick={() => {
									const id = currentId();
									if (id) onOpenRelated(relatedTable, id);
								}}
							>
								<Icons.Outline.ZoomIn />
							</Button>
						</Show>
					</div>
				</Input>
			);
		};
	}

	return { fields } as FormRenderers<DB[TTableName]>;
}

// ---------------------------------------------------------------------------
// ReferencedBySection — after 槽中展示指向当前记录的子表条目
// ---------------------------------------------------------------------------

/**
 * 在 ObjRenderer 或 Form 的 after 槽中展示「被引用方」关联记录列表。
 * 使用 data-config 中显式声明的 referencedBy 列表，不做自动检测。
 * 声明为 [] 则不渲染任何内容。
 */
export function ReferencedBySection<TTableName extends keyof DB>(props: {
	tableName: TTableName;
	referencedBy: Array<{ relation: string; tableName: keyof DB }>;
	data: Accessor<DB[TTableName] | undefined>;
	dictionary: Dictionary;
	onOpenCard: (relatedTable: keyof DB, rowData: Record<string, unknown>) => void;
}) {
	return (
		<Show when={props.referencedBy.length > 0}>
			<div class="ReferencedBySection border-dividing-color flex flex-col gap-2 border-t pt-3">
				<For each={props.referencedBy}>
					{(ref) => (
						<ReferencedByEntry
							sourceTable={ref.tableName}
							relationField={ref.relation.split(".")[1] ?? ref.relation}
							selfTable={props.tableName}
							data={props.data}
							dictionary={props.dictionary}
							onOpenCard={props.onOpenCard}
						/>
					)}
				</For>
			</div>
		</Show>
	);
}

// ---------------------------------------------------------------------------
// 内部组件：单个 referencedBy 条目
// ---------------------------------------------------------------------------

/**
 * 查询并渲染单个 referencedBy 条目对应的子表记录列表。
 * 全量拉取后在内存过滤（PGlite 本地 DB，适合小型游戏数据集）。
 */
function ReferencedByEntry<TTableName extends keyof DB>(props: {
	sourceTable: keyof DB;
	relationField: string;
	selfTable: TTableName;
	data: Accessor<DB[TTableName] | undefined>;
	dictionary: Dictionary;
	onOpenCard: (relatedTable: keyof DB, rowData: Record<string, unknown>) => void;
}) {
	// 找到子表持有的 FK 列名（指向当前表）
	const fkColumn = FOREIGN_KEY_RELATIONS.find(
		(r) => r.sourceTable === props.sourceTable && r.relationField === props.relationField,
	)?.sourceColumns[0];

	const selfPK = getPrimaryKeys(props.selfTable)[0];
	const sourcePK = getPrimaryKeys(props.sourceTable)[0];

	// 全量拉取子表记录
	const allRows = createLiveKyselyQuery(
		(db) => repositoryReaders[props.sourceTable]?.getAll?.(db) ?? null,
	);

	// 内存过滤：只保留 FK 指向当前记录的行
	const filteredRows = () => {
		const selfId = selfPK ? String(props.data()?.[selfPK as keyof DB[TTableName]] ?? "") : "";
		if (!fkColumn || !selfId) return [];
		return (allRows.rows() as Record<string, unknown>[]).filter(
			(row) => String(row[fkColumn] ?? "") === selfId,
		);
	};

	const relatedDic = props.dictionary.db[props.sourceTable];

	return (
		<Show when={filteredRows().length > 0}>
			<div class="ReferencedByGroup flex flex-col gap-1">
				<span class="text-main-text-color text-nowrap">{relatedDic?.selfName ?? String(props.sourceTable)}:</span>
				<div class="flex flex-wrap gap-1">
					<For each={filteredRows()}>
						{(row) => {
			const displayName = () => getDisplayName(props.sourceTable, row, props.dictionary);
							return (
								<Button level="secondary" onClick={() => props.onOpenCard(props.sourceTable, row)}>
									{displayName()}
								</Button>
							);
						}}
					</For>
				</div>
			</div>
		</Show>
	);
}
