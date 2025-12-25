import { type Component, For, Show } from "solid-js";
import { Icons } from "~/components/icons";
import { State } from "~/lib/mistreevous";
import type { NodeType } from "../../types/workflow";
import { DefaultNodeCallbackTag } from "./DefaultNodeCallbackTag";
import { DefaultNodeGuardTag } from "./DefaultNodeGuardTag";

export type DefaultNodeArgument =
	| string
	| number
	| boolean
	| null
	| { $: string };

export const DefaultNode: Component<NodeType> = (props) => {
	const getStateClasses = () => {
		switch (props.state) {
			case State.RUNNING:
				return "bg-transtion-color font-bold";
			case State.SUCCEEDED:
				return "bg-brand-color-1st text-primary-color";
			case State.FAILED:
				return "bg-brand-color-3rd text-primary-color";
			default:
				return "bg-primary-color";
		}
	};

	const getIcon = (nodeType: string) => {
		return {
			action: (
				<Icons.Outline.Edit class="text-primary-color h-6 w-6 flex-none rounded-md bg-[#3772ff] p-1" />
			),
			condition: (
				<Icons.Outline.Filter class="text-primary-color h-6 w-6 flex-none rounded-md bg-[#eac435] p-1" />
			),
			fail: (
				<Icons.Outline.Close class="text-primary-color h-6 w-6 flex-none rounded-md bg-[#e40066] p-1" />
			),
			flip: (
				<Icons.Outline.Swap class="text-primary-color h-6 w-6 flex-none rounded-md bg-[#f29e4c] p-1" />
			),
			lotto: (
				<Icons.Outline.Coins class="text-primary-color h-6 w-6 flex-none rounded-md bg-[#83e377] p-1" />
			),
			parallel: (
				<Icons.Outline.Category2 class="text-primary-color h-6 w-6 flex-none rounded-md bg-[#0db39e] p-1" />
			),
			race: (
				<Icons.Outline.Category2 class="text-primary-color h-6 w-6 flex-none rounded-md bg-[#16db93] p-1" />
			),
			all: (
				<Icons.Outline.Category2 class="text-primary-color h-6 w-6 flex-none rounded-md bg-[#16db93] p-1" />
			),
			repeat: (
				<Icons.Outline.Loading class="text-primary-color h-6 w-6 flex-none rounded-md bg-[#6c91bf] p-1" />
			),
			retry: (
				<Icons.Outline.Loading class="text-primary-color h-6 w-6 flex-none rounded-md bg-[#a14ebf] p-1" />
			),
			root: (
				<Icons.Outline.Home class="text-primary-color h-6 w-6 flex-none rounded-md bg-[rgb(99,98,104)] p-1" />
			),
			selector: (
				<Icons.Outline.Category class="text-primary-color h-6 w-6 flex-none rounded-md bg-[#54478c] p-1" />
			),
			sequence: (
				<Icons.Outline.Box2 class="text-primary-color h-6 w-6 flex-none rounded-md bg-[#e40066] p-1" />
			),
			succeed: (
				<Icons.Outline.Flag class="text-primary-color h-6 w-6 flex-none rounded-md bg-[rgb(0,190,32)] p-1" />
			),
			wait: (
				<Icons.Outline.Calendar class="text-primary-color h-6 w-6 flex-none rounded-md bg-[#826aed] p-1" />
			),
		}[nodeType];
	};

	const getArgument = (arg: DefaultNodeArgument) => {
		if (typeof arg === "string") {
			return (
				<p class="bg-area-color m-0 mx-0.5 inline-flex h-6 items-center rounded-md px-1.5 text-xs leading-4 font-semibold text-[#d80085]">
					<span class="leading-[100%]">{`"${arg}"`}</span>
				</p>
			);
		} else if (typeof arg === "number") {
			return (
				<p class="bg-area-color m-0 mx-0.5 inline-flex h-6 items-center rounded-md px-1.5 text-xs leading-4 font-semibold text-[#29c29c]">
					<span class="leading-[100%]">{arg}</span>
				</p>
			);
		} else if (typeof arg === "boolean") {
			return (
				<p class="bg-area-color m-0 mx-0.5 inline-flex h-6 items-center rounded-md px-1.5 text-xs leading-4 font-semibold text-[#902fff]">
					<span class="leading-[100%]">{arg ? "true" : "false"}</span>
				</p>
			);
		} else if (arg === null || arg === undefined) {
			return (
				<p class="bg-area-color m-0 mx-0.5 inline-flex h-6 items-center rounded-md px-1.5 text-xs leading-4 font-semibold text-[#517075]">
					<span class="leading-[100%]">
						{arg === null ? "null" : "undefined"}
					</span>
				</p>
			);
		} else if (
			typeof arg === "object" &&
			Object.keys(arg).length === 1 &&
			Object.hasOwn(arg, "$")
		) {
			return (
				<p class="bg-area-color m-0 mx-0.5 inline-flex h-6 items-center rounded-md px-1.5 text-xs leading-4 font-semibold text-[#009fc7]">
					<span class="leading-[100%]">{arg.$}</span>
				</p>
			);
		} else {
			return (
				<p class="bg-area-color m-0 mx-0.5 inline-flex h-6 items-center rounded-md px-1.5 text-xs leading-4 font-semibold text-[#ff4b5a]">
					<span class="leading-[100%]">{JSON.stringify(arg)}</span>
				</p>
			);
		}
	};
	return (
		<div
			class={`shadow-dividing-color flex flex-row items-start rounded-md p-2 whitespace-nowrap shadow ${getStateClasses()}`}
		>
			{getIcon(props.type)}
			<div class="flex flex-col">
				<div class="flex flex-row items-center">
					<p class="m-0 mx-1.5 ml-2 inline-flex h-6 items-center">
						<span class="leading-[100%]">{props.caption}</span>
					</p>
					<For each={props.args}>{(arg) => getArgument(arg)}</For>
				</div>
				<div class="flex flex-col items-start">
					<Show when={props.whileGuard}>
						<DefaultNodeGuardTag
							type="while"
							condition={props.whileGuard?.calls ?? ""}
							args={props.whileGuard?.args ?? []}
							succeedOnAbort={props.whileGuard?.succeedOnAbort ?? false}
						/>
					</Show>
					<Show when={props.untilGuard}>
						<DefaultNodeGuardTag
							type="until"
							condition={props.untilGuard?.calls ?? ""}
							args={props.untilGuard?.args ?? []}
							succeedOnAbort={props.untilGuard?.succeedOnAbort ?? false}
						/>
					</Show>
					<Show when={props.entryCallback}>
						<DefaultNodeCallbackTag
							type="entry"
							functionName={props.entryCallback?.calls ?? ""}
							args={props.entryCallback?.args ?? []}
						/>
					</Show>
					<Show when={props.stepCallback}>
						<DefaultNodeCallbackTag
							type="step"
							functionName={props.stepCallback?.calls ?? ""}
							args={props.stepCallback?.args ?? []}
						/>
					</Show>
					<Show when={props.exitCallback}>
						<DefaultNodeCallbackTag
							type="exit"
							functionName={props.exitCallback?.calls ?? ""}
							args={props.exitCallback?.args ?? []}
						/>
					</Show>
				</div>
			</div>
		</div>
	);
};
