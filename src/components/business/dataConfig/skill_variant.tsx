import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import {
	deleteBehaviorTree,
	insertBehaviorTree,
	selectAllBehaviorTreesByActiveownerid,
	selectAllBehaviorTreesByPassiveownerid,
	selectAllBehaviorTreesByRegisteredownerid,
	selectBehaviorTreeById,
	updateBehaviorTree,
} from "@db/generated/repositories/behavior_tree";
import {
	deleteSkillVariant,
	insertSkillVariant,
	selectAllSkillVariants,
	selectAllSkillVariantsByBelongtoskillid,
	selectSkillVariantById,
	updateSkillVariant,
} from "@db/generated/repositories/skill_variant";
import {
	BehaviorTreeSchema,
	type behavior_tree,
	type DB,
	SkillVariantSchema,
	type skill_variant,
} from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { ActiveSkillBehaviorSchema, PassiveSkillBehaviorSchema, RegisteredSkillBehaviorSchema } from "@db/schema/jsons";
import { createId } from "@paralleldrive/cuid2";
import type { Transaction } from "kysely";
import { createSignal, Show } from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";
import z from "zod/v4";
import { BtEditorWrapper } from "~/components/business/utils/BTEditorWrapper";
import { Button } from "~/components/controls/button";
import { Input } from "~/components/controls/input";
import { BtEditor } from "~/components/features/BtEditor/BtEditor";
import type { TableDataConfig } from "../data-config";
import { DefaultFieldClass, type FormRenderers } from "../form/SchemaFieldRenderer";

const formatJson = (value: unknown): string => JSON.stringify(value ?? null, null, 2);

// behavior_tree 的归属字段由 skill_variant 保存流程统一维护，表单里只暴露编辑者真正关心的树内容。
// 这样新建 skill / 内嵌新建 skill_variant 时，行为树不会提前写库，也不会依赖尚未存在的 FK。
const BehaviorTreeEditorSchema = BehaviorTreeSchema.omit({
	activeOwnerId: true,
	passiveOwnerId: true,
	registeredOwnerId: true,
}).extend({
	id: z.string().default(() => createId()),
	name: z.string().default(defaultData.behavior_tree.name),
	definition: z.string().default(defaultData.behavior_tree.definition),
	agent: z.string().default(defaultData.behavior_tree.agent),
});

const ActiveBehaviorInputSchema = z.discriminatedUnion("source", [
	z.object({ source: z.literal("none") }),
	z.object({
		source: z.literal("dsl"),
		dsl: ActiveSkillBehaviorSchema,
	}),
	z.object({
		source: z.literal("bt"),
		tree: BehaviorTreeEditorSchema,
	}),
]);

// skill_variant 的表单模型表达“行为入口”的业务语义，而不是直接复刻数据库列：
// - active: none / dsl / bt 三选一；
// - passive: dsl 与 bt 可以并存；
// - registered: dsl[] 与 bt[] 可以并存。
// 持久化时再拆回 skill_variant 的 JSON 列和 behavior_tree 的 owner FK。
export const SkillVariantEditorSchema = SkillVariantSchema.omit({
	activeBehavior: true,
	passiveBehavior: true,
	registeredBehavior: true,
}).extend({
	activeBehavior: ActiveBehaviorInputSchema.default({ source: "none" }),
	passiveBehavior: z
		.object({
			dsl: z.array(PassiveSkillBehaviorSchema).default([]),
			tree: BehaviorTreeEditorSchema.nullable().default(null),
		})
		.default({ dsl: [], tree: null }),
	registeredBehavior: z
		.object({
			dsl: z.array(RegisteredSkillBehaviorSchema).default([]),
			trees: z.array(BehaviorTreeEditorSchema).default([]),
		})
		.default({ dsl: [], trees: [] }),
});

export type BehaviorTreeEditor = z.output<typeof BehaviorTreeEditorSchema>;
export type SkillVariantEditor = z.output<typeof SkillVariantEditorSchema>;

export const defaultSkillVariantEditor: SkillVariantEditor = SkillVariantEditorSchema.parse({
	...defaultData.skill_variant,
	activeBehavior: { source: "none" },
	passiveBehavior: { dsl: [], tree: null },
	registeredBehavior: { dsl: [], trees: [] },
});

