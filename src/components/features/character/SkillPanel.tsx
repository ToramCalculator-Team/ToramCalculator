import type { CharacterSkillWithRelations } from "@db/generated/repositories/character_skill";
import { type Skill, selectAllSkillsQuery } from "@db/generated/repositories/skill";
import { SKILL_TREE_GROUP_TYPE, SKILL_TREE_TYPE, type SkillTreeType } from "@db/schema/enums";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createEffect, createMemo, createSignal, For, Index, onCleanup, Show } from "solid-js";
import { Button } from "~/components/controls/button";
import { Icons } from "~/components/icons";
import { useDictionary } from "~/contexts/Dictionary";
import { type OverlayLayerHandle, useOverlay } from "~/lib/overlay/OverlayContext";
import { createLiveKyselyQuery } from "~/lib/pglite/liveQuery";
import { SKILL_TREE_MAP, SkillTreePickerSheetContent } from "./SkillTreePickerSheet";
import {
	buildSkillLinkCells,
	getCssGridRow,
	getSkillGridX,
	getSkillGridY,
	getSkillTreeGridBounds,
	SKILL_GRID_CELL_HEIGHT,
	SKILL_GRID_CELL_WIDTH,
	SkillLinkCellBlock,
	type SkillTreeGridBounds,
} from "./skillTreeGrid";

type SkillTreeEntry = {
	templates: Skill[];
};

type SkillTemplateTreeIndex = Record<SkillTreeType, SkillTreeEntry>;

type VisibleSkillTreeOverrideMap = Partial<Record<SkillTreeType, boolean>>;

export type SkillPanelProps = {
	skills: CharacterSkillWithRelations[];
	onSkillLevelAdjustRequested: (payload: { templateId: string; delta: -1 | 1 }) => void;
	onSkillTreeRemoveRequested: (treeType: SkillTreeType) => void;
};

const SKILL_MAX_LEVEL = 10;
const SKILL_LEARNED_LEVEL = 1;

function createEmptySkillTemplateTreeIndex(): SkillTemplateTreeIndex {
	// skill 模板是技能树结构的唯一事实来源；character_skill 只记录某个角色在模板上的等级。
	const tree = {} as SkillTemplateTreeIndex;
	for (const treeType of SKILL_TREE_TYPE) {
		tree[treeType] = { templates: [] };
	}
	return tree;
}

function SkillLevelAdjustButton(props: {
	children: string;
	disabled: boolean;
	label: string;
	onClick: () => void;
	side: "left" | "right";
}) {
	return (
		<button
			type="button"
			aria-label={props.label}
			disabled={props.disabled}
			class={`absolute top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-accent-color px-4 py-3 text-primary-color shadow-card shadow-dividing-color ${props.side === "left" ? "left-[-54px]" : "right-[-54px]"} ${props.disabled ? "pointer-events-none opacity-40" : "pointer-events-auto hover:bg-accent-color-0"}`}
			onClick={(event) => {
				event.stopPropagation();
				props.onClick();
			}}
		>
			<span class="text-base leading-6">{props.children}</span>
			<span class="pointer-events-none absolute inset-1 rounded-full border border-primary-color" />
		</button>
	);
}

