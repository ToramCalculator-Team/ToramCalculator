import { type Component, For, Show } from "solid-js";
import { Button } from "~/components/controls/button";
import type { EditableBtRoot } from "../../model/editableTree";

export type BtSubtreeNavItem = {
	rootKey: string;
	displayName: string;
	isPrimary: boolean;
	errorCount: number;
	warningCount: number;
	referenceCount: number;
};

export const SubtreeNavBar: Component<{
	items: BtSubtreeNavItem[];
	activeRootKey: string;
	activeRoot: EditableBtRoot;
	deleteBlockedReason: string;
	readOnly: boolean;
	onSwitch: (rootKey: string) => void;
	onAdd: () => void;
	onRename: (name: string) => void;
	onDelete: () => void;
}> = (props) => (
	<div class="border-dividing-color flex min-h-14 flex-wrap items-center gap-2 border-b bg-primary-color px-3 py-2">
		<div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
			<For each={props.items}>
				{(item) => (
					<Button
						level={props.activeRootKey === item.rootKey ? "primary" : "quaternary"}
						class="min-h-10 max-w-48 gap-2 px-3 py-2"
						active={props.activeRootKey === item.rootKey}
						onClick={() => props.onSwitch(item.rootKey)}
					>
						<span class="truncate">{item.displayName}</span>
						<Show when={item.errorCount > 0}>
							<span class="rounded bg-brand-color-3rd px-1.5 py-0.5 text-xs text-primary-color">{item.errorCount}</span>
						</Show>
						<Show when={item.warningCount > 0}>
							<span class="rounded bg-amber-500 px-1.5 py-0.5 text-xs text-primary-color">{item.warningCount}</span>
						</Show>
						<Show when={!item.isPrimary && item.referenceCount > 0}>
							<span class="text-xs opacity-70">ref {item.referenceCount}</span>
						</Show>
					</Button>
				)}
			</For>
			<Button level="secondary" class="min-h-10 px-3 py-2" disabled={props.readOnly} onClick={props.onAdd}>
				+ 子树
			</Button>
		</div>
		<Show when={props.activeRoot.name}>
			<div class="flex min-w-64 items-center gap-2">
				<input
					type="text"
					class="text-accent-color bg-area-color h-10 min-w-0 flex-1 rounded px-3 outline-none focus:outline-brand-color-1st"
					value={props.activeRoot.name ?? ""}
					disabled={props.readOnly}
					aria-label="子树名称"
					onInput={(event) => props.onRename(event.currentTarget.value)}
				/>
				<Button
					level="quaternary"
					class="min-h-10 px-3 py-2"
					disabled={props.readOnly || !!props.deleteBlockedReason}
					title={props.deleteBlockedReason || "删除子树"}
					onClick={props.onDelete}
				>
					删除
				</Button>
			</div>
		</Show>
		<Show when={props.activeRoot.name && props.deleteBlockedReason}>
			<div class="w-full text-xs text-main-text-color">{props.deleteBlockedReason}</div>
		</Show>
	</div>
);
