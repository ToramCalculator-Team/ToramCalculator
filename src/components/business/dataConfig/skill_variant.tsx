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
import type { MemberBTTree } from "@db/schema/jsons";
import { createId } from "@paralleldrive/cuid2";
import type { Transaction } from "kysely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { createSignal, For, Show } from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";
import z from "zod/v4";
import { BtEditorWrapper } from "~/components/business/utils/BTEditorWrapper";
import { Button } from "~/components/controls/button";
import { Input } from "~/components/controls/input";
import { BtEditor, type BtEditorValue } from "~/components/features/BtEditor/BtEditor";
import type { Dictionary } from "~/locales/type";
import type { TableDataConfig } from "../data-config";
import { DefaultFieldClass, type FormFieldRendererContext, type FormRenderers } from "../form/SchemaFieldRenderer";

const formatJson = (value: unknown): string => JSON.stringify(value ?? null, null, 2);

// 设计说明：行为树资源属于 behavior_tree 表，skill_variant 表单实体显式带上三条外链结果。
// 这样 BtEditor 编辑的是可持久化的行为树记录，DSL JSON 字段继续作为无行为树时的回退入口。
export const SkillVariantWithBehaviorTreesSchema = SkillVariantSchema.extend({
	activeBehaviorTree: BehaviorTreeSchema.nullable(),
	passiveBehaviorTree: BehaviorTreeSchema.nullable(),
	registeredBehaviorTrees: z.array(BehaviorTreeSchema),
});

export type SkillVariantWithBehaviorTrees = z.output<typeof SkillVariantWithBehaviorTreesSchema>;

const defaultSkillVariantWithBehaviorTrees: SkillVariantWithBehaviorTrees = SkillVariantWithBehaviorTreesSchema.parse({
	...defaultData.skill_variant,
	comboCompatible: false,
	range: null,
	chantingFixedMs: null,
	chantingModifiedMs: null,
	chargingFixedMs: null,
	chargingModifiedMs: null,
	actionFixedMs: "0",
	actionModifiedMs: "0",
	startupRatio: "0",
	activeBehaviorTree: null,
	passiveBehaviorTree: null,
	registeredBehaviorTrees: [],
});

type BehaviorTreeOwnerKind = "active" | "passive" | "registered";

type SkillVariantBehaviorTrees = Pick<
	SkillVariantWithBehaviorTrees,
	"activeBehaviorTree" | "passiveBehaviorTree" | "registeredBehaviorTrees"
>;

const selectSkillVariantWithBehaviorTreesQuery = (db: Transaction<DB> | Awaited<ReturnType<typeof getDB>>) =>
	db
		.selectFrom("skill_variant")
		.selectAll("skill_variant")
		.select((eb) => [
			jsonObjectFrom(
				eb
					.selectFrom("behavior_tree")
					.whereRef("behavior_tree.activeOwnerId", "=", "skill_variant.id")
					.selectAll("behavior_tree"),
			).as("activeBehaviorTree"),
			jsonObjectFrom(
				eb
					.selectFrom("behavior_tree")
					.whereRef("behavior_tree.passiveOwnerId", "=", "skill_variant.id")
					.selectAll("behavior_tree"),
			).as("passiveBehaviorTree"),
			jsonArrayFrom(
				eb
					.selectFrom("behavior_tree")
					.whereRef("behavior_tree.registeredOwnerId", "=", "skill_variant.id")
					.selectAll("behavior_tree"),
			).as("registeredBehaviorTrees"),
		]);

export const getSkillVariantWithBehaviorTrees = async (
	id: string,
	trx?: Transaction<DB>,
): Promise<SkillVariantWithBehaviorTrees | undefined> => {
	const db = trx || (await getDB());
	const res = await selectSkillVariantWithBehaviorTreesQuery(db).where("skill_variant.id", "=", id).executeTakeFirst();
	return res ? SkillVariantWithBehaviorTreesSchema.parse(res) : undefined;
};

export const getAllSkillVariantsWithBehaviorTrees = async (): Promise<SkillVariantWithBehaviorTrees[]> => {
	const db = await getDB();
	const res = await selectSkillVariantWithBehaviorTreesQuery(db).execute();
	return res.map((variant) => SkillVariantWithBehaviorTreesSchema.parse(variant));
};

