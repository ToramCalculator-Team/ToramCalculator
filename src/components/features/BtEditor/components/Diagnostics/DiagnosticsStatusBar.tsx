import type { Component } from "solid-js";
import type { BtDiagnosticListItem } from "./diagnosticsModel";

export const DiagnosticsStatusBar: Component<{
	errors: number;
	warnings: number;
	topDiagnostic?: BtDiagnosticListItem;
	class: string;
	onOpen: () => void;
}> = (props) => (
	<button
		type="button"
		class={`flex min-h-10 items-center gap-3 px-3 py-2 text-left text-sm ${props.class}`}
		onClick={props.onOpen}
	>
		<span class="font-bold">{props.errors} errors</span>
		<span class="font-bold">{props.warnings} warnings</span>
		<span class="min-w-0 flex-1 truncate">{props.topDiagnostic?.message}</span>
		<span class="text-xs underline">查看全部</span>
	</button>
);
