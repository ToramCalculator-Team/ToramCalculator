import type { Component } from "solid-js";

export const PreviewRuntimeStatus: Component<{
	tick: number;
	treeState: string;
	runningNode: string;
}> = (props) => (
	<div class="w-full bg-primary-color border-dividing-color text-main-text-color flex min-h-11 lg:max-w-[min(560px,calc(100vw-120px))] items-center gap-3 rounded border px-3 py-2 text-xs shadow shadow-dividing-color">
		<span>tick {props.tick}</span>
		<span>{props.treeState}</span>
		<span class="truncate">running: {props.runningNode}</span>
	</div>
);
