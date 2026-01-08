import { type BlocklyOptions, inject, serialization, setLocale, Theme, Themes } from "blockly/core";
import * as En from "blockly/msg/en";
import * as Ja from "blockly/msg/ja";
import * as Zh from "blockly/msg/zh-hans";
import * as ZhTw from "blockly/msg/zh-hant";
import { createEffect, createSignal, type JSX, on, useContext } from "solid-js";
import "blockly/blocks";
import type { MemberType } from "@db/schema/enums";
import { javascriptGenerator } from "blockly/javascript";
import defaultData from "~/components/features/logicEditor/defaultData.json";
import { MediaContext } from "~/lib/contexts/Media";
import { store } from "~/store";
import { baseToolBoxConfig } from "./baseToolBoxConfig";

interface LogicEditorProps extends JSX.InputHTMLAttributes<HTMLDivElement> {
	data: unknown;
	/** 逻辑执行者的类型（Player 或 Mob） */
	memberType: MemberType;
	setData: (data: unknown) => void;
	state: unknown;
	setCode: (code: string) => void;
	// 仅展示模式：禁用所有编辑能力（无工具箱、不可拖拽/连线/删除）
	readOnly?: boolean;
}

export function LogicEditor(props: LogicEditorProps) {
	const media = useContext(MediaContext);
	const [ref, setRef] = createSignal<HTMLDivElement>();

	// 读取 Tailwind 类实际颜色，便于与系统主题一致
	const resolveColorFromClass = (
		container: HTMLElement,
		className: string,
		property: "background-color" | "color" = "background-color",
	): string => {
		const probe = document.createElement("div");
		probe.style.position = "absolute";
		probe.style.visibility = "hidden";
		probe.style.pointerEvents = "none";
		probe.className = className;
		container.appendChild(probe);
		const color = getComputedStyle(probe).getPropertyValue(property) || "";
		container.removeChild(probe);
		return color || "";
	};

	const createToramTheme = (container: HTMLElement) => {
		// 基础配色从应用类名读取，若获取失败则回退
		const workspaceBg = resolveColorFromClass(container, "bg-area-color") || "#1e1e1e";
		const toolboxBg = resolveColorFromClass(container, "bg-accent-color") || "#161616";
		const toolboxFg = resolveColorFromClass(container, "text-primary-color", "color") || "#ffffff";
		const flyoutBg = resolveColorFromClass(container, "bg-primary-color") || "#202020";
		const flyoutFg = resolveColorFromClass(container, "text-primary-color", "color") || "#cccccc";
		const scrollbarColor = resolveColorFromClass(container, "bg-dividing-color") || "#7f7f7f";
		const cursorColor = resolveColorFromClass(container, "text-accent-color", "color") || "#d0d0d0";
		const brand1 = resolveColorFromClass(container, "bg-brand-color-1st") || "#16a34a";

		return Theme.defineTheme("toram", {
			base: Themes.Zelos,
			componentStyles: {
				workspaceBackgroundColour: workspaceBg,
				toolboxBackgroundColour: toolboxBg,
				toolboxForegroundColour: toolboxFg,
				flyoutBackgroundColour: flyoutBg,
				flyoutForegroundColour: flyoutFg,
				flyoutOpacity: 0.9,
				scrollbarColour: scrollbarColor,
				scrollbarOpacity: 0.5,
				insertionMarkerColour: brand1,
				insertionMarkerOpacity: 0.4,
				cursorColour: cursorColor,
			},
			fontStyle: {
				family: `ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol",
    "Noto Color Emoji", "Noto Color Emoji"`,
				weight: "400",
				size: 11,
			},
			name: "toram",
		});
	};

	const { default: _d, ...location } = {
		"zh-CN": Zh,
		"zh-TW": ZhTw,
		ja: Ja,
		en: En,
	}[store.settings.userInterface.language];

	createEffect(
		on(
			() => props.state,
			() => {
				const div = ref();
				if (!div || !document.body.contains(div)) return;

				const toolbox = {
					kind: "categoryToolbox",
					contents: [
						...baseToolBoxConfig.contents,
					],
				};
				setLocale(location);
				const isReadOnly = !!props.readOnly;
				const injectionOptions: BlocklyOptions = {
					horizontalLayout: media.orientation === "portrait",
					renderer: "Zelos",
					toolboxPosition: media.orientation === "landscape" ? "start" : "end",
					theme: createToramTheme(div),
					toolbox,
					readOnly: isReadOnly,

					move: {
						scrollbars: true,
						drag: true,
						// wheel: true,
					},
					grid: {
						spacing: 25,
						length: 3,
						colour: "#ccc",
						snap: true,
					},
				};

				const workerSpace = inject(div, injectionOptions);
				serialization.workspaces.load(props.data ?? defaultData, workerSpace);

				workerSpace.addChangeListener(() => {
					const saved = serialization.workspaces.save(workerSpace);
					const code = javascriptGenerator.workspaceToCode(workerSpace);
					props.setData(saved);
					props.setCode(code);
				});
				workerSpace.scrollCenter();
			},
		),
	);

	return <div id="blocklyDiv" ref={setRef} class={props.class ? `  ${props.class}` : `h-full min-h-24 w-full`} />;
}
