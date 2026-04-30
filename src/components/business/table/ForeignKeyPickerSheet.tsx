import type { DB } from "@db/generated/zod";
import type { VisibilityState } from "@tanstack/solid-table";
import { createMemo, createSignal, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { DATA_CONFIG, type TableDataConfig } from "~/components/business/data-config";
import { Sheet } from "~/components/containers/sheet";
import { Button } from "~/components/controls/button";
import { Input } from "~/components/controls/input";
import { VirtualTable } from "~/components/dataDisplay/virtualTable";
import { Icons } from "~/components/icons";
import { useDictionary } from "~/contexts/Dictionary";
import { createLiveKyselyQuery } from "~/lib/pglite/liveQuery";

export type ForeignKeyPickerSheetProps<T extends Record<string, unknown>> = {
	open: boolean;
	title: string;
	tableType: keyof DB;
	onOpenChange: (open: boolean) => void;
	onPick: (row: T) => void | Promise<void>;
};

export function ForeignKeyPickerSheet<T extends Record<string, unknown>>(props: ForeignKeyPickerSheetProps<T>) {
	const dictionary = useDictionary();
	const [filterText, setFilterText] = createSignal("");
	const [columnVisibility, setColumnVisibility] = createSignal<VisibilityState>({});

	// 单选外键选择器只负责读候选表并返回选中行；写入目标业务表由调用方完成。
	const config = createMemo(
		() => DATA_CONFIG[props.tableType]?.(dictionary) as ReturnType<TableDataConfig<T>> | undefined,
	);
	const liveRows = createLiveKyselyQuery<T>((db) => {
		const liveQueryBuilder = config()?.dataFetcher.liveQuery;
		if (!liveQueryBuilder) return null;
		return liveQueryBuilder(db);
	});

	const close = () => props.onOpenChange(false);

	const pickRow = async (row: T) => {
		await props.onPick(row);
		setFilterText("");
		setColumnVisibility({});
		close();
	};

	return (
		<Portal>
			<Sheet state={props.open} setState={props.onOpenChange}>
				<div class="flex portrait:h-[90dvh] w-full flex-col gap-2 p-6">
					<div class="sheetTitle w-full text-xl font-bold flex items-center justify-between">
						{props.title}
						<Button icon={<Icons.Outline.Close />} level="quaternary" class="rounded-none rounded-tr" onClick={close} />
					</div>
					<Show when={config()} fallback={<div class="p-3 text-sm">当前数据表不可选择</div>}>
						{(validConfig) => (
							<>
								<div class="TableBox p-3 rounded border-dividing-color border w-full h-full">
									<VirtualTable<T>
										measure={validConfig().table.measure}
										data={liveRows.rows}
										primaryKey={validConfig().primaryKey}
										columnsDef={validConfig().table.columnsDef}
										hiddenColumnDef={validConfig().table.hiddenColumnDef}
										tdGenerator={validConfig().table.tdGenerator}
										defaultSort={validConfig().table.defaultSort}
										dictionary={validConfig().dictionary}
										globalFilterStr={filterText}
										rowHandleClick={(row) => void pickRow(row)}
										columnVisibility={columnVisibility()}
										onColumnVisibilityChange={(updater) => {
											if (typeof updater === "function") {
												setColumnVisibility(updater(columnVisibility()));
											}
										}}
									/>
								</div>
								<Input type="text" value={filterText()} onInput={(e) => setFilterText(e.target.value)} />
							</>
						)}
					</Show>
				</div>
			</Sheet>
		</Portal>
	);
}
