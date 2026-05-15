import type { CharacterSkillWithRelations } from "@db/generated/repositories/character_skill";
import { type Skill, selectAllSkills } from "@db/generated/repositories/skill";
import { SKILL_TREE_GROUP_TYPE, SKILL_TREE_TYPE, type SkillTreeType } from "@db/schema/enums";
import { createId } from "@paralleldrive/cuid2";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createEffect, createMemo, createResource, createSignal, For, Index, on, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { Sheet } from "~/components/containers/sheet";
import { Button } from "~/components/controls/button";
import { Icons } from "~/components/icons";
import { useDictionary } from "~/contexts/Dictionary";
import { SKILL_TREE_MAP, SkillTreePickerSheet } from "./SkillTreePickerSheet";

type SkillTreeEntry = {
	templates: Skill[];
};

type SkillTemplateTreeIndex = Record<SkillTreeType, SkillTreeEntry>;

type VisibleSkillTreeOverrideMap = Partial<Record<SkillTreeType, boolean>>;

type SkillLevelState = {
	characterSkillId?: string;
	lv: number;
};

type SkillLevelByTemplateId = Record<string, SkillLevelState>;

type SkillTreeGridBounds = {
	minX: number;
	minY: number;
	columnCount: number;
	rowCount: number;
};

type SkillLinkDirection = "left" | "right" | "top" | "bottom";

type SkillLinkCell = Record<SkillLinkDirection, boolean> & {
	key: string;
	x: number;
	y: number;
	hasJunction: boolean;
};

export type SkillPanelProps = {
	characterId: string;
	skills: CharacterSkillWithRelations[];
	onSkillLevelsChangeRequested: (changes: Array<{ template: Skill; lv: number; characterSkillId?: string }>) => void;
	onSkillTreeRemoveRequested: (payload: { templateIds: string[]; characterSkillIds: string[] }) => void;
};

const SKILL_GRID_CELL_SIZE = 68;
const SKILL_TREE_MIN_COLUMN_COUNT = 12;
const SKILL_TREE_MIN_ROW_COUNT = 1;
const SKILL_MAX_LEVEL = 10;
const SKILL_LEARNED_LEVEL = 1;
const SKILL_PREREQUISITE_LEVEL = 5;

function createEmptySkillTemplateTreeIndex(): SkillTemplateTreeIndex {
	// skill 模板是技能树结构的唯一事实来源；character_skill 只记录某个角色在模板上的等级。
	const tree = {} as SkillTemplateTreeIndex;
	for (const treeType of SKILL_TREE_TYPE) {
		tree[treeType] = { templates: [] };
	}
	return tree;
}

function createSkillLevelByTemplateId(skills: CharacterSkillWithRelations[]): SkillLevelByTemplateId {
	return Object.fromEntries(
		skills
			.filter((skill) => !skill.isStarGem)
			.map((skill) => [skill.templateId, { characterSkillId: skill.id, lv: skill.lv }]),
	);
}

function getGridCoordinateKey(x: number, y: number): string {
	return `${x}:${y}`;
}

function getSkillGridX(template: Skill): number {
	return template.posX;
}

function getSkillGridY(template: Skill): number {
	return template.posY;
}

function getCssGridRow(y: number, bounds: SkillTreeGridBounds): number {
	return bounds.rowCount - (y - bounds.minY);
}

function getSkillTreeGridBounds(templates: Skill[]): SkillTreeGridBounds {
	if (templates.length === 0) {
		return { minX: 0, minY: 0, columnCount: SKILL_TREE_MIN_COLUMN_COUNT, rowCount: SKILL_TREE_MIN_ROW_COUNT };
	}
	const xs = templates.map(getSkillGridX);
	const ys = templates.map(getSkillGridY);
	// 设计说明：模板坐标直接等于渲染网格坐标，布局密度由技能数据维护者控制。
	const minX = Math.min(0, ...xs);
	const maxX = Math.max(...xs);
	const minY = Math.min(0, ...ys);
	const maxY = Math.max(...ys);
	return {
		minX,
		minY,
		columnCount: Math.max(SKILL_TREE_MIN_COLUMN_COUNT, maxX - minX + 1),
		rowCount: Math.max(SKILL_TREE_MIN_ROW_COUNT, maxY - minY + 1),
	};
}

function appendHorizontalSkillLinkPath(path: Array<{ x: number; y: number }>, targetX: number, y: number): void {
	const current = path.at(-1);
	if (!current || current.x === targetX) return;
	const step = Math.sign(targetX - current.x);
	for (let x = current.x + step; x !== targetX + step; x += step) {
		path.push({ x, y });
	}
}

