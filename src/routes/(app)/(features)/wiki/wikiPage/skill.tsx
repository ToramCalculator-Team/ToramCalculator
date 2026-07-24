import { DBSchema, type skill } from "@db/generated/zod";
import { repositoryReaders } from "@db/generated/repositories";
import { SKILL_TREE_GROUP_TYPE, type SkillTreeType } from "@db/schema/enums";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createMemo, createSignal, For, Index, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { Motion } from "solid-motionone";
import { SKILL_DATA_CONFIG } from "~/components/business/dataConfig/skill";
import { Frame } from "~/components/containers/frame";
import { Button } from "~/components/controls/button";
import { LoadingBar } from "~/components/controls/loadingBar";
import { ObjRenderer } from "~/components/dataDisplay/ObjRenderer";
import { SKILL_TREE_MAP } from "~/components/features/character/SkillTreePickerSheet";
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
} from "~/components/features/character/skillTreeGrid";
import { Icons } from "~/components/icons";
import { useDictionary } from "~/contexts/Dictionary";
import { createLiveKyselyQuery } from "~/lib/pglite/liveQuery";
import { store } from "~/store";

// 共享元素 morph 的 view-transition-name：卡片与全屏面板轮流持有它，浏览器据此把
// 新旧快照配成一次形变（原位放大 / 还原）。同一帧内必须只有一个元素持有此名字。
const SKILL_MORPH_NAME = "skill-tree-morph";

// 用 View Transitions API 包裹一次状态切换：切换前拍旧快照、DOM 更新后拍新快照，
// 动画跑在快照上，真实 DOM 已是终态——滚动被冻结，天然免疫“测量后布局漂移”与“看到两个卡片”。
// 不支持该 API 或用户关闭动画时，直接同步切换（无动画降级）。
function withViewTransition(update: () => void): void {
	const doc = document as Document & {
		startViewTransition?: (cb: () => void) => { finished: Promise<void> };
	};
	if (!store.settings.userInterface.isAnimationEnabled || typeof doc.startViewTransition !== "function") {
		update();
		return;
	}
	doc.startViewTransition(update);
}

// wiki 技能页只读浏览：卡片墙按技能树分组类型分区，每张卡片是一个技能树（占位图 + 名称 + 技能数量）。
// 点击卡片将该卡片原位放大到全屏 80% 面板展示技能树网格；点击背景遮罩还原。
function SkillBrowseNode(props: { bounds: SkillTreeGridBounds; skill: skill; onSelect: () => void }) {
	return (
		<div
			class="SkillNodeCell pointer-events-none relative flex items-center justify-center overflow-visible"
			style={{
				"grid-column": getSkillGridX(props.skill) - props.bounds.minX + 1,
				"grid-row": getCssGridRow(getSkillGridY(props.skill), props.bounds),
				"z-index": "0",
			}}
		>
			<button
				type="button"
				title={props.skill.name}
				aria-label={props.skill.name}
				class="pointer-events-auto relative z-10 flex cursor-pointer items-center justify-center rounded-full border-2 border-brand-color-4th bg-linear-to-b from-[#00d1e0] to-[#0e2398] p-0.5 hover:border-primary-color"
				onClick={props.onSelect}
			>
				<span class="SkillNodeIcon flex size-16 items-center justify-center overflow-hidden rounded-full border border-dividing-color bg-area-color bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgb(var(--accent))_0%,rgb(var(--accent)/0)_100%)] text-lg font-bold text-primary-color">
					<span class="text-sm">{props.skill.name}</span>
				</span>
			</button>
		</div>
	);
}

