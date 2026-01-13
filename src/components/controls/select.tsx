import { createEffect, createResource, createSignal, For, type JSX, on, onCleanup, onMount, Show } from "solid-js";

export type SelectOption = {
	label: string;
	value: string;
};

type SelectProps = {
	value: string;
	setValue: (value: string) => void;
	options?: SelectOption[];
	optionsFetcher?: (name: string) => Promise<SelectOption[]>;
	optionGenerator?: (option: SelectOption, selected: boolean, onClick: () => void) => JSX.Element;
	placeholder?: string;
	class?: HTMLDivElement["className"];
	textCenter?: boolean;
	styleLess?: boolean;
	disabled?: boolean;
	optionPosition?: "top" | "bottom";
};

export function Select(props: SelectProps) {
	const hasOptionGenerator = props.optionGenerator !== undefined;
	const [isOpen, setIsOpen] = createSignal(false);
	const [selectedOption, setSelectedOption] = createSignal<SelectOption | undefined>(undefined);

	// 初始化时获取选项
	const [initialOptions] = createResource(async () => {
		let options: SelectOption[] = [];
		if (props.optionsFetcher) {
			options = await props.optionsFetcher("");
		} else if (props.options) {
			options = props.options;
		}
		return options;
	});

	// 当初始选项加载完成后，设置选中的选项
	createEffect(
		on(initialOptions, async (options) => {
			// console.log("options:====", options);
			if (options) {
				const option = options.find((opt) => opt.value === props.value);
				if (option) {
					setSelectedOption(option);
				}
			}
		}),
	);

	const handleSelect = (option: SelectOption) => {
		setSelectedOption(option);
		props.setValue(option.value);
		setIsOpen(false);
	};

	const handleClickOutside = (event: MouseEvent) => {
		const target = event.target as HTMLElement;
		if (!target.closest(".select-container")) {
			setIsOpen(false);
		}
	};

	onMount(() => {
		document.addEventListener("click", handleClickOutside);
	});

	onCleanup(() => {
		document.removeEventListener("click", handleClickOutside);
	});

	return (
		<div class={`select-container relative w-full ${props.class ?? ""}`}>
			<button
				type="button"
				onClick={() => !props.disabled && setIsOpen(!isOpen())}
				class={`${!props.styleLess && "border-dividing-color border"} text-main-text-color flex w-full items-center justify-between rounded-md p-1 ${
					props.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
				}`}
			>
				<div
					class={`${!props.styleLess && "bg-area-color rounded-md"} flex h-12 w-full items-center justify-between px-2 ${props.textCenter ? "justify-center" : "justify-between"}`}
				>
					<Show
						when={hasOptionGenerator}
						fallback={<span class="truncate">{selectedOption()?.label ?? props.placeholder ?? "请选择"}</span>}
					>
						{props.optionGenerator?.(
							selectedOption() ??
								(initialOptions.latest
									? initialOptions.latest[0]
									: {
											label: "请选择",
											value: "",
										}),
							false,
							() => handleSelect(selectedOption() ?? initialOptions.latest?.[0] ?? { label: "请选择", value: "" }),
						)}
					</Show>
					<Show when={!props.styleLess}>
						<svg
							class={`h-4 w-4 transition-transform ${isOpen() ? "rotate-180" : ""}`}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<title>选择</title>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</Show>
				</div>
			</button>
			<Show when={isOpen()}>
				<div
					class={`Options bg-primary-color shadow-dividing-color absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md shadow-lg ${
						props.optionPosition === "top" ? "-top-1 -translate-y-full" : "top-2 translate-y-12"
					}`}
				>
					<Show when={initialOptions.latest?.length}>
						<For each={initialOptions.latest}>
							{(option, index) => {
								const selected = option.value === selectedOption()?.value;
								const optionGenerator = hasOptionGenerator ? props.optionGenerator : undefined;
								const optionItem = optionGenerator ? (
									optionGenerator(option, selected, () => handleSelect(option))
								) : (
									<button
										type="button"
										class={`hover:bg-area-color w-full flex h-12 cursor-pointer items-center px-3 text-nowrap ${selected ? "bg-area-color" : ""}`}
										onClick={() => handleSelect(option)}
									>
										{option.label}
									</button>
								);
								return (
									<>
										<Show when={index() !== 0}>
											<div class="Divider bg-dividing-color h-px w-full flex-1" />
										</Show>
										{optionItem}
									</>
								);
							}}
						</For>
					</Show>
				</div>
			</Show>
		</div>
	);
}
