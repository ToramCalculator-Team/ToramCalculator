import { type Component, For, Show } from "solid-js";

export const DebugConsole: Component<{
	open: boolean;
	logs: Array<{ tick: number; message: string }>;
	tick: number;
	onToggle: () => void;
}> = (props) => (
	<Show when={props.logs.length > 0}>
		<div class="border-dividing-color hidden border-t text-xs lg:block">
			<button
				type="button"
				class="text-main-text-color flex w-full items-center justify-between px-3 py-2"
				onClick={props.onToggle}
			>
				<span>Debug console · tick {props.tick}</span>
				<span>{props.open ? "收起" : "展开"}</span>
			</button>
			<Show when={props.open}>
				<div class="flex max-h-32 flex-col gap-1 overflow-auto px-3 pb-2">
					<For each={props.logs}>
						{(log) => (
							<div>
								[{log.tick}] {log.message}
							</div>
						)}
					</For>
				</div>
			</Show>
		</div>
	</Show>
);
