import { createId } from "@paralleldrive/cuid2";
import { type JSX, Match, Show, Switch } from "solid-js";
import { Toggle } from "./toggle";

export type InputSizeType = "sm" | "md" | "lg";
export type InputComponentType = "text" | "password" | "number" | "boolean" | "checkBox" | "radio";
export type InputStateType = "default" | "error";

// class属性将分配值label标签
interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
	title?: string;
	description?: string;
	type?: InputComponentType;
	size?: InputSizeType;
	state?: InputStateType;
	validationMessage?: string;
	inputWidth?: number;
}

export const Input = (props: InputProps) => {
	const hasChildren = "children" in props;
	const id = `input-${createId()}`;

	const getSizeClass = () => {
		const sizeMap = {
			sm: "gap-2 rounded px-4 py-3",
			md: "gap-2 rounded-md px-4 py-3",
			default: "gap-3 p-2",
			lg: "gap-2 rounded-lg px-4 py-3",
			xl: "gap-2 rounded-xl px-4 py-3",
		};
		return sizeMap[props.size ?? "default"];
	};

	const getStateClass = () => {
		const stateMap = {
			default: "focus:outline-brand-color-1st",
			error: "focus:outline-brand-color-2nd",
		};
		return stateMap[props.state ?? "default"];
	};

	const getDisableClass = () => (props.disabled ? "pointer-events-none opacity-50" : "");

	return (
		<div class={`flex flex-1 flex-col items-start gap-2 p-2 ${props.class ?? ""}`}>
			<Show when={props.title}>
				<Show
					when={hasChildren}
					fallback={
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
					}
				>
					<div class="flex flex-col">
						<span class="p-1">
							<span>{props.title}</span>
							&nbsp;&nbsp;
							<span class="text-brand-color-3rd">{props.validationMessage}</span>
						</span>
						<Show when={props.description}>
							<span class="text-main-text-color p-1 text-sm">{props.description}</span>
						</Show>
					</div>
				</Show>
			</Show>
			<Show
				when={hasChildren}
				fallback={
					<Switch fallback={<div>未知类型的输入框</div>}>
						<Match when={props.type === "text"}>
							<input
								{...props}
								id={id}
								class={`text-accent-color bg-area-color w-full rounded p-3 ${getDisableClass()} ${getStateClass()}`}
								style={{
									width: `${props.inputWidth}px`,
								}}
							/>
						</Match>
						<Match when={props.type === "password"}>
							<input
								{...props}
								id={id}
								class={`text-accent-color bg-area-color w-full rounded p-3 ${getDisableClass()} ${getStateClass()}`}
								style={{
									width: `${props.inputWidth}px`,
								}}
							/>
						</Match>
						<Match when={props.type === "number"}>
							<input
								{...props}
								id={id}
								class={`text-accent-color bg-area-color w-full rounded p-3 ${getDisableClass()} ${getStateClass()}`}
								style={{
									width: `${props.inputWidth}px`,
								}}
							/>
						</Match>
						<Match when={props.type === "boolean"}>
							<Toggle name={props.title ?? ""} {...props} checked={props.checked} />
						</Match>
					</Switch>
				}
			>
				{props.children}
			</Show>
		</div>
	);
};
