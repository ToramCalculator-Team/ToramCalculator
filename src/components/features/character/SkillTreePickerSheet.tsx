import {
	ASSIST_SKILL_GROUP,
	BUFF_SKILL_GROUP,
	OTHER_SKILL_GROUP,
	PRODUCE_SKILL_GROUP,
	SKILL_BOOK_GROUP,
	SKILL_TREE_GROUP_TYPE,
	type SkillTreeType,
	WEAPON_SKILL_GROUP,
} from "@db/schema/enums";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { Index } from "solid-js";
import { Portal } from "solid-js/web";
import { Sheet } from "~/components/containers/sheet";
import { Button } from "~/components/controls/button";
import { Icons } from "~/components/icons";
import { useDictionary } from "~/contexts/Dictionary";

export const SKILL_TREE_MAP = {
	WeaponSkillGroup: WEAPON_SKILL_GROUP,
	BuffSkillGroup: BUFF_SKILL_GROUP,
	AssistSkillGroup: ASSIST_SKILL_GROUP,
	ProduceSkillGroup: PRODUCE_SKILL_GROUP,
	SkillBookGroup: SKILL_BOOK_GROUP,
	OtherSkillGroup: OTHER_SKILL_GROUP,
} as const;

type SkillTreePickerSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	hasSkills: (treeType: SkillTreeType) => boolean;
	isDisplayed: (treeType: SkillTreeType) => boolean;
	onToggle: (treeType: SkillTreeType) => void;
};

export function SkillTreePickerSheet(props: SkillTreePickerSheetProps) {
	const dictionary = useDictionary();
	const close = () => props.onOpenChange(false);

	return (
		<Portal>
			<Sheet state={props.open} setState={props.onOpenChange}>
				<div class="flex portrait:h-[90dvh] w-full flex-col gap-2 p-6">
					<div class="sheetTitle w-full text-xl font-bold flex items-center justify-between">
						{dictionary().ui.character.tabs.skill.selfName}
						<Button icon={<Icons.Outline.Close />} level="quaternary" class="rounded-none rounded-tr" onClick={close} />
					</div>
					<OverlayScrollbarsComponent
						element="div"
						options={{ scrollbars: { autoHide: "scroll" } }}
						class="SkillGroupConfig h-full min-w-full flex-1"
					>
						<Index each={SKILL_TREE_GROUP_TYPE}>
							{(treeGroupType) => (
								<section class={`SkillGroup-${treeGroupType()} flex w-full flex-col gap-2`}>
									<h3 class="text-accent-color flex items-center gap-2 font-bold">
										{dictionary().ui.character.tabs.skill.trees[treeGroupType()].selfName}
										<div class="Divider bg-dividing-color h-px w-full flex-1" />
									</h3>
									<div class="Content flex flex-wrap gap-1">
										<Index each={SKILL_TREE_MAP[treeGroupType()]}>
											{(skillTreeType) => {
												const treeType = skillTreeType();
												return (
													<Button
														class={`flex-col gap-2 items-center justify-center portrait:w-[calc((100%-8px)/3)] ${props.isDisplayed(treeType) ? " bg-accent-color! text-primary-color" : "bg-area-color"} ${props.hasSkills(treeType) ? "opacity-80" : ""}`}
														disabled={props.hasSkills(treeType)}
														onClick={() => props.onToggle(treeType)}
													>
														<div class="flex-none w-12 h-12 p-1 flex items-center justify-center rounded bg-area-color">
															<Icons.Spirits iconName={treeType} size={36} />
														</div>
														{dictionary().db.skill.fields.treeType.enumMap[treeType]}
													</Button>
												);
											}}
										</Index>
									</div>
								</section>
							)}
						</Index>
					</OverlayScrollbarsComponent>
				</div>
			</Sheet>
		</Portal>
	);
}