const createDefaultBehaviorTreeEditor = (name = defaultData.behavior_tree.name): BehaviorTreeEditor =>
	BehaviorTreeEditorSchema.parse({
		...defaultData.behavior_tree,
		id: createId(),
		name,
	});

type BehaviorTreeOwnerKind = "active" | "passive" | "registered";

type SkillVariantBehaviorTrees = {
	active: behavior_tree | null;
	passive: behavior_tree | null;
	registered: behavior_tree[];
};

const selectBehaviorTreesByOwner = async (
	kind: BehaviorTreeOwnerKind,
	variantId: string,
	trx?: Transaction<DB>,
): Promise<behavior_tree[]> => {
	switch (kind) {
		case "active":
			return await selectAllBehaviorTreesByActiveownerid(variantId, trx);
		case "passive":
			return await selectAllBehaviorTreesByPassiveownerid(variantId, trx);
		case "registered":
			return await selectAllBehaviorTreesByRegisteredownerid(variantId, trx);
	}
};

const selectSkillVariantBehaviorTrees = async (
	variantId: string,
	trx?: Transaction<DB>,
): Promise<SkillVariantBehaviorTrees> => {
	const [activeTrees, passiveTrees, registered] = await Promise.all([
		selectBehaviorTreesByOwner("active", variantId, trx),
		selectBehaviorTreesByOwner("passive", variantId, trx),
		selectBehaviorTreesByOwner("registered", variantId, trx),
	]);
	return {
		active: activeTrees[0] ?? null,
		passive: passiveTrees[0] ?? null,
		registered,
	};
};

const toBehaviorTreeEditor = (tree: behavior_tree): BehaviorTreeEditor =>
	BehaviorTreeEditorSchema.parse({
		id: tree.id,
		name: tree.name,
		definition: tree.definition,
		agent: tree.agent,
		attributeSlots: tree.attributeSlots,
	});

const normalizeBehaviorTreeEditor = (tree: BehaviorTreeEditor): BehaviorTreeEditor =>
	BehaviorTreeEditorSchema.parse({
		...tree,
		id: tree.id || createId(),
	});

const toBehaviorTreeRow = (tree: BehaviorTreeEditor, kind: BehaviorTreeOwnerKind, variantId: string): behavior_tree =>
	BehaviorTreeSchema.parse({
		...defaultData.behavior_tree,
		...normalizeBehaviorTreeEditor(tree),
		activeOwnerId: kind === "active" ? variantId : null,
		passiveOwnerId: kind === "passive" ? variantId : null,
		registeredOwnerId: kind === "registered" ? variantId : null,
	});

const toSkillVariantEditor = (variant: skill_variant, behaviorTrees: SkillVariantBehaviorTrees): SkillVariantEditor =>
	SkillVariantEditorSchema.parse({
		...variant,
		activeBehavior: behaviorTrees.active
			? {
					source: "bt",
					tree: toBehaviorTreeEditor(behaviorTrees.active),
				}
			: variant.activeBehavior
				? {
						source: "dsl",
						dsl: variant.activeBehavior,
					}
				: { source: "none" },
		passiveBehavior: {
			dsl: variant.passiveBehavior,
			tree: behaviorTrees.passive ? toBehaviorTreeEditor(behaviorTrees.passive) : null,
		},
		registeredBehavior: {
			dsl: variant.registeredBehavior,
			trees: behaviorTrees.registered.map(toBehaviorTreeEditor),
		},
	});

const hydrateSkillVariantEditor = async (variant: skill_variant, trx?: Transaction<DB>): Promise<SkillVariantEditor> =>
	toSkillVariantEditor(variant, await selectSkillVariantBehaviorTrees(variant.id, trx));

const toSkillVariantRow = (editor: SkillVariantEditor, belongToskillId?: string): skill_variant => {
	const data = SkillVariantEditorSchema.parse({
		...editor,
		belongToskillId: belongToskillId ?? editor.belongToskillId,
	});
	return SkillVariantSchema.parse({
		...data,
		activeBehavior: data.activeBehavior.source === "dsl" ? data.activeBehavior.dsl : null,
		passiveBehavior: data.passiveBehavior.dsl,
		registeredBehavior: data.registeredBehavior.dsl,
	});
};

