import { For, type JSX } from "solid-js";
import { Icons } from "~/components/icons/index";
import type { EnumFieldDetail } from "~/locales/type";

type EnumSelectProps<T extends Record<string, string>> = {
	value: keyof T;
	setValue: (value: keyof T) => void;
	iconMap?: Record<keyof T, JSX.Element>;
	options: string[];
	field: {
		id: string;
		name: string;
	};
	dic: EnumFieldDetail<string>["enumMap"];
};

export function EnumSelect<T extends Record<string, string>>(props: EnumSelectProps<T>) {

	return (
		<div class="EnumsBox flex flex-wrap gap-1">
			<For each={props.options}>
				{(option) => {
					return (
						<label
							for={props.field.name + option}
							class={`flex cursor-pointer border-transparent focus-within:border-accent-color items-center gap-1 rounded border-2 px-3 py-2 hover:opacity-100 ${props.value === option ? "bg-area-color" : "opacity-50"}`}
						>
							{props.iconMap ? props.iconMap[option] : <Icons.Filled.Basketball />}
							{props.dic[option]}
							<input
								id={props.field.name + option}
								name={props.field.name}
								value={option}
								checked={props.value === option}
								type="radio"
								onChange={(e) => {
									props.setValue?.(e.target.value);
								}}
								class="mt-0.5 sr-only rounded px-4 py-2"
							/>
						</label>
					);
				}}
			</For>
		</div>
	);
}
