import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { type Component, Index, Show } from "solid-js";
import { Button } from "~/components/controls/button";
import { Icons } from "~/components/icons";

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
	readOnly: boolean;
	onSwitch: (rootKey: string) => void;
	onAdd: () => void;
	onDelete: (rootKey: string) => void;
}> = (props) => (
	// 设计说明：分支切换是画布编辑的高频动作，顶栏以横向 tab 承载；删除命令只发出 rootKey，由上层按文档引用关系统一判断。
	<div class="min-w-0 flex-1 self-stretch">
		<OverlayScrollbarsComponent
			element="div"
			options={{
				overflow: { x: "scroll", y: "hidden" },
				scrollbars: { autoHide: "scroll" },
			}}
			defer
			class="h-full w-full"
		>
			<div class="flex h-12">
				<Index each={props.items}>
					{(item) => {
						const active = () => props.activeRootKey === item().rootKey;
						return (
							<div
								data-bt-subtree-root-key={item().rootKey}
								class={`group flex h-full max-w-56 min-w-28 items-center border-r border-dividing-color ${
									active()
										? "bg-primary-color border-b-4 border-b-accent-color"
										: "bg-area-color"
								}`}
							>
								<button
									type="button"
									class="flex cursor-pointer text-main-text-color hover:bg-dividing-color h-full min-w-0 flex-1 items-center gap-1.5 px-2 text-left"
									title={item().displayName}
									aria-current={active() ? "page" : undefined}
									onClick={() => props.onSwitch(item().rootKey)}
								>
									<span class="truncate text-sm">{item().displayName}</span>
									<Show when={item().errorCount > 0}>
										<span class="shrink-0 rounded bg-brand-color-3rd px-1.5 py-0.5 text-xs text-primary-color">
											{item().errorCount}
										</span>
									</Show>
									<Show when={item().warningCount > 0}>
										<span class="shrink-0 rounded bg-yellow-500 px-1.5 py-0.5 text-xs text-primary-color">
											{item().warningCount}
										</span>
									</Show>
									<Show when={!item().isPrimary && item().referenceCount > 0}>
										<span class="shrink-0 text-xs opacity-70">ref {item().referenceCount}</span>
									</Show>
								</button>
								<Show when={!item().isPrimary}>
									<button
										type="button"
										class="hover:bg-dividing-color flex flex-none w-12 h-12 items-center justify-center"
										disabled={props.readOnly}
										title={item().referenceCount > 0 ? "该分支被引用，删除时会提示原因" : "删除分支"}
										aria-label={`删除分支 ${item().displayName}`}
										onClick={(event) => {
											event.stopPropagation();
											props.onDelete(item().rootKey);
										}}
									>
										×
									</button>
								</Show>
							</div>
						);
					}}
				</Index>
				<Button
					level="quaternary"
					disabled={props.readOnly}
					aria-label="新增分支"
					title="新增分支"
					onClick={props.onAdd}
				>
					<Icons.Outline.DocmentAdd />
				</Button>
			</div>
		</OverlayScrollbarsComponent>
	</div>
);
