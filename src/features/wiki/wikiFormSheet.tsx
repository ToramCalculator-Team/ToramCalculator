/**
 * wiki 记录表单导航：把「打开某表某条记录的编辑表单」做成一个可递进的入口。
 *
 * 与 wikiCardNav（只读卡片，dialog 层）的对称关系：
 *  - 卡片走 dialog 层，表单走 sheet 层
 *  - 卡片里点「编辑」→ 本模块开 sheet；表单里点关联条目 → 本模块 pushSheet 递进
 *
 * 表单底部的关联区块（ReferencedByFormSection）是这个模块存在的主要理由：
 * 编辑一条记录时常常要顺手编辑/新建它的子记录（技能 → 技能变体），
 * 让子表单压在同一个 sheet 层里递进，父表单保持挂载，关掉子表单即回到父表单。
 */

import type { RepositoryWriterContext } from "@db/generated/repositories";
import type { DB } from "@db/generated/zod/index";
import { type Accessor, Show } from "solid-js";
import { LoadingBar } from "~/components/ui/controls/loadingBar";
import { Form } from "~/components/ui/form/Form";
import { useOverlay } from "~/contexts/overlay/OverlayContext";
import type { Dictionary } from "~/locales/type";
import { createLiveKyselyQuery } from "~/platform/pglite/liveQuery";
import { store } from "~/store";
import { buildFKFormRenderers, ReferencedByFormSection } from "./fkRenderers";
import {
	createTableConfig,
	getRowPrimaryKeyValue,
	getTablePrimaryKey,
	isPrimaryKeyForeign,
	type TableConfig,
} from "./tableConfig";

/** 打开表单的目标：编辑既有记录，或新建（可预填若干列，用于把 FK 指回父记录）。 */
export type RecordFormTarget =
	| { mode: "update"; tableName: keyof DB; id: string }
	| { mode: "create"; tableName: keyof DB; prefill?: Record<string, unknown> };

/**
 * 表单层级语义（与 openRelatedCard 的同名参数对齐）：
 *  - "open" —— 新建 sheet 层。从页面、从卡片 dialog 进表单时用。
 *  - "push" —— 压入**当前** sheet 层。只能在 sheet 作用域内调用（表单里再开表单）。
 */
export type RecordFormMode = "open" | "push";

/**
 * 页面通用表单只负责收集字段；持久化由生成的 writer 负责授权和审计字段。
 * 动态表名会让异构 writer 函数形成联合类型，这里收窄为统一的记录写入边界，
 * 不把具体表的 writer 细节复制到每个调用点。
 */
async function submitRecord<TTableName extends keyof DB>(
	tableConfig: TableConfig<TTableName>,
	id: string | undefined,
	value: DB[TTableName],
): Promise<void> {
	const context: RepositoryWriterContext = {
		accountId: store.session.account.id,
		accountType: store.session.account.type,
	};
	const writer = tableConfig.writers;

	// 生成器按表生成不同的 Insert/Update 类型；页面已由对应 DBSchema 校验字段。
	// 这里是通用表单到逐表 writer 的唯一动态边界，避免调用点重复处理异构函数签名。
	if (id) {
		if (!writer.update) throw new Error(`表 ${String(tableConfig.tableName)} 不支持更新`);
		await writer.update(context, id, value as never);
		return;
	}
	if (!writer.create) throw new Error(`表 ${String(tableConfig.tableName)} 不支持创建`);
	const primaryKey = String(getTablePrimaryKey(tableConfig.tableName));
	const { [primaryKey]: providedPrimaryKey, ...createData } = value as Record<string, unknown>;
	const createOptions = isPrimaryKeyForeign(tableConfig.tableName) ? { id: providedPrimaryKey } : undefined;
	await writer.create(context, createData as never, createOptions as never);
}

/**
 * 表单主体：字段渲染 + 底部关联区块。编辑与新建共用，差别只在 selfId 有没有值。
 *
 * selfId 为空（新建）时不渲染关联区块 —— 记录还没主键，没有任何子行能引用它，
 * 也没法给子行预填 FK；保存后从卡片重新进编辑表单即可看到关联区块。
 */
function RecordForm<TTableName extends keyof DB>(props: {
	tableConfig: TableConfig<TTableName>;
	value: DB[TTableName];
	mode: "create" | "update";
	selfId: Accessor<string | undefined>;
	dictionary: Dictionary;
	onSubmit: (value: DB[TTableName]) => Promise<void>;
	/** FK 字段（指向父记录）的「打开」按钮：沿用卡片语义，只看不改。 */
	onOpenFKCard: (relatedTable: keyof DB, id: string) => void;
	/** 关联区块条目：打开子记录的编辑表单。 */
	onOpenRelatedRecord: (sourceTable: keyof DB, id: string) => void;
	/** 关联区块新增：打开子表新建表单，FK 列预填当前记录主键。 */
	onCreateRelatedRecord: (sourceTable: keyof DB, fkColumn: string, fkValue: string) => void;
}) {
	const fkFormRenderers = buildFKFormRenderers(
		props.tableConfig.tableName,
		props.tableConfig.UIConfig.form.hiddenFields ?? [],
		props.dictionary,
		props.onOpenFKCard,
	);

	return (
		<Form
			value={props.value}
			defaultValue={props.tableConfig.defaultData}
			dataSchema={props.tableConfig.schema}
			dictionary={props.tableConfig.dic}
			hiddenFields={props.tableConfig.UIConfig.form.hiddenFields}
			fieldGroupMap={props.tableConfig.UIConfig.fieldGroupMap}
			renderers={{
				fields: {
					...fkFormRenderers.fields,
					...props.tableConfig.UIConfig.form.renderers?.fields,
				},
				containers: props.tableConfig.UIConfig.form.renderers?.containers,
			}}
			mode={props.mode}
			onSubmit={props.onSubmit}
			extraSections={
				<ReferencedByFormSection
					referencedBy={props.tableConfig.UIConfig.form.referencedBy}
					selfId={props.selfId}
					dictionary={props.dictionary}
					onOpenRecord={(sourceTable, rowData) => {
						const id = getRowPrimaryKeyValue(sourceTable, rowData);
						if (id) props.onOpenRelatedRecord(sourceTable, id);
					}}
					onCreateRecord={(sourceTable, fkColumn) => {
						const selfId = props.selfId();
						if (selfId) props.onCreateRelatedRecord(sourceTable, fkColumn, selfId);
					}}
				/>
			}
		/>
	);
}

