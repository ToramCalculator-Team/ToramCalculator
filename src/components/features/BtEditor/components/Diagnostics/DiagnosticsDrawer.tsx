import { type Component, For, Show } from "solid-js";
import { Button } from "~/components/controls/button";
import { type BtDiagnosticListItem, severityClass, severityLabel, sourceLabel } from "./diagnosticsModel";

export const DiagnosticsDrawer: Component<{
	open: boolean;
	items: BtDiagnosticListItem[];
	onClose: () => void;
	onSelect: (item: BtDiagnosticListItem) => void;
}> = (props) => (
	<Show when={props.open}>
		<div class="absolute inset-0 z-50 flex justify-end bg-black/30">
			<div class="bg-primary-color flex h-full w-full max-w-xl flex-col shadow-lg">
				<div class="border-dividing-color flex min-h-14 items-center gap-2 border-b p-3">
					<div class="flex-1 font-bold text-accent-color">Diagnostics</div>
					<Button level="quaternary" class="min-h-10 px-3 py-2" onClick={props.onClose}>
						关闭
					</Button>
				</div>
				<div class="min-h-0 flex-1 overflow-auto p-3">
					<div class="flex flex-col gap-2">
						<For each={props.items}>
							{(item) => (
								<button
									type="button"
									class="border-dividing-color hover:bg-area-color flex w-full flex-col gap-1 rounded border p-3 text-left"
									onClick={() => props.onSelect(item)}
								>
									<div class="flex flex-wrap items-center gap-2 text-xs">
										<span class={`rounded px-2 py-0.5 ${severityClass(item.severity)}`}>
											{severityLabel(item.severity)}
										</span>
										<span class="text-main-text-color">{sourceLabel(item.source)}</span>
										<Show when={item.rootLabel}>
											<span class="text-main-text-color">子树：{item.rootLabel}</span>
										</Show>
										<Show when={item.nodeSummary}>
											<span class="text-main-text-color">节点：{item.nodeSummary}</span>
										</Show>
									</div>
									<div>{item.message}</div>
									<div class="text-main-text-color text-xs">{item.code}</div>
								</button>
							)}
						</For>
					</div>
				</div>
			</div>
		</div>
	</Show>
);
