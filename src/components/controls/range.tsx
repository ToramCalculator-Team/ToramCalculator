import { createId } from "@paralleldrive/cuid2";
import { createEffect, createMemo, createSignal, type JSX, Show } from "solid-js";
import type { InputSizeType, InputStateType } from "./input";

interface RangeInputProps
	extends Omit<
		JSX.InputHTMLAttributes<HTMLInputElement>,
		"type" | "value" | "defaultValue" | "min" | "max" | "step" | "size" | "onChange" | "onInput"
	> {
	title?: string;
	description?: string;
	size?: InputSizeType;
	state?: InputStateType;
	validationMessage?: string;
	value: number;
	setValue: (value: number) => void;
	min?: number;
	max?: number;
	step?: number;
	unit?: string;
	inputWidth?: number;
	showButtons?: boolean;
	showSlider?: boolean;
	formatValue?: (value: number) => string;
}

const clampValue = (value: number, min?: number, max?: number) => {
	let next = value;
	if (typeof min === "number") next = Math.max(min, next);
	if (typeof max === "number") next = Math.min(max, next);
	return next;
};

const getPrecision = (value: number) => {
	if (!Number.isFinite(value)) return 0;
	const normalized = value.toString().toLowerCase();
	if (normalized.includes("e-")) {
		return Number.parseInt(normalized.split("e-")[1] ?? "0", 10);
	}
	const decimalPart = normalized.split(".")[1];
	return decimalPart?.length ?? 0;
};

const trimTrailingZeros = (value: string) => value.replace(/\.?0+$/, "");

const snapToStep = (value: number, step: number, min?: number) => {
	if (!Number.isFinite(step) || step <= 0) return value;
	const base = typeof min === "number" ? min : 0;
	const snapped = Math.round((value - base) / step) * step + base;
	const precision = getPrecision(step);
	return Number.parseFloat(snapped.toFixed(precision));
};

const parseInputValue = (raw: string) => {
	const normalized = raw.trim().replaceAll(",", "");
	if (!normalized || normalized === "-" || normalized === "." || normalized === "-.") return null;
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
};

const defaultFormatter = (value: number, step: number) => {
	const precision = Math.min(6, getPrecision(step));
	if (precision <= 0) return `${Math.round(value)}`;
	return trimTrailingZeros(value.toFixed(precision));
};

const StepperIcon = (props: { mode: "plus" | "minus" }) => (
	<svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
		<path d="M3.5 8H12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
		<Show when={props.mode === "plus"}>
			<path d="M8 3.5V12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
		</Show>
	</svg>
);

