import { selectAllSkills } from "@db/generated/repositories/skill";
import type { skill } from "@db/generated/zod";
import { SKILL_TREE_GROUP_TYPE, type SkillTreeType } from "@db/schema/enums";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createMemo, createResource, createSignal, For, Index, Show } from "solid-js";
import { Portal } from "solid-js/web";
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
				class="pointer-events-auto relative z-10 flex size-[68px] cursor-pointer items-center justify-center rounded-full border-2 border-brand-color-4th bg-linear-to-b from-[#00d1e0] to-[#0e2398] p-0.5 hover:border-primary-color"
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
		<div class="SkillPage flex h-full w-full flex-col">
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
					<div class="Content flex flex-col gap-4 p-4">
						<Index each={SKILL_TREE_GROUP_TYPE}>
							{(treeGroupType) => (
								<section class={`SkillGroup-${treeGroupType()} flex w-full flex-col gap-2`}>
									<h3 class="text-accent-color flex items-center gap-2 font-bold">
										{dic.ui.character.tabs.skill.trees[treeGroupType()].selfName}
										<div class="Divider bg-dividing-color h-px w-full flex-1" />
									</h3>
									<div class="Cards flex flex-wrap gap-3">
										<Index each={SKILL_TREE_MAP[treeGroupType()]}>
											{(skillTreeType) => {
												const treeType = skillTreeType();
												const count = () => skillsByTreeType().get(treeType)?.length ?? 0;
												const isEmpty = () => count() === 0;
												return (
													<button
														type="button"
														disabled={isEmpty()}
														class={`SkillTreeCard bg-primary-color shadow-dividing-color relative flex w-[140px] flex-col overflow-hidden rounded shadow-md ${isEmpty() ? "cursor-not-allowed opacity-40 saturate-50" : "cursor-pointer hover:shadow-xl"}`}
														onClick={() => {
															if (!isEmpty()) setActiveTreeType(treeType);
														}}
													>
														<div class="Cover bg-area-color flex aspect-[3/4] w-full items-center justify-center">
															<Icons.Spirits iconName={treeType} size={64} />
														</div>
														<div class="Info flex flex-col gap-1 p-2">
															<span class="Name text-main-text-color overflow-hidden text-start text-sm font-bold text-nowrap text-ellipsis">
																{dic.db.skill.fields.treeType.enumMap[treeType]}
															</span>
															<span class="Count text-boundary-color text-start text-xs">{count()}</span>
														</div>
													</button>
												);
											}}
										</Index>
									</div>
								</section>
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