export const selectSkillVariantsWithBehaviorTreesByBelongToskillid = async (
	belongToskillId: string,
	trx?: Transaction<DB>,
): Promise<SkillVariantWithBehaviorTrees[]> => {
	const db = trx || (await getDB());
	const res = await selectSkillVariantWithBehaviorTreesQuery(db)
		.where("skill_variant.belongToskillId", "=", belongToskillId)
		.execute();
	return res.map((variant) => SkillVariantWithBehaviorTreesSchema.parse(variant));
};

const selectBehaviorTreesByOwner = async (
	kind: BehaviorTreeOwnerKind,
	variantId: string,
	trx: Transaction<DB>,
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

const normalizeBehaviorTree = (tree: behavior_tree, fallbackName: string): behavior_tree =>
	BehaviorTreeSchema.parse({
		...defaultData.behavior_tree,
		...tree,
		id: tree.id || createId(),
		name: tree.name || fallbackName,
		attributeSlots: Array.isArray(tree.attributeSlots) ? tree.attributeSlots : [],
	});

const toBehaviorTreeRow = (tree: behavior_tree, kind: BehaviorTreeOwnerKind, variantId: string): behavior_tree => {
	const normalized = normalizeBehaviorTree(tree, defaultData.behavior_tree.name);
	return BehaviorTreeSchema.parse({
		...normalized,
		activeOwnerId: kind === "active" ? variantId : null,
		passiveOwnerId: kind === "passive" ? variantId : null,
		registeredOwnerId: kind === "registered" ? variantId : null,
	});
};

const upsertBehaviorTree = async (
	tree: behavior_tree,
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
	tree: behavior_tree | null,
	trx: Transaction<DB>,
): Promise<behavior_tree | null> => {
	const existingTrees = await selectBehaviorTreesByOwner(kind, variantId, trx);
	const targetId = tree?.id;
	// active/passive 在数据库中用 unique owner FK 表达 1:1；先清理旧行，避免唯一约束占位。
	for (const existing of existingTrees) {
		if (existing.id !== targetId) await deleteBehaviorTree(existing.id, trx);
	}
	if (!tree) return null;
	return await upsertBehaviorTree(tree, kind, variantId, trx);
};

const syncRegisteredBehaviorTrees = async (
	variantId: string,
	trees: behavior_tree[],
	trx: Transaction<DB>,
): Promise<behavior_tree[]> => {
	const existingTrees = await selectBehaviorTreesByOwner("registered", variantId, trx);
	const submittedIds = new Set(trees.map((tree) => tree.id));
	// registered 是 1:N 快照；表单删除的树同步删除，避免旧注册行为继续挂在技能变体上。
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
	data: SkillVariantWithBehaviorTrees,
	trx: Transaction<DB>,
): Promise<SkillVariantBehaviorTrees> => {
	const activeBehaviorTree = await syncSingleBehaviorTree("active", data.id, data.activeBehaviorTree, trx);
	const passiveBehaviorTree = await syncSingleBehaviorTree("passive", data.id, data.passiveBehaviorTree, trx);
	const registeredBehaviorTrees = await syncRegisteredBehaviorTrees(data.id, data.registeredBehaviorTrees, trx);
	return { activeBehaviorTree, passiveBehaviorTree, registeredBehaviorTrees };
};

export const saveSkillVariantWithBehaviorTrees = async (
	data: SkillVariantWithBehaviorTrees,
	trx: Transaction<DB>,
	belongToskillId?: string,
): Promise<SkillVariantWithBehaviorTrees> => {
	// 设计说明：独立 skill_variant 表单和 skill.variants 内嵌表单共享同一写入入口。
	// 行为树 owner FK 在这里统一回填，表单层只表达“这条变体拥有哪些行为树”。
	const entity = SkillVariantWithBehaviorTreesSchema.parse({
		...defaultSkillVariantWithBehaviorTrees,
		...data,
		id: data.id || createId(),
		belongToskillId: belongToskillId ?? data.belongToskillId,
		activeBehaviorTree: data.activeBehaviorTree ?? null,
		passiveBehaviorTree: data.passiveBehaviorTree ?? null,
		registeredBehaviorTrees: data.registeredBehaviorTrees ?? [],
	});
	const variantRow = SkillVariantSchema.parse(entity);
	const existing = await selectSkillVariantById(variantRow.id, trx);
	const savedVariant = existing
		? await updateSkillVariant(variantRow.id, variantRow, trx)
		: await insertSkillVariant(variantRow, trx);
	const behaviorTrees = await syncSkillVariantBehaviorTrees(
		{
			...entity,
			id: savedVariant.id,
			belongToskillId: savedVariant.belongToskillId,
		},
		trx,
	);
	return SkillVariantWithBehaviorTreesSchema.parse({
		...savedVariant,
		...behaviorTrees,
	});
};

export const insertSkillVariantWithBehaviorTrees = async (
	data: SkillVariantWithBehaviorTrees,
): Promise<SkillVariantWithBehaviorTrees> => {
	const db = await getDB();
	return await db.transaction().execute((trx) => saveSkillVariantWithBehaviorTrees(data, trx));
};

export const updateSkillVariantWithBehaviorTrees = async (
	id: string,
	data: SkillVariantWithBehaviorTrees,
): Promise<SkillVariantWithBehaviorTrees> => {
	const db = await getDB();
	return await db.transaction().execute((trx) => saveSkillVariantWithBehaviorTrees({ ...data, id }, trx));
};

export const deleteSkillVariantWithBehaviorTrees = async (
	id: string,
	trx?: Transaction<DB>,
): Promise<SkillVariantWithBehaviorTrees | undefined> => {
	const deleteInTransaction = async (transaction: Transaction<DB>) => {
		const variant = await getSkillVariantWithBehaviorTrees(id, transaction);
		if (!variant) return undefined;
		for (const tree of [variant.activeBehaviorTree, variant.passiveBehaviorTree, ...variant.registeredBehaviorTrees]) {
			if (tree) await deleteBehaviorTree(tree.id, transaction);
		}
		await deleteSkillVariant(id, transaction);
		return variant;
	};

	if (trx) return await deleteInTransaction(trx);
	const db = await getDB();
	return await db.transaction().execute(deleteInTransaction);
};

const createDefaultBehaviorTree = (name: string): behavior_tree =>
	BehaviorTreeSchema.parse({
		...defaultData.behavior_tree,
		id: createId(),
		name,
	});

const toBtEditorValue = (tree: behavior_tree): BtEditorValue => ({
	name: tree.name,
	definition: tree.definition,
	agent: tree.agent,
	memberType: "Player",
	attributeSlots: Array.isArray(tree.attributeSlots) ? tree.attributeSlots : [],
});

const patchBehaviorTreeFromEditor = (tree: behavior_tree, next: MemberBTTree): behavior_tree =>
	BehaviorTreeSchema.parse({
		...tree,
		name: next.name,
		definition: next.definition,
		agent: next.agent,
		attributeSlots: next.attributeSlots,
	});

const BehaviorTreeEditorControl = (props: {
	title: string;
	value: () => behavior_tree | null | undefined;
	setValue: (tree: behavior_tree) => void;
	clearValue?: () => void;
	clearLabel?: string;
}) => {
	const [display, setDisplay] = createSignal(false);
	const currentTree = () => props.value() ?? null;
	const ensureTree = (): behavior_tree => {
		const existing = currentTree();
		if (existing) return existing;
		const nextTree = createDefaultBehaviorTree(props.title);
		props.setValue(nextTree);
		return nextTree;
	};
	const updateTree = (next: MemberBTTree) => props.setValue(patchBehaviorTreeFromEditor(ensureTree(), next));

	return (
		<Show
			when={currentTree()}
			fallback={
				<Button class="w-full" onClick={() => props.setValue(createDefaultBehaviorTree(props.title))}>
					创建行为树
				</Button>
			}
		>
			{(tree) => (
				<div class="flex w-full flex-col gap-2">
					<div class="bg-area-color text-main-text-color flex items-center justify-between gap-2 rounded p-2">
						<span class="truncate">{tree().name || props.title}</span>
						<Show when={props.clearValue}>
							{(clearValue) => (
								<Button level="secondary" onClick={clearValue()}>
									{props.clearLabel ?? "清空"}
								</Button>
							)}
						</Show>
					</div>
					<BtEditorWrapper title="打开行为树编辑器" editorDisplay={display()} setEditorDisplay={setDisplay}>
						<BtEditor
							title={props.title}
							value={toBtEditorValue(tree())}
							onChange={updateTree}
							onClose={() => setDisplay(false)}
						/>
					</BtEditorWrapper>
				</div>
			)}
		</Show>
	);
};

const renderSingleBehaviorTreeField = (props: {
	title: string;
	description?: string;
	validationMessage: string;
	value: () => behavior_tree | null;
	setValue: (tree: behavior_tree | null) => void;
}): JSX.Element => (
	<Input
		title={props.title}
		description={props.description ?? ""}
		validationMessage={props.validationMessage}
		class={DefaultFieldClass}
	>
		<BehaviorTreeEditorControl
			title={props.title}
			value={props.value}
			setValue={(tree) => props.setValue(tree)}
			clearValue={() => props.setValue(null)}
		/>
	</Input>
);

const renderRegisteredBehaviorTreesField = (
	context: FormFieldRendererContext<SkillVariantWithBehaviorTrees, "registeredBehaviorTrees">,
	title: string,
): JSX.Element => {
	const trees = () => (Array.isArray(context.value()) ? context.value() : []);
	const setTrees = (next: behavior_tree[]) => context.setValue(next);
	return (
		<Input
			title={title}
			description={context.dictionary?.formFieldDescription ?? ""}
			validationMessage={context.validationMessage}
			class={DefaultFieldClass}
		>
			<div class="flex w-full flex-col gap-3">
				<For each={trees()}>
					{(tree, index) => (
						<div class="border-dividing-color bg-primary-color flex w-full flex-col gap-2 rounded border p-2">
							<div class="text-main-text-color font-bold">{`${title} #${index() + 1}`}</div>
							<BehaviorTreeEditorControl
								title={`${title} #${index() + 1}`}
								value={() => tree}
								setValue={(nextTree) => {
									const next = [...trees()];
									next[index()] = nextTree;
									setTrees(next);
								}}
								clearValue={() => {
									setTrees(trees().filter((_, treeIndex) => treeIndex !== index()));
								}}
								clearLabel="移除"
							/>
						</div>
					)}
				</For>
				<Button class="w-full" onClick={() => setTrees([...trees(), createDefaultBehaviorTree(title)])}>
					新增行为树
				</Button>
			</div>
		</Input>
	);
};

const createSkillVariantFormRenderers = (dictionary: Dictionary): FormRenderers<SkillVariantWithBehaviorTrees> => {
	const behaviorTreeName = dictionary.db.behavior_tree.selfName;
	return {
		fields: {
			activeBehaviorTree: (context) =>
				renderSingleBehaviorTreeField({
					title: `主动${behaviorTreeName}`,
					description: context.dictionary?.formFieldDescription,
					validationMessage: context.validationMessage,
					value: context.value,
					setValue: context.setValue,
				}),
			passiveBehaviorTree: (context) =>
				renderSingleBehaviorTreeField({
					title: `被动${behaviorTreeName}`,
					description: context.dictionary?.formFieldDescription,
					validationMessage: context.validationMessage,
					value: context.value,
					setValue: context.setValue,
				}),
			registeredBehaviorTrees: (context) => renderRegisteredBehaviorTreesField(context, `长期注册${behaviorTreeName}`),
		},
		containers: {
			"activeBehavior.behaviorParams.damageEvents": (context) =>
				context.renderFrame({
					children: () => <div class="flex gap-2 p-1 bg-area-color rounded">{context.children()}</div>,
				}),
		},
	};
};

const renderBehaviorTreeCard = (
	tree: behavior_tree | null | undefined,
	emptyText: string,
	title: string,
): JSX.Element => (
	<Show
		when={tree}
		fallback={
			<div class="Field flex gap-2">
				<span class="text-main-text-color text-nowrap">{emptyText}</span>
			</div>
		}
	>
		{(currentTree) => (
			<div class="Field flex flex-col gap-2">
				<span class="text-main-text-color text-nowrap">{currentTree().name}</span>
				<div class="border-dividing-color bg-primary-color h-[32rem] min-h-96 w-full overflow-hidden rounded border">
					<BtEditor title={title} value={toBtEditorValue(currentTree())} readOnly />
				</div>
			</div>
		)}
	</Show>
);

export const SKILL_VARIANT_DATA_CONFIG: TableDataConfig<SkillVariantWithBehaviorTrees, skill_variant, skill_variant> = (
	dictionary,
) => ({
	dictionary: dictionary().db.skill_variant,
	dataSchema: SkillVariantWithBehaviorTreesSchema,
	primaryKey: "id",
	defaultData: defaultSkillVariantWithBehaviorTrees,
	dataFetcher: {
		get: getSkillVariantWithBehaviorTrees,
		getAll: getAllSkillVariantsWithBehaviorTrees,
		insert: insertSkillVariantWithBehaviorTrees,
		update: updateSkillVariantWithBehaviorTrees,
		delete: deleteSkillVariantWithBehaviorTrees,
		liveQuery: (db) => db.selectFrom("skill_variant").selectAll("skill_variant"),
	},
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["targetMainWeaponType", "targetSubWeaponType", "targetArmorAbilityType", "comboCompatible"],
		消耗与范围: ["hpCost", "mpCost", "range"],
		时间参数: [
			"castTimeType",
			"distanceType",
			"targetType",
			"chantingFixedMs",
			"chantingModifiedMs",
			"chargingFixedMs",
			"chargingModifiedMs",
			"actionFixedMs",
			"actionModifiedMs",
			"startupRatio",
		],
		"默认行为 DSL": ["activeBehavior", "passiveBehavior", "registeredBehavior"],
		行为树: ["activeBehaviorTree", "passiveBehaviorTree", "registeredBehaviorTrees"],
		其他: ["description", "details"],
		关联: ["belongToskillId"],
	},
	table: {
		columnsDef: [
			{ id: "id", accessorFn: (row) => row.id, cell: (info) => info.getValue(), size: 200 },
			{
				id: "targetMainWeaponType",
				accessorFn: (row) => row.targetMainWeaponType,
				cell: (info) => info.getValue(),
				size: 180,
			},
			{
				id: "targetSubWeaponType",
				accessorFn: (row) => row.targetSubWeaponType,
				cell: (info) => info.getValue(),
				size: 180,
			},
			{ id: "description", accessorFn: (row) => row.description, cell: (info) => info.getValue(), size: 240 },
		],
		hiddenColumnDef: ["id", "belongToskillId"],
		defaultSort: { field: "id", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id", "belongToskillId"],
		renderers: createSkillVariantFormRenderers(dictionary()),
		onInsert: insertSkillVariantWithBehaviorTrees,
		onUpdate: updateSkillVariantWithBehaviorTrees,
	},
	card: {
		hiddenFields: ["id", "belongToskillId"],
		displayName: (variant, dictionary) => {
			const fields = dictionary.db.skill_variant.fields;
			const mainWeapon =
				fields.targetMainWeaponType.enumMap?.[variant.targetMainWeaponType] ?? variant.targetMainWeaponType;
			const subWeapon =
				fields.targetSubWeaponType.enumMap?.[variant.targetSubWeaponType] ?? variant.targetSubWeaponType;
			const armorAbility =
				fields.targetArmorAbilityType.enumMap?.[variant.targetArmorAbilityType] ?? variant.targetArmorAbilityType;
			return `${mainWeapon} / ${subWeapon} / ${armorAbility}`;
		},
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
			activeBehaviorTree: (field) => renderBehaviorTreeCard(field.activeBehaviorTree, "无主动行为树", "主动行为树"),
			passiveBehaviorTree: (field) => renderBehaviorTreeCard(field.passiveBehaviorTree, "无被动行为树", "被动行为树"),
			registeredBehaviorTrees: (field) => (
				<div class="Field flex flex-col gap-2">
					<For each={field.registeredBehaviorTrees}>
						{(tree) => renderBehaviorTreeCard(tree, "无长期注册行为树", "长期注册行为树")}
					</For>
				</div>
			),
		},
		deleteCallback: deleteSkillVariantWithBehaviorTrees,
		editAbleCallback: (data) => repositoryMethods.skill_variant.canEdit(data.id),
	},
});