const upsertBehaviorTree = async (
	tree: BehaviorTreeEditor,
	kind: BehaviorTreeOwnerKind,
	variantId: string,
	trx: Transaction<DB>,
): Promise<behavior_tree> => {
	const row = toBehaviorTreeRow(tree, kind, variantId);
	const existing = await selectBehaviorTreeById(row.id, trx);
	if (existing) return await updateBehaviorTree(row.id, row, trx);
	return await insertBehaviorTree(row, trx);
};

const syncSingleBehaviorTree = async (
	kind: Exclude<BehaviorTreeOwnerKind, "registered">,
	variantId: string,
	tree: BehaviorTreeEditor | null,
	trx: Transaction<DB>,
): Promise<behavior_tree | null> => {
	const existingTrees = await selectBehaviorTreesByOwner(kind, variantId, trx);
	const targetId = tree?.id;
	// active/passive 是 1:1 关系；同步时先移除非目标树，保证唯一约束不会被旧行占住。
	for (const existing of existingTrees) {
		if (existing.id !== targetId) await deleteBehaviorTree(existing.id, trx);
	}
	if (!tree) return null;
	return await upsertBehaviorTree(tree, kind, variantId, trx);
};

const syncRegisteredBehaviorTrees = async (
	variantId: string,
	trees: BehaviorTreeEditor[],
	trx: Transaction<DB>,
): Promise<behavior_tree[]> => {
	const existingTrees = await selectBehaviorTreesByOwner("registered", variantId, trx);
	const submittedIds = new Set(trees.map((tree) => tree.id));
	// registered 是 1:N 快照：表单数组移除的树也要同步删除，避免旧注册行为继续挂在技能变体上。
	for (const existing of existingTrees) {
		if (!submittedIds.has(existing.id)) await deleteBehaviorTree(existing.id, trx);
	}

	const saved: behavior_tree[] = [];
	for (const tree of trees) {
		saved.push(await upsertBehaviorTree(tree, "registered", variantId, trx));
	}
	return saved;
};

const syncSkillVariantBehaviorTrees = async (
	editor: SkillVariantEditor,
	trx: Transaction<DB>,
): Promise<SkillVariantBehaviorTrees> => {
	const active =
		editor.activeBehavior.source === "bt"
			? await syncSingleBehaviorTree("active", editor.id, editor.activeBehavior.tree, trx)
			: await syncSingleBehaviorTree("active", editor.id, null, trx);
	const passive = await syncSingleBehaviorTree("passive", editor.id, editor.passiveBehavior.tree, trx);
	const registered = await syncRegisteredBehaviorTrees(editor.id, editor.registeredBehavior.trees, trx);
	return { active, passive, registered };
};

export const saveSkillVariantEditor = async (
	data: SkillVariantEditor,
	trx: Transaction<DB>,
	belongToskillId?: string,
): Promise<SkillVariantEditor> => {
	// 这个 helper 是 skill_variant 独立编辑和 skill.variants 内嵌编辑的共同写入入口；
	// 共享同一段事务映射逻辑，避免未来出现两套行为 DSL/BT 保存规则。
	const editor = SkillVariantEditorSchema.parse({
		...data,
		id: data.id || createId(),
		belongToskillId: belongToskillId ?? data.belongToskillId,
	});
	const variantRow = toSkillVariantRow(editor, belongToskillId);
	const existing = await selectSkillVariantById(variantRow.id, trx);
	const savedVariant = existing
		? await updateSkillVariant(variantRow.id, variantRow, trx)
		: await insertSkillVariant(variantRow, trx);
	const behaviorTrees = await syncSkillVariantBehaviorTrees(
		{
			...editor,
			id: savedVariant.id,
			belongToskillId: savedVariant.belongToskillId,
		},
		trx,
	);
	return toSkillVariantEditor(savedVariant, behaviorTrees);
};

export const getSkillVariantEditor = async (id: string): Promise<SkillVariantEditor | undefined> => {
	const variant = await selectSkillVariantById(id);
	if (!variant) return undefined;
	return await hydrateSkillVariantEditor(variant);
};