/**
 * 编辑表单加载器：live query 读到记录后再渲染表单。
 *
 * 用 live query 而非调用点的行快照，是因为关联条目只带主键（子表列表行不一定是完整行），
 * 统一从 readers.get 取完整记录，编辑入口就不必区分「手上有没有整行数据」。
 * Form 内部只在表单未被触碰时跟随 defaultValues，所以刷新不会冲掉正在输入的内容。
 */
function RecordFormLoader<TTableName extends keyof DB>(props: {
	tableConfig: TableConfig<TTableName>;
	id: string;
	dictionary: Dictionary;
	onSubmit: (value: DB[TTableName]) => Promise<void>;
	onOpenFKCard: (relatedTable: keyof DB, id: string) => void;
	onOpenRelatedRecord: (sourceTable: keyof DB, id: string) => void;
	onCreateRelatedRecord: (sourceTable: keyof DB, fkColumn: string, fkValue: string) => void;
}) {
	const record = createLiveKyselyQuery((db) => props.tableConfig.readers.get?.(db, props.id) ?? null);

	return (
		<Show
			when={record.rows()[0]}
			fallback={
				<div class="RecordFormLoading flex h-40 items-center justify-center p-3">
					<LoadingBar class="w-1/2 min-w-40" />
				</div>
			}
		>
			{(row) => (
				<RecordForm
					tableConfig={props.tableConfig}
					// Kysely selectAll 的行类型带 SelectType 包装，与 Zod 输出的 DB 行类型不一致，这里断言收窄。
					value={row() as unknown as DB[TTableName]}
					mode="update"
					selfId={() => props.id}
					dictionary={props.dictionary}
					onSubmit={props.onSubmit}
					onOpenFKCard={props.onOpenFKCard}
					onOpenRelatedRecord={props.onOpenRelatedRecord}
					onCreateRelatedRecord={props.onCreateRelatedRecord}
				/>
			)}
		</Show>
	);
}

/**
 * 创建记录表单导航函数。
 *
 * @param dictionary      字典 accessor（切语言后新开的表单用新字典）
 * @param openRelatedCard 卡片导航函数（表单里 FK 字段的「打开」按钮走它，保持只读语义）
 */
export function createOpenRecordForm(
	dictionary: Accessor<Dictionary>,
	openRelatedCard: (
		relatedTable: keyof DB,
		id: string,
		parentOverlay: ReturnType<typeof useOverlay>,
		mode?: "push" | "open",
	) => void,
) {
	function openRecordForm(
		target: RecordFormTarget,
		parentOverlay: ReturnType<typeof useOverlay>,
		// 默认取不会抛的那个："push" 在非 sheet 作用域调用会 throw（见 OverlayContext 契约），
		// 而递进调用点都显式传 "push"，所以默认值只兜住外部调用方。
		mode: RecordFormMode = "open",
	): void {
		const tableConfig = createTableConfig(target.tableName, dictionary());
		// 无 UI 配置的表画不出表单；编辑场景退化成只读卡片，新建场景只能放弃。
		if (!tableConfig) {
			if (target.mode === "update") openRelatedCard(target.tableName, target.id, parentOverlay, "open");
			return;
		}

		const entry: Parameters<typeof parentOverlay.openSheet>[0] = {
			render: (api) => {
				// 表单自身所在的 sheet 层：从这里 pushSheet 才能把子表单压在同一层内递进。
				const sheetOverlay = useOverlay();

				const commonProps = {
					tableConfig,
					dictionary: dictionary(),
					// FK 字段指向父记录，点开是「去看看那条记录长什么样」——保持卡片（只读）语义。
					// 卡片是 dialog 层，从 sheet 里只能新建一层，不能 push 进 sheet。
					onOpenFKCard: (relatedTable: keyof DB, id: string) => openRelatedCard(relatedTable, id, sheetOverlay, "open"),
					onOpenRelatedRecord: (sourceTable: keyof DB, id: string) =>
						openRecordForm({ mode: "update", tableName: sourceTable, id }, sheetOverlay, "push"),
					onCreateRelatedRecord: (sourceTable: keyof DB, fkColumn: string, fkValue: string) =>
						openRecordForm(
							{ mode: "create", tableName: sourceTable, prefill: { [fkColumn]: fkValue } },
							sheetOverlay,
							"push",
						),
				};

				if (target.mode === "update") {
					return (
						<RecordFormLoader
							{...commonProps}
							id={target.id}
							onSubmit={async (value) => {
								await submitRecord(tableConfig, target.id, value);
								api.close();
							}}
						/>
					);
				}

				return (
					<RecordForm
						{...commonProps}
						value={{ ...(tableConfig.defaultData as Record<string, unknown>), ...target.prefill } as never}
						mode="create"
						selfId={() => undefined}
						onSubmit={async (value) => {
							await submitRecord(tableConfig, undefined, value);
							api.close();
						}}
					/>
				);
			},
		};

		if (mode === "open") parentOverlay.openSheet(entry);
		else parentOverlay.pushSheet(entry);
	}

	return openRecordForm;
}