export const RangeInput = (props: RangeInputProps) => {
	const id = props.id ?? `range-${createId()}`;
	const [isEditing, setIsEditing] = createSignal(false);

	const step = createMemo(() => (typeof props.step === "number" && props.step > 0 ? props.step : 1));
	const formatValue = (value: number) => (props.formatValue ? props.formatValue(value) : defaultFormatter(value, step()));
	const normalizedValue = createMemo(() => clampValue(Number.isFinite(props.value) ? props.value : 0, props.min, props.max));
	// displayValue 作为本地展示值，避免异步外部回写前输入框回滚到旧值。
	const [displayValue, setDisplayValue] = createSignal(normalizedValue());
	const [draftValue, setDraftValue] = createSignal(formatValue(displayValue()));
	const [sliderDraftValue, setSliderDraftValue] = createSignal<number | null>(null);

	createEffect(() => {
		setDisplayValue(normalizedValue());
	});

	createEffect(() => {
		if (!isEditing()) {
			setDraftValue(formatValue(displayValue()));
		}
	});

	const showButtons = () => props.showButtons !== false;
	const hasFiniteBounds = () => typeof props.min === "number" && typeof props.max === "number" && props.min <= props.max;
	const showSlider = () => (props.showSlider ?? true) && hasFiniteBounds();

	const getSizeClass = () => {
		const sizeMap = {
			sm: {
				wrapper: "rounded-md p-1 gap-1",
				button: "h-8 w-8 rounded-md",
				input: "px-2 py-1 text-sm",
				slider: "px-2 pb-2",
				text: "text-sm",
			},
			md: {
				wrapper: "rounded p-1.5 gap-1.5",
				button: "h-10 w-10 rounded-md",
				input: "px-3 py-2 text-base",
				slider: "px-3 pb-3",
				text: "text-sm",
			},
			lg: {
				wrapper: "rounded-xl p-2 gap-2",
				button: "h-12 w-12 rounded",
				input: "px-4 py-3 text-lg",
				slider: "px-4 pb-4",
				text: "text-base",
			},
		};
		return sizeMap[props.size ?? "md"];
	};

	const getStateClass = () => {
		const stateMap = {
			default: "",
			error: "focus-within:outline-brand-color-2nd",
		};
		return stateMap[props.state ?? "default"];
	};

	const getDisableClass = () => (props.disabled ? "pointer-events-none opacity-50" : "");

	const commitValue = (nextValue: number) => {
		// 统一提交入口：所有最终生效的数值都先经过 clamp + step 对齐，
		// 然后才调用外层 setValue（通常会触发持久化/重算等较重逻辑）。
		const snappedValue = snapToStep(clampValue(nextValue, props.min, props.max), step(), props.min);
		setDisplayValue(snappedValue);
		props.setValue(snappedValue);
		setDraftValue(formatValue(snappedValue));
	};

	const stepValue = (direction: -1 | 1) => {
		commitValue(displayValue() + direction * step());
	};

	const commitDraftValue = () => {
		// 文本框编辑态：onInput 只改本地 draft，不立即提交；
		// 只有 blur / Enter 才会进入 commitValue。
		const parsedValue = parseInputValue(draftValue());
		if (parsedValue === null) {
			setDraftValue(formatValue(displayValue()));
			return;
		}
		commitValue(parsedValue);
	};

	const currentSliderValue = () => (sliderDraftValue() ?? displayValue());

	const progress = () => {
		if (!hasFiniteBounds()) return 0;
		const span = (props.max ?? 0) - (props.min ?? 0);
		if (span <= 0) return 0;
		return ((currentSliderValue() - (props.min ?? 0)) / span) * 100;
	};

	const canDecrement = () => (typeof props.min !== "number" ? true : displayValue() > props.min);
	const canIncrement = () => (typeof props.max !== "number" ? true : displayValue() < props.max);

	return (
		<div class={`flex flex-1 flex-col items-start gap-2 ${props.class ?? ""}`}>
			<Show when={props.title}>
				<label for={id} class="flex flex-col">
					<span class="p-1">
						<span>{props.title}</span>
						&nbsp;&nbsp;
						<span class="text-brand-color-3rd">{props.validationMessage}</span>
					</span>
					<Show when={props.description}>
						<span class="text-main-text-color p-1 text-sm">{props.description}</span>
					</Show>
				</label>
			</Show>

			<div class={`w-full ${getStateClass()} ${getDisableClass()}`}>
				<div class={`bg-area-color flex items-center ${getSizeClass().wrapper}`}>
					<Show when={showButtons()}>
						<button
							type="button"
							class={`bg-primary-color text-main-text-color hover:bg-dividing-color active:bg-accent-color active:text-primary-color flex shrink-0 items-center justify-center ${getSizeClass().button} ${!canDecrement() ? "pointer-events-none opacity-40" : "cursor-pointer"}`}
							onClick={() => stepValue(-1)}
							disabled={!canDecrement()}
							aria-label={`Decrease ${props.title ?? props.name ?? "value"}`}
						>
							<StepperIcon mode="minus" />
						</button>
					</Show>

					<div class="flex min-w-0 flex-1 items-center">
						<input
							{...props}
							id={id}
							type="text"
							inputmode="decimal"
							value={draftValue()}
							class={`text-accent-color w-full min-w-0 flex-1 bg-transparent text-center font-semibold outline-hidden ${getSizeClass().input} ${getSizeClass().text} ${props.disabled ? "cursor-not-allowed" : ""}`}
							style={{
								width: props.inputWidth ? `${props.inputWidth}px` : undefined,
							}}
							onFocus={() => {
								setIsEditing(true);
							}}
							onInput={(event) => {
								// 文本输入过程仅更新草稿值，避免每个按键都触发外部 setValue。
								setDraftValue(event.currentTarget.value);
							}}
							onBlur={() => {
								// Enter 会主动触发 blur。若已非编辑态，说明本轮已提交过，避免重复提交。
								if (isEditing()) {
									commitDraftValue();
									setIsEditing(false);
								}
							}}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									event.preventDefault();
									commitDraftValue();
									setIsEditing(false);
									event.currentTarget.blur();
								}
								if (event.key === "Escape") {
									event.preventDefault();
									setIsEditing(false);
									setDraftValue(formatValue(displayValue()));
									event.currentTarget.blur();
								}
								if (event.key === "ArrowUp") {
									event.preventDefault();
									stepValue(1);
								}
								if (event.key === "ArrowDown") {
									event.preventDefault();
									stepValue(-1);
								}
							}}
						/>
						<Show when={props.unit}>
							<span class="text-main-text-color shrink-0 pr-3 text-sm">{props.unit}</span>
						</Show>
					</div>

					<Show when={showButtons()}>
						<button
							type="button"
							class={`bg-primary-color text-main-text-color hover:bg-dividing-color active:bg-accent-color active:text-primary-color flex shrink-0 items-center justify-center ${getSizeClass().button} ${!canIncrement() ? "pointer-events-none opacity-40" : "cursor-pointer"}`}
							onClick={() => stepValue(1)}
							disabled={!canIncrement()}
							aria-label={`Increase ${props.title ?? props.name ?? "value"}`}
						>
							<StepperIcon mode="plus" />
						</button>
					</Show>
				</div>

				<Show when={showSlider()}>
					<div class={getSizeClass().slider}>
						<input
							type="range"
							min={props.min}
							max={props.max}
							step={step()}
							value={currentSliderValue()}
							class="h-2 w-full cursor-pointer accent-accent-color"
							style={{
								"accent-color": "rgb(var(--accent))",
								background: `linear-gradient(to right, rgb(var(--accent)) 0%, rgb(var(--accent)) ${progress()}%, rgb(var(--transition) / 0.2) ${progress()}%, rgb(var(--transition) / 0.2) 100%)`,
							}}
							onInput={(event) => {
								// 拖动过程中只更新本地展示，不触发外部提交。
								setSliderDraftValue(Number(event.currentTarget.value));
							}}
							onChange={(event) => {
								// 鼠标/触摸抬起后由 change 统一提交。
								commitValue(Number(event.currentTarget.value));
								setSliderDraftValue(null);
							}}
							disabled={props.disabled}
							aria-label={props.title ?? props.name ?? "range"}
						/>
						<div class="text-boundary-color flex items-center justify-between px-1 pt-1 text-xs">
							<span>{formatValue(props.min ?? 0)}</span>
							<span>{formatValue(props.max ?? 0)}</span>
						</div>
					</div>
				</Show>
			</div>
		</div>
	);
};
