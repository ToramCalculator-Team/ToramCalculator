import { type Component, createSignal, For, Show } from "solid-js";
import { Button } from "~/components/controls/button";
import { Icons } from "~/components/icons";
import { SkillLogicExamples } from "../../data/SkillExamples";
import type { SkillExample, SkillExampleCategory } from "../../types";
import { Divider, Menu, MenuItem, MenuList } from "../";

export type SkillLogicExamplesMenuProps = {
	onMDSLInsert: (mdsl: string, agent: string) => void;
};

export type SkillLogicExamplesMenuContentProps = SkillLogicExamplesMenuProps & {
	onSelect?: () => void;
};

export const SkillLogicExamplesMenuContent: Component<SkillLogicExamplesMenuContentProps> = (props) => {
	const onExampleClick = (example: SkillExample) => {
		props.onSelect?.();

		// 将对应的 MDSL 和 Agent 发送到插入口
		props.onMDSLInsert(example.definition.trim(), example.board.trim());
	};

	const getExampleListItemsForCategory = (category: SkillExampleCategory) => {
		return SkillLogicExamples.filter((example) => example.category === category);
	};

	return (
		<>
			<Show when={getExampleListItemsForCategory("common").length > 0}>
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
		</>
	);
};

export const SkillLogicExamplesMenu: Component<SkillLogicExamplesMenuProps> = (props) => {
	const [anchorEl, setAnchorEl] = createSignal<HTMLElement | null>(null);
	const open = () => Boolean(anchorEl());

	const handleClick = (e: MouseEvent) => {
		setAnchorEl(e.currentTarget as HTMLElement);
	};

	const handleClose = () => {
		setAnchorEl(null);
	};

	return (
		<>
			<Button level="quaternary" aria-label="打开技能示例" title="技能示例" onClick={handleClick}>
				<Icons.Outline.Basketball />
			</Button>
			<Menu anchorEl={anchorEl()} open={open()} onClose={handleClose}>
				<SkillLogicExamplesMenuContent onMDSLInsert={props.onMDSLInsert} onSelect={handleClose} />
			</Menu>
		</>
	);
};