export const getAllSkillVariantEditors = async (): Promise<SkillVariantEditor[]> => {
	const variants = await selectAllSkillVariants();
	return await Promise.all(variants.map((variant) => hydrateSkillVariantEditor(variant)));
};

export const selectSkillVariantEditorsByBelongToskillid = async (
	belongToskillId: string,
	trx?: Transaction<DB>,
): Promise<SkillVariantEditor[]> => {
	const variants = await selectAllSkillVariantsByBelongtoskillid(belongToskillId, trx);
	return await Promise.all(variants.map((variant) => hydrateSkillVariantEditor(variant, trx)));
};

export const insertSkillVariantEditor = async (data: SkillVariantEditor): Promise<SkillVariantEditor> => {
	const db = await getDB();
	return await db.transaction().execute((trx) => saveSkillVariantEditor(data, trx));
};

export const updateSkillVariantEditor = async (id: string, data: SkillVariantEditor): Promise<SkillVariantEditor> => {
	const db = await getDB();
	return await db.transaction().execute((trx) =>
		saveSkillVariantEditor(
			{
				...data,
				id,
			},
			trx,
		),
	);
};

export const deleteSkillVariantEditor = async (
	id: string,
	trx?: Transaction<DB>,
): Promise<SkillVariantEditor | undefined> => {
	const deleteInTransaction = async (transaction: Transaction<DB>) => {
		const variant = await selectSkillVariantById(id, transaction);
		if (!variant) return undefined;
		const editor = await hydrateSkillVariantEditor(variant, transaction);
		const behaviorTrees = await selectSkillVariantBehaviorTrees(id, transaction);
		for (const tree of [behaviorTrees.active, behaviorTrees.passive, ...behaviorTrees.registered]) {
			if (tree) await deleteBehaviorTree(tree.id, transaction);
		}
		await deleteSkillVariant(id, transaction);
		return editor;
	};

	if (trx) return await deleteInTransaction(trx);
	const db = await getDB();
	return await db.transaction().execute(deleteInTransaction);
};

const hideImplementationField = () => <></>;

const renderBehaviorTreeEditorField = (props: {
	title: string;
	description?: string;
	validationMessage?: string;
	value: () => BehaviorTreeEditor | null | undefined;
	setTree: (tree: BehaviorTreeEditor) => void;
	clearTree?: () => void;
}): JSX.Element => {
	const [editorDisplay, setEditorDisplay] = createSignal(false);
	const currentTree = () => props.value() ?? null;
	const title = () => props.title || defaultData.behavior_tree.name;
	const ensureTree = (): BehaviorTreeEditor => {
		const existing = currentTree();
		if (existing) return existing;
		const nextTree = createDefaultBehaviorTreeEditor(title());
		props.setTree(nextTree);
		return nextTree;
	};

	const updateTree = (patch: Partial<BehaviorTreeEditor>) => {
		props.setTree({
			...ensureTree(),
			...patch,
		});
	};

	return (
		<Input
			title={title()}
			description={props.description ?? ""}
			validationMessage={props.validationMessage ?? ""}
			class={DefaultFieldClass}
		>
			<Show
				when={currentTree()}
				fallback={
					<Button class="w-full" onClick={() => props.setTree(createDefaultBehaviorTreeEditor(title()))}>
						创建行为树
					</Button>
				}
			>
				{(tree) => (
					<div class="flex w-full flex-col gap-2">
						<div class="bg-area-color text-main-text-color flex items-center justify-between gap-2 rounded p-2">
							<span class="truncate">{tree().name || title()}</span>
							<Show when={props.clearTree}>
								{(clearTree) => (
									<Button level="secondary" onClick={clearTree()}>
										清空
									</Button>
								)}
							</Show>
						</div>
						<BtEditorWrapper
							title="打开行为树编辑器"
							editorDisplay={editorDisplay()}
							setEditorDisplay={setEditorDisplay}
						>
							<BtEditor
								title={title()}
								value={{
									...tree(),
									memberType: "Player",
									attributeSlots: tree().attributeSlots ?? [],
								}}
								onChange={(nextTree) => {
									updateTree({
										name: nextTree.name,
										definition: nextTree.definition,
										agent: nextTree.agent,
										attributeSlots: nextTree.attributeSlots,
									});
								}}
								onClose={() => setEditorDisplay(false)}
							/>
						</BtEditorWrapper>
					</div>
				)}
			</Show>
		</Input>
	);
};