function appendVerticalSkillLinkPath(path: Array<{ x: number; y: number }>, x: number, targetY: number): void {
	const current = path.at(-1);
	if (!current || current.y === targetY) return;
	const step = Math.sign(targetY - current.y);
	for (let y = current.y + step; y !== targetY + step; y += step) {
		path.push({ x, y });
	}
}

function buildSkillLinkPath(preSkill: Skill, nextSkill: Skill): Array<{ x: number; y: number }> {
	const from = { x: getSkillGridX(preSkill), y: getSkillGridY(preSkill) };
	const to = { x: getSkillGridX(nextSkill), y: getSkillGridY(nextSkill) };
	const path = [from];

	if (from.y === to.y) {
		appendHorizontalSkillLinkPath(path, to.x, to.y);
		return path;
	}
	if (from.x === to.x) {
		appendVerticalSkillLinkPath(path, to.x, to.y);
		return path;
	}

	// 设计说明：技能数据只提供父子坐标，没有连线节点；这里用父子中心点生成正交折线，再把经过的格子聚合成可复用线段。
	appendHorizontalSkillLinkPath(path, from.x + Math.sign(to.x - from.x), from.y);
	const bend = path.at(-1);
	if (!bend) return path;
	appendVerticalSkillLinkPath(path, bend.x, to.y);
	appendHorizontalSkillLinkPath(path, to.x, to.y);
	return path;
}

function addSkillLinkArm(
	linkCellMap: Map<string, Set<SkillLinkDirection>>,
	skillCoordinateSet: Set<string>,
	x: number,
	y: number,
	direction: SkillLinkDirection,
): void {
	const key = getGridCoordinateKey(x, y);
	if (skillCoordinateSet.has(key)) return;
	const cell = linkCellMap.get(key) ?? new Set<SkillLinkDirection>();
	cell.add(direction);
	linkCellMap.set(key, cell);
}

function buildSkillLinkCells(templates: Skill[]): SkillLinkCell[] {
	const skillCoordinateSet = new Set(
		templates.map((template) => getGridCoordinateKey(getSkillGridX(template), getSkillGridY(template))),
	);
	const skillTemplateById = new Map(templates.map((template) => [template.id, template]));
	const linkCellMap = new Map<string, Set<SkillLinkDirection>>();

	for (const template of templates) {
		const preSkillId = template.preSkillId;
		if (!preSkillId) continue;
		const preSkill = skillTemplateById.get(preSkillId);
		if (!preSkill) continue;

		const path = buildSkillLinkPath(preSkill, template);
		for (let index = 0; index < path.length - 1; index += 1) {
			const current = path[index];
			const next = path[index + 1];
			if (!current || !next) continue;
			if (next.x > current.x) {
				addSkillLinkArm(linkCellMap, skillCoordinateSet, current.x, current.y, "right");
				addSkillLinkArm(linkCellMap, skillCoordinateSet, next.x, next.y, "left");
				continue;
			}
			if (next.x < current.x) {
				addSkillLinkArm(linkCellMap, skillCoordinateSet, current.x, current.y, "left");
				addSkillLinkArm(linkCellMap, skillCoordinateSet, next.x, next.y, "right");
				continue;
			}
			if (next.y > current.y) {
				addSkillLinkArm(linkCellMap, skillCoordinateSet, current.x, current.y, "top");
				addSkillLinkArm(linkCellMap, skillCoordinateSet, next.x, next.y, "bottom");
				continue;
			}
			if (next.y < current.y) {
				addSkillLinkArm(linkCellMap, skillCoordinateSet, current.x, current.y, "bottom");
				addSkillLinkArm(linkCellMap, skillCoordinateSet, next.x, next.y, "top");
			}
		}
	}

	return Array.from(linkCellMap.entries())
		.map(([key, directions]) => {
			const [x, y] = key.split(":").map(Number) as [number, number];
			const hasHorizontal = directions.has("left") || directions.has("right");
			const hasVertical = directions.has("top") || directions.has("bottom");
			return {
				key,
				x,
				y,
				left: directions.has("left"),
				right: directions.has("right"),
				top: directions.has("top"),
				bottom: directions.has("bottom"),
				hasJunction: hasHorizontal && hasVertical,
			};
		})
		.sort((a, b) => a.y - b.y || a.x - b.x);
}