export const SkillPage = () => {
	const dic = useDictionary();
	const skillConfig = SKILL_DATA_CONFIG(dic());
	// 用 live query 而非一次性 selectAllSkills：删除/新增技能后卡片墙即时刷新，
	// 避免陈旧列表仍渲染已删节点（点击会命中 getSkillWithVariants 的 NoResultError）。
	const skillQuery = createLiveKyselyQuery<skill>((db) => db.selectFrom("skill").selectAll("skill"));
	const skills = skillQuery.rows;

	// 技能按技能树类型分桶，作为卡片统计（每棵树的技能数量）和全屏面板网格渲染的数据源。
	const skillsByTreeType = createMemo(() => {
		const map = new Map<SkillTreeType, skill[]>();
		for (const skill of skills()) {
			const bucket = map.get(skill.treeType) ?? [];
			bucket.push(skill);
			map.set(skill.treeType, bucket);
		}
		return map;
	});

	// activeTreeType 决定全屏面板是否展示；morphTreeType 单独记录“哪张卡片正在参与 morph”。
	// 二者分离，是为了保证 morph 名字的唯一归属：面板挂载时(new 快照)只有面板持有名字，
	// 卡片在旧快照里持有名字、新快照里让出——同一帧不会出现两个同名元素。
	const [activeTreeType, setActiveTreeType] = createSignal<SkillTreeType | null>(null);
	const [morphTreeType, setMorphTreeType] = createSignal<SkillTreeType | null>(null);
	const [activeSkillId, setActiveSkillId] = createSignal<string | null>(null);

	const openTree = (treeType: SkillTreeType) => {
		setActiveSkillId(null);
		setMorphTreeType(treeType);
		withViewTransition(() => setActiveTreeType(treeType));
	};
	const closeSheet = () => {
		withViewTransition(() => setActiveTreeType(null));
	};

	const activeTreeSkills = createMemo(() => {
		const treeType = activeTreeType();
		if (!treeType) return [];
		return [...(skillsByTreeType().get(treeType) ?? [])].sort(
			(a, b) => getSkillGridY(a) - getSkillGridY(b) || getSkillGridX(a) - getSkillGridX(b),
		);
	});
	const activeTreeGridBounds = createMemo(() => getSkillTreeGridBounds(activeTreeSkills()));
	const activeTreeLinkCells = createMemo(() => buildSkillLinkCells(activeTreeSkills()));

	return (
		<div class="SkillPage flex h-full flex-col overflow-hidden">
			<Show
				when={skillQuery.status() !== "loading"}
				fallback={
					<div class="LoadingState flex h-full w-full flex-col items-center justify-center gap-3">
						<LoadingBar class="w-1/2 min-w-[320px]" />
						<h1 class="animate-pulse">loading...</h1>
					</div>
				}
			>
				<OverlayScrollbarsComponent
					element="div"
					options={{ scrollbars: { autoHide: "scroll" } }}
					style={{ height: "100%", width: "100%" }}
				>
					<div class="Content flex flex-col gap-4 p-6 portrait:px-6">
						<Index each={SKILL_TREE_GROUP_TYPE}>
							{(treeGroupType, groupIndex) => (
								<Motion.section
									animate={{
										transform: ["translateY(-3%)", "translateY(0)"],
										opacity: [0, 1],
									}}
									transition={{
										duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0,
									}}
									class={`SkillGroup-${treeGroupType()} translate-y-0 flex w-full flex-col gap-2`}
								>
									<h3 class="text-accent-color flex items-center gap-2 font-bold">
										{dic().ui.character.tabs.skill.trees[treeGroupType()].selfName}
										<div class="Divider bg-dividing-color h-px w-full flex-1" />
									</h3>
									<div class="Cards flex flex-wrap gap-3">
										<Index each={SKILL_TREE_MAP[treeGroupType()]}>
											{(skillTreeType, index) => {
												const treeType = skillTreeType();
												const count = () => skillsByTreeType().get(treeType)?.length ?? 0;
												const isEmpty = () => count() === 0;
												const colorIndex = (groupIndex + (index % 4)) % 4;
												const color = [
													" text-brand-color-1st",
													" text-brand-color-2nd",
													" text-brand-color-3rd",
													" text-brand-color-4th",
												][colorIndex];
												return (
													<Motion.button
														animate={{
															transform: ["scale(1.05)", "scale(1)"],
														}}
														transition={{
															duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0,
															delay: groupIndex * 0.2 + index * 0.025,
														}}
														type="button"
														disabled={isEmpty()}
														style={{
															"view-transition-name":
																morphTreeType() === treeType && activeTreeType() === null
																	? SKILL_MORPH_NAME
																	: undefined,
														}}
														class={`SkillTreeCard p-2 bg-accent-color ${color} shadow-dividing-color relative flex w-40 portrait:w-[calc((100%-1.5rem)/3)] h-48 portrait:h-40 flex-col overflow-hidden rounded-md shadow-md ${isEmpty() ? "cursor-not-allowed opacity-40 saturate-50" : "cursor-pointer hover:shadow-xl hover:scale-105"}`}
														onClick={() => {
															if (!isEmpty()) openTree(treeType);
														}}
													>
														<Frame>
															<div class="w-full h-full flex flex-col">
																<div class="h-full w-full flex-1 rounded">
																	<div class="Children mx-3 my-6 flex flex-col gap-3"></div>
																</div>
																<div class="Info flex flex-col gap-1 p-2">
																	<span class="Name overflow-hidden font-bold text-nowrap text-ellipsis">
																		{dic().db.skill.fields.treeType.enumMap[treeType]}
																	</span>
																	<span class="Count">{count()}</span>
																</div>
															</div>
														</Frame>
													</Motion.button>
												);
											}}
										</Index>
									</div>
								</Motion.section>
							)}
						</Index>
					</div>
				</OverlayScrollbarsComponent>
			</Show>

			<Portal>
				<Show when={activeTreeType()}>
					{(treeType) => (
						<Motion.div
							animate={{ opacity: [0, 1] }}
							transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
							class="SkillTreeOverlay fixed inset-0 z-50 flex items-end landscape:items-center justify-center backdrop-blur"
						>
							{/* 背景遮罩：模糊底层卡片墙 + 点击还原。不参与 morph，仅淡入淡出。 */}
							<button
								type="button"
								aria-label="close"
								class="SkillTreeOverlayScrim absolute inset-0 h-full w-full cursor-pointer bg-primary-color-10"
								onClick={closeSheet}
							/>

							{/* 全屏 80% 面板：持有 morph 名字，与卡片配对成原位放大/还原形变。 */}
							<div
								style={{ "view-transition-name": SKILL_MORPH_NAME }}
								class="SkillTreePanel bg-accent-color shadow-dialog shadow-dividing-color relative flex h-[90dvh] w-dvw landscape:w-[80dvw] flex-col gap-2 overflow-hidden landscape:rounded-md landscape:p-6"
							>
								<div class="PanelTitle z-10 absolute top-3 left-3 flex w-full items-center justify-between text-xl text-primary-color font-bold">
									{dic().db.skill.fields.treeType.enumMap[treeType()]}
								</div>
								<Button
									icon={<Icons.Outline.Close />}
									level="quaternary"
									class="hidden text-primary-color landscape:block z-10 absolute top-3 right-3"
									onClick={closeSheet}
								/>
								<OverlayScrollbarsComponent
									element="div"
									options={{ scrollbars: { autoHide: "scroll" } }}
									class="SkillGroupConfig basis-full text-primary-color rounded"
									defer
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
										<For each={activeTreeSkills()}>
											{(skill) => (
												<SkillBrowseNode
													bounds={activeTreeGridBounds()}
													skill={skill}
													onSelect={() => setActiveSkillId(skill.id)}
												/>
											)}
										</For>
									</div>
								</OverlayScrollbarsComponent>
								<Show when={activeSkillId()}>
									<OverlayScrollbarsComponent
										element="div"
										options={{ scrollbars: { autoHide: "scroll" } }}
										class="SkillDetails basis-full bg-primary-color p-3 rounded"
										defer
									>
										<ObjRenderer
											title={dic().db.skill.selfName}
											query={(db) => {
												const id = activeSkillId();
												if (!id) return null;
												return repositoryReaders.skill.get?.(db, id) ?? null;
											}}
											dataSchema={DBSchema.skill}
											dictionary={dic().db.skill}
											hiddenFields={skillConfig.card.hiddenFields}
											fieldGroupMap={skillConfig.fieldGroupMap}
											renderers={skillConfig.card.renderers}
											after={skillConfig.card.after}
											before={skillConfig.card.before}
										/>
									</OverlayScrollbarsComponent>
								</Show>
							</div>
						</Motion.div>
					)}
				</Show>
			</Portal>
		</div>
	);
};
