import { Show } from "solid-js";

export const ModifiersRenderer = (props: { data: string[]; unfold?: boolean }) => {
	return (
		<Show when={props.data}>
			{(vaildData) => (
				<Show
					when={props.unfold === true || props.unfold === undefined}
					fallback={<span class="w-full overflow-hidden text-ellipsis text-sm text-nowrap">{vaildData()}</span>}
				>
					<div class="flex flex-wrap gap-2">
						{vaildData().map((item) => (
							<span class="text-sm text-nowrap">{item}</span>
						))}
					</div>
				</Show>
			)}
		</Show>
	);
};