function SkillNodeCell(props: {
	bounds: SkillTreeGridBounds;
	canDecrease: boolean;
	canIncrease: boolean;
	focused: boolean;
	level: number;
	onDecrease: () => void;
	onFocus: () => void;
	onIncrease: () => void;
	template: Skill;
}) {
	const learned = createMemo(() => props.level >= SKILL_LEARNED_LEVEL);

	return (
		// 设计说明：技能格负责占位，节点按钮负责交互；空白区不参与命中，避免相邻格盖住聚焦节点的 +/- 控件。
		<div
			class="SkillNodeCell pointer-events-none relative flex items-center justify-center overflow-visible"
			style={{
				"grid-column": getSkillGridX(props.template) - props.bounds.minX + 1,
				"grid-row": getCssGridRow(getSkillGridY(props.template), props.bounds),
				"z-index": props.focused ? "30" : "0",
			}}
		>
			<button
				type="button"
				title={`${props.template.name} Lv.${props.level}`}
				aria-label={`${props.template.name} Lv.${props.level}`}
				aria-pressed={props.focused}
				class={`pointer-events-auto relative z-10 flex size-[68px] cursor-pointer items-center justify-center rounded-full border-2 bg-linear-to-b from-[#00d1e0] to-[#0e2398] p-0.5 ${props.focused ? "border-primary-color" : "border-brand-color-4th"} ${learned() ? "" : "opacity-55 saturate-50"} hover:border-primary-color`}
				onClick={props.onFocus}
			>
				<span class="absolute left-1/2 top-[-30px] -translate-x-1/2 px-2 py-0.5 text-base font-bold leading-6 text-primary-color">
					{props.level}
				</span>
				<span class="SkillNodeIcon flex size-16 items-center justify-center overflow-hidden rounded-full border border-dividing-color bg-area-color bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgb(var(--accent))_0%,rgb(var(--accent)/0)_100%)] text-lg font-bold text-primary-color">
					<span class="text-sm">{props.template.name}</span>
				</span>
			</button>
			<Show when={props.focused}>
				<SkillLevelAdjustButton
					disabled={!props.canDecrease}
					label={`${props.template.name} 等级减 1`}
					onClick={props.onDecrease}
					side="left"
				>
					-
				</SkillLevelAdjustButton>
				<SkillLevelAdjustButton
					disabled={!props.canIncrease}
					label={`${props.template.name} 等级加 1`}
					onClick={props.onIncrease}
					side="right"
				>
					+
				</SkillLevelAdjustButton>
			</Show>
		</div>
	);
}

