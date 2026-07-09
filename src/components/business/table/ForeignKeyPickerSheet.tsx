import type { DB } from "@db/generated/zod";
import type { VisibilityState } from "@tanstack/solid-table";
import { createMemo, createSignal, Show } from "solid-js";
import { DATA_CONFIG, type TableDataConfig } from "~/components/business/data-config";
import { Button } from "~/components/controls/button";
import { Input } from "~/components/controls/input";
import { VirtualTable } from "~/components/dataDisplay/virtualTable";
import { Icons } from "~/components/icons";
import { useDictionary } from "~/contexts/Dictionary";
import { createLiveKyselyQuery } from "~/lib/pglite/liveQuery";

export type ForeignKeyPickerSheetContentProps<T extends Record<string, unknown>> = {
	title: string;
	tableType: keyof DB;
	onClose: () => void;
	onPick: (row: T) => void | Promise<void>;
};

export function ForeignKeyPickerSheetContent<T extends Record<string, unknown>>(
	props: ForeignKeyPickerSheetContentProps<T>,
) {
	const dictionary = useDictionary();
	const [filterText, setFilterText] = createSignal("");
	const [columnVisibility, setColumnVisibility] = createSignal<VisibilityState>({});

	// 单选外键选择器只负责读候选表并返回选中行；写入目标业务表由调用方完成。
	const config = createMemo(
		() => DATA_CONFIG[props.tableType]?.(dictionary) as ReturnType<TableDataConfig<T>> | undefined,
	);
	const liveRows = createLiveKyselyQuery<T>((db) => {
		const getAllQuery = config()?.queries.getAll;
		if (!getAllQuery) return null;
		return getAllQuery(db);
	});

	const pickRow = async (row: T) => {
		await props.onPick(row);
		setFilterText("");
		setColumnVisibility({});
		props.onClose();
	};

	return (
		<div class="flex portrait:h-[90dvh] w-full h-full flex-col gap-2 p-6">
			<div class="sheetTitle w-full text-xl font-bold flex items-center justify-between">
				{props.title}
				<Button
					icon={<Icons.Outline.Close />}
					level="quaternary"
					class="rounded-none rounded-tr"
					onClick={props.onClose}
				/>
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
	);
}
