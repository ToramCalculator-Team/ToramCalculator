/**
 * 自动完成组件（通用、与业务无关）
 *
 * - input 显示值由组件内部维护（string）
 * - 外部只关心“选中值”（泛型 TValue）
 * - options 由外部提供，组件不负责拉取数据
 * - 使用状态机管理：打开/关闭、输入、键盘高亮
 */

import { useMachine } from "@xstate/solid";
import {
	createEffect,
	createMemo,
	createSignal,
	For,
	type JSX,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import { assign, createMachine } from "xstate";

type NativeInputProps = Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "value" | "onInput" | "onChange">;

export interface AutocompleteProps<TOption, TValue> extends NativeInputProps {
	/** input 的唯一 name */
	id: string;

	/** 可选项（由外部提供） */
	options: readonly TOption[];

	/** 当前选中值（不是 input.value） */
	value: TValue | undefined;

	/** 选中回调（回写 value） */
	onChange: (value: TValue, option: TOption) => void;

	/** 从 option 提取值（用于匹配选中项） */
	getOptionValue: (option: TOption) => TValue;

	/** 从 option 提取展示文本（用于 input 与列表展示） */
	getOptionLabel: (option: TOption) => string;

	/** 自定义过滤规则（不传则对 label 做 includes 匹配） */
	filterOption?: (option: TOption, input: string) => boolean;

	/** 自定义渲染选项 */
	renderOption?: (option: TOption, meta: { highlighted: boolean; selected: boolean }) => JSX.Element;

	/** 自定义值比较（不传则使用 Object.is） */
	isEqual?: (a: TValue, b: TValue) => boolean;

	/** 选项为空时占位 */
	emptyText?: JSX.Element;
}

type Ctx = {
	inputValue: string;
	isOpen: boolean;
	highlightedIndex: number;
};

const machine = createMachine(
	{
		id: "autocomplete",
		initial: "closed",
		context: {
			inputValue: "",
			isOpen: false,
			highlightedIndex: -1,
		} as Ctx,
		states: {
			closed: {
				entry: assign({ isOpen: false, highlightedIndex: -1 }),
				on: {
					FOCUS: { target: "open" },
					OPEN: { target: "open" },
					SYNC_INPUT: {
						actions: assign({
							inputValue: ({ event }) => (event.type === "SYNC_INPUT" ? event.value : ""),
						}),
					},
				},
			},
			open: {
				entry: assign({ isOpen: true }),
				on: {
					CLOSE: { target: "closed" },
					INPUT_CHANGE: {
						actions: assign({
							inputValue: ({ event }) => (event.type === "INPUT_CHANGE" ? event.value : ""),
							highlightedIndex: () => -1,
						}),
					},
					SYNC_INPUT: {
						actions: assign({
							inputValue: ({ event }) => (event.type === "SYNC_INPUT" ? event.value : ""),
						}),
					},
					HIGHLIGHT_NEXT: {
						actions: assign({
							highlightedIndex: ({ context, event }) => {
								if (event.type !== "HIGHLIGHT_NEXT") return context.highlightedIndex;
								if (event.max <= 0) return -1;
								const next = context.highlightedIndex < 0 ? 0 : context.highlightedIndex + 1;
								return Math.min(next, event.max - 1);
							},
						}),
					},
					HIGHLIGHT_PREV: {
						actions: assign({
							highlightedIndex: ({ context, event }) => {
								if (event.type !== "HIGHLIGHT_PREV") return context.highlightedIndex;
								if (event.max <= 0) return -1;
								const prev = context.highlightedIndex < 0 ? event.max - 1 : context.highlightedIndex - 1;
								return Math.max(prev, 0);
							},
						}),
					},
					HIGHLIGHT_SET: {
						actions: assign({
							highlightedIndex: ({ event }) => {
								if (event.type !== "HIGHLIGHT_SET") return -1;
								if (event.max <= 0) return -1;
								return Math.max(0, Math.min(event.index, event.max - 1));
							},
						}),
					},
				},
			},
		},
	},
);

export function Autocomplete<TOption, TValue>(props: AutocompleteProps<TOption, TValue>) {
	const {
		id,
		options,
		value,
		onChange,
		getOptionValue,
		getOptionLabel,
		filterOption,
		renderOption,
		isEqual: isEqualProp,
		emptyText,
		...inputProps
	} = props;

	const [state, send] = useMachine(machine);
	const context = () => state.context;

	const [inputRef, setInputRef] = createSignal<HTMLInputElement>();
	const [listRef, setListRef] = createSignal<HTMLDivElement>();

	const isEqual = (a: TValue, b: TValue) => (props.isEqual ? props.isEqual(a, b) : Object.is(a, b));

	const selectedOption = createMemo(() => {
		if (props.value === undefined) return undefined;
		return props.options.find((o) => isEqual(props.getOptionValue(o), props.value as TValue));
	});

	const isSelected = createMemo(() => selectedOption() !== undefined);

	// 外部 value/options 变化 → 同步 input 显示文本
	createEffect(() => {
		const selected = selectedOption();
		const label = selected ? props.getOptionLabel(selected) : "";
		send({ type: "SYNC_INPUT", value: label });
	});

	const filteredOptions = createMemo(() => {
		const input = context().inputValue.trim();
		if (input === "") return props.options;

		if (props.filterOption) {
			return props.options.filter((o) => props.filterOption?.(o, input));
		}
		const lower = input.toLowerCase();
		return props.options.filter((o) => props.getOptionLabel(o).toLowerCase().includes(lower));
	});

	const commit = (option: TOption) => {
		props.onChange(props.getOptionValue(option), option);
		send({ type: "SYNC_INPUT", value: props.getOptionLabel(option) });
		send({ type: "CLOSE" });
	};

	onMount(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				(listRef() && !listRef()?.contains(event.target as Node)) &&
				(inputRef() && !inputRef()?.contains(event.target as Node))
			) {
				send({ type: "CLOSE" });
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		onCleanup(() => document.removeEventListener("mousedown", handleClickOutside));
	});

	return (
		<div class="relative w-full">
			<input
				{...inputProps}
				id={props.id}
				ref={setInputRef}
				autocomplete="off"
				value={context().inputValue}
				onFocus={() => send({ type: "FOCUS" })}
				onInput={(e) => {
					send({ type: "OPEN" });
					send({ type: "INPUT_CHANGE", value: e.currentTarget.value });
				}}
				onKeyDown={(e) => {
					const max = filteredOptions().length;
					if (e.key === "ArrowDown") {
						e.preventDefault();
						send({ type: "OPEN" });
						send({ type: "HIGHLIGHT_NEXT", max });
						return;
					}
					if (e.key === "ArrowUp") {
						e.preventDefault();
						send({ type: "OPEN" });
						send({ type: "HIGHLIGHT_PREV", max });
						return;
					}
					if (e.key === "Enter") {
						const idx = context().highlightedIndex;
						const option = filteredOptions()[idx];
						if (option) {
							e.preventDefault();
							commit(option);
						}
						return;
					}
					if (e.key === "Escape") {
						send({ type: "CLOSE" });
					}
				}}
				class={`text-accent-color bg-area-color w-full rounded p-3 ${isSelected() ? "" : "outline-brand-color-2nd!"}`}
			/>

			<Show when={context().isOpen}>
				<div
					ref={setListRef}
					class="Options bg-primary-color shadow-dividing-color absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md py-1 shadow-lg"
				>
					<Show
						when={filteredOptions().length > 0}
						fallback={
							<div class="text-accent-color px-4 py-2 text-sm">{props.emptyText ?? <span>无可选项</span>}</div>
						}
					>
						<For each={filteredOptions()}>
							{(option, index) => {
								const highlighted = () => context().highlightedIndex === index();
								const selected = () =>
									props.value !== undefined && isEqual(props.getOptionValue(option), props.value as TValue);
								return (
									<button
										type="button"
										class={`relative flex w-full items-center px-4 py-2 text-left hover:bg-gray-100 ${
											highlighted() ? "bg-gray-100" : ""
										}`}
										onMouseEnter={() =>
											send({ type: "HIGHLIGHT_SET", index: index(), max: filteredOptions().length })
										}
										onClick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											commit(option);
										}}
									>
										<Show
											when={props.renderOption}
											fallback={<span class="w-full">{props.getOptionLabel(option)}</span>}
										>
											{props.renderOption?.(option, { highlighted: highlighted(), selected: selected() })}
										</Show>
									</button>
								);
							}}
						</For>
					</Show>
				</div>
			</Show>
		</div>
	);
}