function SkillLinkCellBlock(props: { cell: SkillLinkCell; bounds: SkillTreeGridBounds }) {
	return (
		<div
			aria-hidden="true"
			class="SkillLinkCellBlock pointer-events-none relative overflow-hidden"
			style={{
				"grid-column": props.cell.x - props.bounds.minX + 1,
				"grid-row": getCssGridRow(props.cell.y, props.bounds),
				"z-index": "0",
			}}
		>
			<Show when={props.cell.left}>
				<div class="absolute left-0 top-[33px] h-[2px] w-[34px] bg-brand-color-1st" />
			</Show>
			<Show when={props.cell.right}>
				<div class="absolute right-0 top-[33px] h-[2px] w-[34px] bg-brand-color-1st" />
			</Show>
			<Show when={props.cell.top}>
				<div class="absolute left-[33px] top-0 h-[34px] w-[2px] bg-brand-color-1st" />
			</Show>
			<Show when={props.cell.bottom}>
				<div class="absolute bottom-0 left-[33px] h-[34px] w-[2px] bg-brand-color-1st" />
			</Show>
			<Show when={props.cell.hasJunction}>
				<div class="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-[2px] bg-brand-color-1st" />
			</Show>
		</div>
	);
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
	const [skillTemplates] = createResource(() => selectAllSkills());
	const [skillTreePickerOpen, setSkillTreePickerOpen] = createSignal(false);
	const [visibleSkillTreeOverrides, setVisibleSkillTreeOverrides] = createSignal<VisibleSkillTreeOverrideMap>({});
	const [focusedTreeSkillId, setFocusedTreeSkillId] = createSignal<string | null>(null);
	// 设计说明：技能节点交互先写入面板局部映射；页面 model 负责 DB 提交和失败时通过 props.skills 回灌回滚状态。
	const [skillLevelByTemplateId, setSkillLevelByTemplateId] = createSignal<SkillLevelByTemplateId>(
		createSkillLevelByTemplateId(props.skills),
	);

	const skillTemplateTreeIndex = createMemo<SkillTemplateTreeIndex>(() => {
		const tree = createEmptySkillTemplateTreeIndex();
		for (const template of skillTemplates() ?? []) {
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
	const skillTemplateById = createMemo(
		() => new Map((skillTemplates() ?? []).map((template) => [template.id, template])),
	);
	const dependentTemplatesByPreTemplateId = createMemo(() => {
		const map = new Map<string, Skill[]>();
		for (const template of skillTemplates() ?? []) {
			const preSkillId = template.preSkillId;
			if (!preSkillId) continue;
			const children = map.get(preSkillId) ?? [];
			children.push(template);
			map.set(preSkillId, children);
		}
		return map;
	});
	const [skillTreeEditorSheetOpen, setSkillTreeEditorSheetOpen] = createSignal(false);
	const openSkillTreeEditorSheet = (treeType: SkillTreeType) => {
		setActiveSkillTreeType(treeType);
		setFocusedTreeSkillId(null);
		setSkillTreeEditorSheetOpen(true);
	};
	const closeSkillTreeEditorSheet = () => setSkillTreeEditorSheetOpen(false);
	const templateLevel = (template: Skill) => skillLevelByTemplateId()[template.id]?.lv ?? 0;
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
		const previousLevels = skillLevelByTemplateId();
		const characterSkillIds = templates
			.map((template) => previousLevels[template.id]?.characterSkillId)
			.filter((id): id is string => Boolean(id));
		const templateIds = templates.map((template) => template.id);

		setVisibleSkillTreeOverrides((pre) => ({ ...pre, [treeType]: false }));
		setFocusedTreeSkillId((focused) =>
			focused && templates.some((template) => template.id === focused) ? null : focused,
		);
		if (activeSkillTreeType() === treeType) setSkillTreeEditorSheetOpen(false);
		setSkillLevelByTemplateId((levels) => {
			const nextLevels = { ...levels };
			for (const template of templates) {
				delete nextLevels[template.id];
			}
			return nextLevels;
		});
		props.onSkillTreeRemoveRequested({ templateIds, characterSkillIds });
	};

	createEffect(
		on(
			() => props.characterId,
			() => setVisibleSkillTreeOverrides({}),
		),
	);

	createEffect(
		on(
			() => props.skills.map((skill) => `${skill.id}:${skill.lv}`).join("|"),
			() => setSkillLevelByTemplateId(createSkillLevelByTemplateId(props.skills)),
		),
	);

	createEffect(() => {
		// 设计说明：空焦点是合法编辑状态，sheet 打开时不预选技能，只有用户点选节点后才展示 +/- 控件。
		const templates = activeTreeTemplates();
		const focused = focusedTreeSkillId();
		if (focused && !templates.some((template) => template.id === focused)) setFocusedTreeSkillId(null);
	});

	const prerequisiteChain = (template: Skill): Skill[] => {
		const chain: Skill[] = [];
		const visitedTemplateIds = new Set<string>();
		let preSkillId = template.preSkillId;
		while (preSkillId) {
			if (visitedTemplateIds.has(preSkillId)) break;
			visitedTemplateIds.add(preSkillId);
			const preSkill = skillTemplateById().get(preSkillId);
			if (!preSkill) break;
			chain.push(preSkill);
			preSkillId = preSkill.preSkillId;
		}
		return chain;
	};

	const dependentBranch = (template: Skill): Skill[] => {
		const branch: Skill[] = [];
		const visitedTemplateIds = new Set<string>();
		const collect = (templateId: string) => {
			if (visitedTemplateIds.has(templateId)) return;
			visitedTemplateIds.add(templateId);
			for (const child of dependentTemplatesByPreTemplateId().get(templateId) ?? []) {
				branch.push(child);
				collect(child.id);
			}
		};
		collect(template.id);
		return branch;
	};

	const persistSkillLevels = (changes: Array<{ template: Skill; lv: number }>) => {
		if (changes.length === 0) return;
		const previousLevels = skillLevelByTemplateId();
		const preparedChanges = changes.map((change) => {
			const currentState = previousLevels[change.template.id];
			return {
				...change,
				characterSkillId: currentState?.characterSkillId ?? (change.lv > 0 ? createId() : undefined),
			};
		});
		setSkillLevelByTemplateId((levels) => {
			const nextLevels = { ...levels };
			for (const change of preparedChanges) {
				nextLevels[change.template.id] = {
					characterSkillId: change.characterSkillId,
					lv: change.lv,
				};
			}
			return nextLevels;
		});
		props.onSkillLevelsChangeRequested(preparedChanges);
	};

	const increaseSkillLevel = (template: Skill) => {
		const nextLevel = Math.min(SKILL_MAX_LEVEL, templateLevel(template) + 1);
		const changeMap = new Map<string, { template: Skill; lv: number }>();
		if (nextLevel === templateLevel(template)) return;

		// 设计说明：学习某个技能时补齐前置链，保证“能点目标技能”与“满足前置等级”作为同一次配置变更落库。
		for (const preSkill of prerequisiteChain(template)) {
			if (templateLevel(preSkill) < SKILL_PREREQUISITE_LEVEL) {
				changeMap.set(preSkill.id, { template: preSkill, lv: SKILL_PREREQUISITE_LEVEL });
			}
		}
		changeMap.set(template.id, { template, lv: nextLevel });
		persistSkillLevels(Array.from(changeMap.values()));
	};

	const decreaseSkillLevel = (template: Skill) => {
		const currentLevel = templateLevel(template);
		if (currentLevel <= 0) return;
		const nextLevel = Math.max(0, currentLevel - 1);
		const changeMap = new Map<string, { template: Skill; lv: number }>([[template.id, { template, lv: nextLevel }]]);

		// 设计说明：前置技能低于 lv5 时，所有后继技能都不再满足学习条件；降级操作同时清空整条后继分支，避免留下无效配置。
		if (nextLevel < SKILL_PREREQUISITE_LEVEL) {
			for (const dependent of dependentBranch(template)) {
				if (templateLevel(dependent) > 0) changeMap.set(dependent.id, { template: dependent, lv: 0 });
			}
		}
		persistSkillLevels(Array.from(changeMap.values()));
	};

	const canDecreaseSkill = (template: Skill) => {
		const currentLevel = templateLevel(template);
		return currentLevel > 0;
	};

	return (
		<div class="SkillConfig flex flex-col gap-2 w-full">
			{/* 外层配置：选择角色启用的技能树种类；已有角色技能的树固定展示，未习得的树走本地显示开关。 */}
			<div class="SkillTree flex flex-col">
				<div class="SkillConfigLabel flex justify-between">
					<span class="font-bold">{dictionary().ui.character.tabs.skill.treeSkill}</span>
					<Button icon={<Icons.Outline.DocmentAdd />} level="quaternary" onClick={() => setSkillTreePickerOpen(true)} />
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

			<Portal>
				{/* 内层配置：编辑当前技能树内的技能等级，连线和前置规则都从技能模板坐标与 preSkillId 推导。 */}
				<Sheet state={skillTreeEditorSheetOpen()} setState={setSkillTreeEditorSheetOpen}>
					<div class="flex portrait:h-[90dvh] w-full h-full flex-col gap-2 p-6 overflow-hidden">
						<div class="sheetTitle w-full text-xl font-bold flex items-center justify-between">
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
										"grid-template-columns": `repeat(${activeTreeGridBounds().columnCount}, ${SKILL_GRID_CELL_SIZE}px)`,
										"grid-template-rows": `repeat(${activeTreeGridBounds().rowCount}, ${SKILL_GRID_CELL_SIZE}px)`,
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
				</Sheet>
			</Portal>
			<SkillTreePickerSheet
				open={skillTreePickerOpen()}
				onOpenChange={(open) => setSkillTreePickerOpen(open)}
				hasSkills={hasSkillsInTree}
				isDisplayed={isSkillTreeVisible}
				onToggle={toggleSkillTreeDisplay}
			/>
		</div>
	);
}
