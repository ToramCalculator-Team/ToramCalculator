import type { CharacterSkillWithRelations } from "@db/generated/repositories/character_skill";
import { SKILL_TREE_GROUP_TYPE, SKILL_TREE_TYPE, type SkillTreeType } from "@db/schema/enums";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createEffect, createMemo, createSignal, For, Index, on, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { Sheet } from "~/components/containers/sheet";
import { Button } from "~/components/controls/button";
import { Icons } from "~/components/icons";
import { useDictionary } from "~/contexts/Dictionary";
import { SKILL_TREE_MAP, SkillTreePickerSheet } from "./SkillTreePickerSheet";

type SkillTreeNode = {
	skills: CharacterSkillWithRelations[];
};

type CharacterSkillTreeMap = Record<SkillTreeType, SkillTreeNode>;

type SkillTreeVisibilityMap = Partial<Record<SkillTreeType, boolean>>;

export type SkillPanelProps = {
	characterId: string;
	skills: CharacterSkillWithRelations[];
};

function createEmptyCharacterSkillTree(): CharacterSkillTreeMap {
	// character_skill 是唯一事实来源；这里按 treeType 建索引，只服务当前面板展示。
	const tree = {} as CharacterSkillTreeMap;
	for (const treeType of SKILL_TREE_TYPE) {
		tree[treeType] = { skills: [] };
	}
	return tree;
}

export function SkillPanel(props: SkillPanelProps) {
	const dictionary = useDictionary();
	const [pickerOpen, setPickerOpen] = createSignal(false);
	const [skillTreeVisibility, setSkillTreeVisibility] = createSignal<SkillTreeVisibilityMap>({});

	const skillTree = createMemo<CharacterSkillTreeMap>(() => {
		const tree = createEmptyCharacterSkillTree();
		for (const skill of props.skills) {
			tree[skill.template.treeType].skills.push(skill);
		}
		return tree;
	});
	const [activeSkillTree, setActiveSkillTree] = createSignal<SkillTreeType>("MagicSkill");
	const [skillTreePanelOpen, setSkillTreePanelOpen] = createSignal(false);
	const openSkillTreePanel = (treeType: SkillTreeType) => {
		setActiveSkillTree(treeType);
		setSkillTreePanelOpen(true);
	};

	const hasSkillTreeSkills = (treeType: SkillTreeType) => skillTree()[treeType].skills.length > 0;
	const isSkillTreeDisplayed = (treeType: SkillTreeType) =>
		hasSkillTreeSkills(treeType) || (skillTreeVisibility()[treeType] ?? false);

	const toggleSkillTreeDisplay = (treeType: SkillTreeType) => {
		if (hasSkillTreeSkills(treeType)) return;
		setSkillTreeVisibility((pre) => ({
			...pre,
			[treeType]: !isSkillTreeDisplayed(treeType),
		}));
	};

	createEffect(
		on(
			() => props.characterId,
			() => setSkillTreeVisibility({}),
		),
	);

	return (
		<div class="SkillConfig flex flex-col gap-2 w-full">
			<div class="SkillTree flex flex-col">
				<div class="SkillConfigLabel flex justify-between">
					<span class="font-bold">{dictionary().ui.character.tabs.skill.treeSkill}</span>
					<Button icon={<Icons.Outline.DocmentAdd />} level="quaternary" onClick={() => setPickerOpen(true)} />
				</div>
				<Index each={SKILL_TREE_GROUP_TYPE}>
					{(treeGroupType) => (
						<Index each={SKILL_TREE_MAP[treeGroupType()]}>
							{(skillTreeType, index) => {
								const treeType = skillTreeType();
								return (
									<Show when={isSkillTreeDisplayed(treeType)}>
										<button
											type="button"
											class="SkillItem flex flex-col gap-2"
											onclick={() => openSkillTreePanel(treeType)}
										>
											<div class="w-full h-full flex flex-1 items-center">
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
												<Show when={!hasSkillTreeSkills(treeType)}>
													<div class="flex flex-none px-4 py-3">
														<Button
															icon={<Icons.Outline.Trash />}
															level="quaternary"
															onClick={() => toggleSkillTreeDisplay(treeType)}
														/>
													</div>
												</Show>
											</div>
										</button>
									</Show>
								);
							}}
						</Index>
					)}
				</Index>
			</div>
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
				<Sheet state={skillTreePanelOpen()} setState={setSkillTreePanelOpen}>
					<div class="flex portrait:h-[90dvh] w-full flex-col gap-2 p-6">
						<div class="sheetTitle w-full text-xl font-bold flex items-center justify-between">
							{dictionary().db.skill.fields.treeType.enumMap[activeSkillTree()]}
							<Button
								icon={<Icons.Outline.Close />}
								level="quaternary"
								class="rounded-none rounded-tr"
								onClick={close}
							/>
						</div>
						<OverlayScrollbarsComponent
							element="div"
							options={{ scrollbars: { autoHide: "scroll" } }}
							class="SkillGroupConfig h-full min-w-full flex-1"
						>
							{/* 根据当前活动技能树内的技能坐标范围绘制技能树网格 */}
							
						</OverlayScrollbarsComponent>
					</div>
				</Sheet>
			</Portal>
			<SkillTreePickerSheet
				open={pickerOpen()}
				onOpenChange={(open) => setPickerOpen(open)}
				hasSkills={hasSkillTreeSkills}
				isDisplayed={isSkillTreeDisplayed}
				onToggle={toggleSkillTreeDisplay}
			/>
		</div>
	);
}
