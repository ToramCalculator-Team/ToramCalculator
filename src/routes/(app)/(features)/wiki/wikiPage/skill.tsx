import { selectAllSkills } from "@db/generated/repositories/skill";
import type { skill } from "@db/generated/zod";
import { SKILL_TREE_GROUP_TYPE, type SkillTreeType } from "@db/schema/enums";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createMemo, createResource, createSignal, For, Index, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { Motion } from "solid-motionone";
import { Decorate } from "~/components/containers/dialog";
import { Sheet } from "~/components/containers/sheet";
import { Button } from "~/components/controls/button";
import { LoadingBar } from "~/components/controls/loadingBar";
import { SKILL_TREE_MAP } from "~/components/features/character/SkillTreePickerSheet";
import {
	buildSkillLinkCells,
	getCssGridRow,
	getSkillGridX,
	getSkillGridY,
	getSkillTreeGridBounds,
	SKILL_GRID_CELL_SIZE,
	SkillLinkCellBlock,
	type SkillTreeGridBounds,
} from "~/components/features/character/skillTreeGrid";
import { Icons } from "~/components/icons";
import type { Dictionary } from "~/locales/type";
import { store } from "~/store";

// wiki 技能页只读浏览：卡片墙按技能树分组类型分区，每张卡片是一个技能树（占位图 + 名称 + 技能数量）。
// 点击卡片打开只读网格 Sheet，点击节点交给页面统一的卡片入口（itemHandleClick）展示技能详情。
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

export const SkillPage = (dic: Dictionary, itemHandleClick: (data: skill) => void) => {
	const [skills] = createResource(() => selectAllSkills());

	// 技能按技能树类型分桶，作为卡片统计（每棵树的技能数量）和 Sheet 网格渲染的数据源。
	const skillsByTreeType = createMemo(() => {
		const map = new Map<SkillTreeType, skill[]>();
		for (const skill of skills() ?? []) {
			const bucket = map.get(skill.treeType) ?? [];
			bucket.push(skill);
			map.set(skill.treeType, bucket);
		}
		return map;
	});

	const [activeTreeType, setActiveTreeType] = createSignal<SkillTreeType | null>(null);
	const closeSheet = () => setActiveTreeType(null);

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
				when={!skills.loading}
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
					<div class="Content flex flex-col gap-4 px-6 portrait:px-6">
						<Index each={SKILL_TREE_GROUP_TYPE}>
							{(treeGroupType, groupIndex) => (
								<Motion.section
									animate={{
										transform: ["translateY(-3%)", "translateY(0)"], opacity: [0, 1]
									}}
									transition={{
										duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0,
									}}
									class={`SkillGroup-${treeGroupType()} translate-y-0 flex w-full flex-col gap-2`}>
									<h3 class="text-accent-color flex items-center gap-2 font-bold">
										{dic.ui.character.tabs.skill.trees[treeGroupType()].selfName}
										<div class="Divider bg-dividing-color h-px w-full flex-1" />
									</h3>
									<div class="Cards flex flex-wrap gap-3">
										<Index each={SKILL_TREE_MAP[treeGroupType()]}>
											{(skillTreeType, index) => {
												const treeType = skillTreeType();
												const count = () => skillsByTreeType().get(treeType)?.length ?? 0;
												const isEmpty = () => count() === 0;
												const colorIndex = (groupIndex + index % 4) % 4;
												const color = [" text-brand-color-1st", " text-brand-color-2nd", " text-brand-color-3rd", " text-brand-color-4th"][colorIndex]
												return (
													<Motion.button
														animate={{
															transform: ["scale(1.05)", "scale(1)"]
														}}
														transition={{
															duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0,
															delay: groupIndex * 0.2 + index * 0.025,
														}}
														type="button"
														disabled={isEmpty()}
														class={`SkillTreeCard p-2 bg-accent-color ${color} shadow-dividing-color relative flex w-40 portrait:w-[calc((100%-1.5rem)/3)] h-48 portrait:h-40 flex-col overflow-hidden rounded-md shadow-md ${isEmpty() ? "cursor-not-allowed opacity-40 saturate-50" : "cursor-pointer hover:shadow-xl hover:scale-105"}`}
														onClick={() => {
															if (!isEmpty()) setActiveTreeType(treeType);
														}}
													>

														<div class="Content flex h-full w-full justify-center overflow-hidden">
															{/* 左侧装饰 */}
															<div class="Left z-10 flex flex-none flex-col">
																<Decorate class="" />
																<div class="Divider bg-boundary-color ml-1 h-full w-px flex-1 rounded-full"></div>
																<Decorate class="-scale-y-100" />
															</div>

															{/* 中间内容 */}
															<div class="Center -mx-10 flex w-full flex-1 flex-col items-center">
																{/* 上分割线 */}
																<div
																	class="Divider bg-boundary-color mt-1 h-px w-full rounded-full"
																	style={{
																		width: "calc(100% - 80px)",
																	}}
																></div>

																{/* 滚动内容区域 */}
																<div
																	class="border-primary-color h-full w-full flex-1 rounded"
																>
																	<div class="Children mx-3 my-6 flex flex-col gap-3"></div>
																</div>

																<div class="Info flex flex-col gap-1 p-2">
																	<span class="Name overflow-hidden font-bold text-nowrap text-ellipsis">
																		{dic.db.skill.fields.treeType.enumMap[treeType]}
																	</span>
																	<span class="Count">{count()}</span>
																</div>

																{/* 下分割线 */}
																<div
																	class="Divider bg-boundary-color mb-1 h-px w-full rounded-full"
																	style={{
																		width: "calc(100% - 80px)",
																	}}
																></div>
															</div>

															{/* 右侧装饰 */}
															<div class="Right z-10 flex flex-none -scale-x-100 flex-col">
																<Decorate />
																<div class="Divider bg-boundary-color ml-1 h-full w-px flex-1 rounded-full"></div>
																<Decorate class="-scale-y-100" />
															</div>
														</div>
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
				<Sheet state={activeTreeType() !== null} setState={(open) => !open && closeSheet()}>
					<div class="flex portrait:h-[90dvh] h-full w-full flex-col gap-2 overflow-hidden p-6">
						<div class="sheetTitle flex w-full items-center justify-between text-xl font-bold">
							<Show when={activeTreeType()}>
								{(treeType) => dic.db.skill.fields.treeType.enumMap[treeType()]}
							</Show>
							<Button
								icon={<Icons.Outline.Close />}
								level="quaternary"
								class="rounded-none rounded-tr"
								onClick={closeSheet}
							/>
						</div>
						<OverlayScrollbarsComponent
							element="div"
							options={{ scrollbars: { autoHide: "scroll" } }}
							class="SkillGroupConfig h-full w-full rounded"
							defer
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
								<For each={activeTreeSkills()}>
									{(skill) => (
										<SkillBrowseNode
											bounds={activeTreeGridBounds()}
											skill={skill}
											onSelect={() => itemHandleClick(skill)}
										/>
									)}
								</For>
							</div>
						</OverlayScrollbarsComponent>
					</div>
				</Sheet>
			</Portal>
		</div>
	);
};
