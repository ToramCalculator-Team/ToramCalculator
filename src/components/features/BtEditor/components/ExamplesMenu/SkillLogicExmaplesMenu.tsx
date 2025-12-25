import { type Component, createSignal, For, Show } from "solid-js";
import { Button } from "~/components/controls/button";
import { Icons } from "~/components/icons";
import { SkillLogicExamples } from "../../data/SkillExamples";
import type { SkillExample, SkillExampleCategory } from "../../types";
import { Divider, Menu, MenuItem, MenuList } from "../";

export type SkillLogicExmaplesMenuProps = {
	onMDSLInsert: (mdsl: string, agent: string) => void;
};

export const SkillLogicExmaplesMenu: Component<SkillLogicExmaplesMenuProps> = (
	props,
) => {
	const [anchorEl, setAnchorEl] = createSignal<HTMLElement | null>(null);
	const open = () => Boolean(anchorEl());

	const handleClick = (e: MouseEvent) => {
		setAnchorEl(e.currentTarget as HTMLElement);
	};

	const handleClose = () => {
		setAnchorEl(null);
	};

	const onExampleClick = (example: SkillExample) => {
		setAnchorEl(null);

		// 将对应的 MDSL 和 Agent 发送到插入口
		props.onMDSLInsert(example.definition.trim(), example.board.trim());
	};

	const getExampleListItemsForCategory = (category: SkillExampleCategory) => {
		return SkillLogicExamples.filter(
			(example) => example.category === category,
		);
	};

	return (
		<>
			<Button level="quaternary" onClick={handleClick} class="p-1">
				<Icons.Outline.Basketball />
			</Button>
			<Menu anchorEl={anchorEl()} open={open()} onClose={handleClose}>
				<Show when={getExampleListItemsForCategory("common").length > 0}>
					<Divider />
					<div class="text-accent-color/70 px-1.25 py-0.5 text-xs">Common</div>
					<MenuList dense>
						<For each={getExampleListItemsForCategory("common")}>
							{(example) => (
								<MenuItem dense onClick={() => onExampleClick(example)}>
									{example.caption}
								</MenuItem>
							)}
						</For>
					</MenuList>
				</Show>
				<Show when={getExampleListItemsForCategory("buff").length > 0}>
					<Divider />
					<div class="text-accent-color/70 px-1.25 py-0.5 text-xs">Buffs</div>
					<MenuList dense>
						<For each={getExampleListItemsForCategory("buff")}>
							{(example) => (
								<MenuItem dense onClick={() => onExampleClick(example)}>
									{example.caption}
								</MenuItem>
							)}
						</For>
					</MenuList>
				</Show>
			</Menu>
		</>
	);
};