export function SkillPanel(props: SkillPanelProps) {
	const dictionary = useDictionary();
	const overlay = useOverlay();
	const skillTemplates = createLiveKyselyQuery<Skill>((db) => selectAllSkillsQuery(db));
	let skillTreePickerSheetHandle: OverlayLayerHandle | undefined;
	const [visibleSkillTreeOverrides, setVisibleSkillTreeOverrides] = createSignal<VisibleSkillTreeOverrideMap>({});
	const [focusedTreeSkillId, setFocusedTreeSkillId] = createSignal<string | null>(null);
	const ordinarySkillByTemplateId = createMemo(
		() => new Map(props.skills.filter((skill) => !skill.isStarGem).map((skill) => [skill.templateId, skill])),
	);

	const skillTemplateTreeIndex = createMemo<SkillTemplateTreeIndex>(() => {
		const tree = createEmptySkillTemplateTreeIndex();
		for (const template of skillTemplates.rows()) {
			tree[template.treeType].templates.push(template);
		}
		return tree;
	});
	const [activeSkillTreeType, setActiveSkillTreeType] = createSignal<SkillTreeType>("MagicSkill");
	const activeTreeTemplates = createMemo(() =>
		[...skillTemplateTreeIndex()[activeSkillTreeType()].templates].sort(
			(a, b) => getSkillGridY(a) - getSkillGridY(b) || getSkillGridX(a) - getSkillGridX(b),
		),
	);
	const activeTreeGridBounds = createMemo(() => getSkillTreeGridBounds(activeTreeTemplates()));
	const activeTreeLinkCells = createMemo(() => buildSkillLinkCells(activeTreeTemplates()));
	let skillTreeEditorSheetHandle: OverlayLayerHandle | undefined;
	const closeSkillTreeEditorSheet = () => {
		const handle = skillTreeEditorSheetHandle;
		skillTreeEditorSheetHandle = undefined;
		handle?.close();
	};
	const closeSkillTreePickerSheet = () => {
		const handle = skillTreePickerSheetHandle;
		skillTreePickerSheetHandle = undefined;
		handle?.close();
	};
	const templateLevel = (template: Skill) => ordinarySkillByTemplateId().get(template.id)?.lv ?? 0;
	const hasSkillsInTree = (treeType: SkillTreeType) =>
		skillTemplateTreeIndex()[treeType].templates.some((template) => templateLevel(template) >= SKILL_LEARNED_LEVEL);
	const isSkillTreeVisible = (treeType: SkillTreeType) =>
		hasSkillsInTree(treeType) || (visibleSkillTreeOverrides()[treeType] ?? false);

	const toggleSkillTreeDisplay = (treeType: SkillTreeType) => {
		if (hasSkillsInTree(treeType)) return;
		setVisibleSkillTreeOverrides((pre) => ({
			...pre,
			[treeType]: !isSkillTreeVisible(treeType),
		}));
	};

	// 设计说明：删除技能树条目表示移除该角色在这个树类型下的普通技能配置；星石技能属于独立配置，不跟随技能树删除。
	const removeSkillTreeFromCharacter = (treeType: SkillTreeType) => {
		const templates = skillTemplateTreeIndex()[treeType].templates;

		setVisibleSkillTreeOverrides((pre) => ({ ...pre, [treeType]: false }));
		setFocusedTreeSkillId((focused) =>
			focused && templates.some((template) => template.id === focused) ? null : focused,
		);
		if (activeSkillTreeType() === treeType) closeSkillTreeEditorSheet();
		props.onSkillTreeRemoveRequested(treeType);
	};

	onCleanup(() => {
		closeSkillTreeEditorSheet();
		closeSkillTreePickerSheet();
	});

	createEffect(() => {
		// 设计说明：空焦点是合法编辑状态，sheet 打开时不预选技能，只有用户点选节点后才展示 +/- 控件。
		const templates = activeTreeTemplates();
		const focused = focusedTreeSkillId();
		if (focused && !templates.some((template) => template.id === focused)) setFocusedTreeSkillId(null);
	});

	const increaseSkillLevel = (template: Skill) => {
		if (templateLevel(template) >= SKILL_MAX_LEVEL) return;
		props.onSkillLevelAdjustRequested({ templateId: template.id, delta: 1 });
	};

	const decreaseSkillLevel = (template: Skill) => {
		if (templateLevel(template) <= 0) return;
		props.onSkillLevelAdjustRequested({ templateId: template.id, delta: -1 });
	};

	const canDecreaseSkill = (template: Skill) => {
		const currentLevel = templateLevel(template);
		return currentLevel > 0;
	};

	const renderSkillTreeEditorSheet = () => (
		<div class="flex portrait:h-[90dvh] h-full w-full flex-col gap-2 overflow-hidden p-6">
			<div class="sheetTitle flex w-full items-center justify-between text-xl font-bold">
				{dictionary().db.skill.fields.treeType.enumMap[activeSkillTreeType()]}
				<Button
					icon={<Icons.Outline.Close />}
					level="quaternary"
					class="rounded-none rounded-tr"
					onClick={closeSkillTreeEditorSheet}
				/>
			</div>
			{/* 不使用defer时会出现布局动画 */}
			<OverlayScrollbarsComponent
				element="div"
				options={{ scrollbars: { autoHide: "scroll" } }}
				class="SkillGroupConfig h-full w-full rounded"
				defer
			>
				{/* 根据当前活动技能树模板绘制技能树网格；角色是否习得只影响节点等级和状态。 */}
				<Show
					when={activeTreeTemplates().length > 0}
					fallback={
						<div class="flex h-full w-full items-center justify-center rounded bg-area-color text-main-text-color">
							{dictionary().db.skill.fields.treeType.enumMap[activeSkillTreeType()]}
						</div>
					}
				>
					<div
						class="SkillTreeCanvas inline-grid min-h-full min-w-full overflow-visible bg-accent-color px-24 py-12"
						style={{
							"grid-template-columns": `repeat(${activeTreeGridBounds().columnCount}, ${SKILL_GRID_CELL_WIDTH}px)`,
							"grid-template-rows": `repeat(${activeTreeGridBounds().rowCount}, ${SKILL_GRID_CELL_HEIGHT}px)`,
						}}
					>
						<For each={activeTreeLinkCells()}>
							{(cell) => <SkillLinkCellBlock cell={cell} bounds={activeTreeGridBounds()} />}
						</For>
						<For each={activeTreeTemplates()}>
							{(template) => (
								<SkillNodeCell
									bounds={activeTreeGridBounds()}
									canDecrease={canDecreaseSkill(template)}
									canIncrease={templateLevel(template) < SKILL_MAX_LEVEL}
									focused={focusedTreeSkillId() === template.id}
									level={templateLevel(template)}
									onDecrease={() => decreaseSkillLevel(template)}
									onFocus={() => setFocusedTreeSkillId(template.id)}
									onIncrease={() => increaseSkillLevel(template)}
									template={template}
								/>
							)}
						</For>
					</div>
				</Show>
			</OverlayScrollbarsComponent>
		</div>
	);

	const openSkillTreeEditorSheet = (treeType: SkillTreeType) => {
		closeSkillTreeEditorSheet();
		setActiveSkillTreeType(treeType);
		setFocusedTreeSkillId(null);
		skillTreeEditorSheetHandle = overlay.openSheet({
			render: renderSkillTreeEditorSheet,
			onCloseRequest: () => {
				skillTreeEditorSheetHandle = undefined;
			},
		});
	};

	const openSkillTreePickerSheet = () => {
		if (skillTreePickerSheetHandle) return;
		skillTreePickerSheetHandle = overlay.openSheet({
			render: (api) => (
				<SkillTreePickerSheetContent
					onClose={api.close}
					hasSkills={hasSkillsInTree}
					isDisplayed={isSkillTreeVisible}
					onToggle={toggleSkillTreeDisplay}
				/>
			),
			onCloseRequest: () => {
				skillTreePickerSheetHandle = undefined;
			},
		});
	};

	return (
		<div class="SkillConfig flex flex-col gap-2 w-full">
			{/* 外层配置：选择角色启用的技能树种类；已有角色技能的树固定展示，未习得的树走本地显示开关。 */}
			<div class="SkillTree flex flex-col">
				<div class="SkillConfigLabel flex justify-between">
					<span class="font-bold">{dictionary().ui.character.tabs.skill.treeSkill}</span>
					<Button icon={<Icons.Outline.DocmentAdd />} level="quaternary" onClick={openSkillTreePickerSheet} />
				</div>
				<Index each={SKILL_TREE_GROUP_TYPE}>
					{(treeGroupType) => (
						<Index each={SKILL_TREE_MAP[treeGroupType()]}>
							{(skillTreeType, index) => {
								const treeType = skillTreeType();
								return (
									<Show when={isSkillTreeVisible(treeType)}>
										<button
											type="button"
											class="SkillItem flex flex-col gap-2"
											onclick={() => openSkillTreeEditorSheet(treeType)}
										>
											<div class="w-full h-full flex flex-1 items-center py-3 border-b border-dividing-color">
												<div
													class={`Label w-full flex gap-1 px-4 py-3 border-l-2 ${
														{
															0: "border-brand-color-1st",
															1: "border-brand-color-2nd",
															2: "border-brand-color-3rd",
															3: "border-brand-color-4th",
														}[index % 4]
													}`}
												>
													{dictionary().db.skill.fields.treeType.enumMap[treeType]}
												</div>
												<div class="flex flex-none px-4 py-3">
													<Button
														icon={<Icons.Outline.Trash />}
														level="quaternary"
														onClick={(event) => {
															event.stopPropagation();
															removeSkillTreeFromCharacter(treeType);
														}}
													/>
												</div>
											</div>
										</button>
									</Show>
								);
							}}
						</Index>
					)}
				</Index>
			</div>
			{/* 外层配置：星石技能来源独立于技能树等级配置，当前仅展示角色已携带的星石技能。 */}
			<div class="StarGem flex flex-col">
				<div class="StarGemLabel flex justify-between">
					<span class="font-bold">{dictionary().ui.character.tabs.skill.starGem}</span>
					<Button icon={<Icons.Outline.DocmentAdd />} level="quaternary" disabled />
				</div>
				<For each={props.skills.filter((skill) => skill.isStarGem)}>
					{(skill) => (
						<div class="SkillItem flex flex-col gap-2">
							<div class="SkillItemLabel">{skill.template.name}</div>
						</div>
					)}
				</For>
			</div>
		</div>
	);
}