const skillVariantFormRenderers: FormRenderers<SkillVariantEditor> = {
	fields: {
		"activeBehavior.tree": (context) =>
			renderBehaviorTreeEditorField({
				title: context.dictionary?.key ?? "主动行为树",
				description: context.dictionary?.formFieldDescription,
				validationMessage: context.validationMessage,
				value: context.value,
				setTree: context.setValue,
			}),
		"activeBehavior.tree.id": hideImplementationField,
		"passiveBehavior.tree": (context) =>
			renderBehaviorTreeEditorField({
				title: context.dictionary?.key ?? "被动行为树",
				description: context.dictionary?.formFieldDescription,
				validationMessage: context.validationMessage,
				value: context.value,
				setTree: context.setValue,
				clearTree: () => context.setValue(null),
			}),
		"passiveBehavior.tree.id": hideImplementationField,
		"registeredBehavior.trees[]": (context) =>
			renderBehaviorTreeEditorField({
				title: context.dictionary?.key ?? "长期注册行为树",
				description: context.dictionary?.formFieldDescription,
				validationMessage: context.validationMessage,
				value: context.value,
				setTree: context.setValue,
			}),
		"registeredBehavior.trees[].id": hideImplementationField,
	},
	containers: {
		"activeBehavior.dsl.behaviorParams.damageEvents": (context) =>
			context.renderFrame({
				children: () => <div class="flex gap-2 p-1 bg-area-color rounded">{context.children()}</div>,
			}),
	},
};

export const SKILL_VARIANT_DATA_CONFIG: TableDataConfig<SkillVariantEditor, skill_variant, skill_variant> = (
	dictionary,
) => ({
	dictionary: dictionary().db.skill_variant,
	dataSchema: SkillVariantEditorSchema,
	primaryKey: "id",
	defaultData: defaultSkillVariantEditor,
	dataFetcher: {
		get: getSkillVariantEditor,
		getAll: getAllSkillVariantEditors,
		liveQuery: (db) => db.selectFrom("skill_variant").selectAll("skill_variant"),
		insert: insertSkillVariantEditor,
		update: updateSkillVariantEditor,
		delete: deleteSkillVariantEditor,
	},
	fieldGroupMap: {
		ID: ["id"],
		启用条件: ["targetMainWeaponType", "targetSubWeaponType", "targetArmorAbilityType"],
		所属技能: ["belongToskillId"],
		释放门槛: ["hpCost", "mpCost"],
		默认行为: ["activeBehavior", "passiveBehavior", "registeredBehavior"],
		详细信息: ["description", "details"],
	},
	table: {
		columnsDef: [
			{
				accessorKey: "description",
				cell: (info) => info.getValue(),
				size: 240,
			},
			{
				accessorKey: "mpCost",
				cell: (info) => info.getValue(),
				size: 120,
			},
			{
				accessorKey: "hpCost",
				cell: (info) => info.getValue(),
				size: 120,
			},
		],
		hiddenColumnDef: ["id", "belongToskillId", "activeBehavior", "passiveBehavior", "registeredBehavior"],
		defaultSort: { field: "id", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id"],
		renderers: skillVariantFormRenderers,
		onInsert: insertSkillVariantEditor,
		onUpdate: updateSkillVariantEditor,
	},
	card: {
		hiddenFields: ["id"],
		fieldGenerator: {
			activeBehavior: (field, key) => (
				<pre class="bg-area-color max-h-[50vh] w-full overflow-auto rounded p-3 text-sm">{formatJson(field[key])}</pre>
			),
			passiveBehavior: (field, key) => (
				<pre class="bg-area-color max-h-[50vh] w-full overflow-auto rounded p-3 text-sm">{formatJson(field[key])}</pre>
			),
			registeredBehavior: (field, key) => (
				<pre class="bg-area-color max-h-[50vh] w-full overflow-auto rounded p-3 text-sm">{formatJson(field[key])}</pre>
			),
		},
		deleteCallback: deleteSkillVariantEditor,
		editAbleCallback: (data) => repositoryMethods.skill_variant.canEdit(data.id),
	},
});
