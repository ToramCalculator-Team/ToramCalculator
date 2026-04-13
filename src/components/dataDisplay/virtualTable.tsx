import { debounce } from "@solid-primitives/scheduled";
import type { Column, Table as TanStackTable } from "@tanstack/solid-table";
import {
	type Cell,
	type ColumnDef,
	type ColumnFiltersState,
	createSolidTable,
	getCoreRowModel,
	getFacetedMinMaxValues,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	getSortedRowModel,
	type OnChangeFn,
	type VisibilityState,
} from "@tanstack/solid-table";
import { createVirtualizer } from "@tanstack/solid-virtual";
import type { OverlayScrollbarsComponentRef } from "overlayscrollbars-solid";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import {
	type Accessor,
	createEffect,
	createMemo,
	createResource,
	createSignal,
	For,
	type JSX,
	on,
	onCleanup,
	Show,
	useContext,
} from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { MediaContext } from "~/contexts/Media";
import type { Dic, EnumFieldDetail } from "~/locales/type";
import { store } from "~/store";
import { Button } from "../controls/button";
import { LoadingBar } from "../controls/loadingBar";

export interface VirtualTableProps<T extends Record<string, unknown>> {
	// 行高预测
	measure?: {
		estimateSize: number;
	};
	// 行数据获取器
	dataFetcher: () => Promise<T[]>;
	// 主键字段
	primaryKeyField: string;
	// 列定义
	columnsDef: ColumnDef<T>[];
	// 隐藏列定义
	hiddenColumnDef: Array<keyof T>;
	// 单元格渲染器
	tdGenerator: Partial<{
		[K in keyof T]: (props: { cell: Cell<T, unknown>; dic: Dic<T> }) => JSX.Element;
	}>;
	// 默认排序
	defaultSort: { id: keyof T; desc: boolean };
	// 全局过滤字符串
	globalFilterStr: Accessor<string>;
	// 字典
	dictionary: Dic<T>;
	// 行点击处理
	rowHandleClick: (id: string) => void;
	// 列可见性
	columnVisibility?: VisibilityState;
	// 列可见性变化处理
	onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
	// 重新获取数据处理
	onRefetch?: (refetch: () => void) => void;
}

export function VirtualTable<T extends Record<string, unknown>>(props: VirtualTableProps<T>) {
	const ROW_DRAG_THRESHOLD = 3;
	//   const start = performance.now();
	//   console.log("virtualTable start", start);
	const media = useContext(MediaContext);
	const [data, { refetch: refetchData }] = createResource(props.dataFetcher);

	// [列可见性控制组件]的可见状态
	const [columnVisibleIsOpen, setColumnVisibleIsOpen] = createSignal(false);

	const [columnFilters, setColumnFilters] = createSignal<ColumnFiltersState>([]);
	const [globalFilter, setGlobalFilter] = createSignal("");
	const debounceSetGlobalFilter = debounce((value: string) => setGlobalFilter(value), 500);

	// 暴露 refetch 方法
	createEffect(() => {
		console.log("表格已重新获取数据");
		props.onRefetch?.(refetchData);
	});

	// 过滤字符串
	createEffect(() => debounceSetGlobalFilter(props.globalFilterStr()));

	const [virtualScrollRef, setVirtualScrollRef] = createSignal<OverlayScrollbarsComponentRef | undefined>(undefined);
	const [table, setTable] = createSignal<TanStackTable<T>>();
	const tableContainer = createMemo(() => {
		return createVirtualizer({
			count: table()?.getRowCount() ?? 0,
			getScrollElement: () => virtualScrollRef()?.osInstance()?.elements().viewport ?? null,
			estimateSize: () => props.measure?.estimateSize ?? 96,
			overscan: 5,
			measureElement: (element) => element.getBoundingClientRect().height,
		});
	});

	createEffect(
		on(
			() => data.state,
			() => {
				// console.log("tableData change", performance.now() - start);
				// console.log("tableData", data());
				setTable(
					createSolidTable({
						data: data.latest ?? [],
						columns: props.columnsDef,
						getCoreRowModel: getCoreRowModel(),
						getSortedRowModel: getSortedRowModel(),
						state: {
							get globalFilter() {
								return globalFilter();
							},
							get columnVisibility() {
								return props.columnVisibility;
							},
						},
						onColumnVisibilityChange: props.onColumnVisibilityChange,
						onGlobalFilterChange: setGlobalFilter,
						globalFilterFn: "includesString",
						onColumnFiltersChange: setColumnFilters,
						getFilteredRowModel: getFilteredRowModel(),
						getFacetedRowModel: getFacetedRowModel(),
						getFacetedUniqueValues: getFacetedUniqueValues(),
						getFacetedMinMaxValues: getFacetedMinMaxValues(),
						debugTable: true,
						debugHeaders: false,
						debugColumns: false,
						initialState: {
							sorting: [
								{
									id: props.defaultSort.id as string,
									desc: props.defaultSort.desc,
								},
							],
						},
					}),
				);
			},
			{
				defer: true,
			},
		),
	);

	let cleanupRowDragListeners: (() => void) | undefined;
	let resetSuppressedClickTimer: ReturnType<typeof setTimeout> | undefined;
	let suppressNextRowClick = false;

	const clearSuppressedClickReset = () => {
		if (!resetSuppressedClickTimer) return;
		clearTimeout(resetSuppressedClickTimer);
		resetSuppressedClickTimer = undefined;
	};

	const scheduleSuppressedClickReset = () => {
		clearSuppressedClickReset();
		resetSuppressedClickTimer = setTimeout(() => {
			suppressNextRowClick = false;
			resetSuppressedClickTimer = undefined;
		}, 0);
	};

	const clearRowDragListeners = () => {
		cleanupRowDragListeners?.();
		cleanupRowDragListeners = undefined;
	};

	const getHorizontalScrollElement = () => {
		const viewport = virtualScrollRef()?.osInstance()?.elements().viewport;
		return viewport?.parentElement ?? viewport ?? null;
	};

	const handleRowPointerDown = (e: PointerEvent) => {
		if (e.button !== 0 || !e.isPrimary) return;
		const scrollElement = getHorizontalScrollElement();
		if (!scrollElement) return;

		clearRowDragListeners();
		const startX = e.clientX;
		const startY = e.clientY;
		const startScrollLeft = scrollElement.scrollLeft;
		let isDragging = false;

		const handlePointerMove = (event: PointerEvent) => {
			const deltaX = event.clientX - startX;
			const deltaY = event.clientY - startY;
			if (!isDragging && Math.hypot(deltaX, deltaY) > ROW_DRAG_THRESHOLD) {
				isDragging = true;
				suppressNextRowClick = true;
				clearSuppressedClickReset();
			}
			if (!isDragging) return;

			event.preventDefault();
			event.stopPropagation();
			scrollElement.scrollLeft = startScrollLeft - deltaX;
		};

		const finishPointerInteraction = () => {
			clearRowDragListeners();
			if (isDragging) {
				scheduleSuppressedClickReset();
			}
		};

		document.addEventListener("pointermove", handlePointerMove, { passive: false });
		document.addEventListener("pointerup", finishPointerInteraction);
		document.addEventListener("pointercancel", finishPointerInteraction);

		cleanupRowDragListeners = () => {
			document.removeEventListener("pointermove", handlePointerMove);
			document.removeEventListener("pointerup", finishPointerInteraction);
			document.removeEventListener("pointercancel", finishPointerInteraction);
		};
	};

	const handleRowClick = (primaryKey: string, e: MouseEvent) => {
		if (suppressNextRowClick) {
			suppressNextRowClick = false;
			clearSuppressedClickReset();
			e.preventDefault();
			e.stopPropagation();
			return;
		}

		props.rowHandleClick(primaryKey);
	};

	onCleanup(() => {
		clearRowDragListeners();
		clearSuppressedClickReset();
		console.log("VirtualTable onCleanup");
	});

	return (
		<>
			<Presence exitBeforeEnter>
				<Show when={columnVisibleIsOpen()}>
					<Motion.div
						animate={{
							opacity: [0, 1],
							gridTemplateRows: ["0fr", "1fr"],
							paddingBlock: ["0rem", "1rem"],
							filter: ["blur(20px)", "blur(0px)"],
						}}
						exit={{
							opacity: [1, 0],
							gridTemplateRows: ["1fr", "0fr"],
							paddingBlock: ["1rem", "0rem"],
							filter: ["blur(0px)", "blur(20px)"],
						}}
						transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
						class={`FilterBox grid portrait:px-6`}
					>
						<div
							class={`Content flex flex-col gap-2 overflow-hidden ${columnVisibleIsOpen() ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"} `}
						>
							<div class="content flex flex-wrap gap-2 px-6">
								<Button
									size="sm"
									level={table()?.getIsAllColumnsVisible() ? "default" : "primary"}
									onClick={() => {
										const allVisible = table()?.getIsAllColumnsVisible() ?? false;
										props.onColumnVisibilityChange?.((old) => {
											const newVisibility = { ...old };
											table()
												?.getAllLeafColumns()
												.forEach((col) => {
													if (!props.hiddenColumnDef.includes(col.id as keyof T)) {
														newVisibility[col.id] = !allVisible;
													}
												});
											return newVisibility;
										});
									}}
								>
									ALL
								</Button>
								<For each={table()?.getAllLeafColumns()}>
									{(column) => {
										if (props.hiddenColumnDef.includes(column.id as keyof T)) {
											return;
										}
										let columnKey = column.id;
										try {
											columnKey = props.dictionary?.fields[column.id as keyof Dic<T>["fields"]].key ?? column.id;
										} catch (error) {
											console.log("字典中不存在该字段", column.id, error);
										}
										return (
											<Button
												size="sm"
												level={column.getIsVisible() ? "default" : "primary"}
												onClick={() => {
													props.onColumnVisibilityChange?.((old) => ({
														...old,
														[column.id]: !column.getIsVisible(),
													}));
												}}
											>
												{columnKey}
											</Button>
										);
									}}
								</For>
							</div>
						</div>
					</Motion.div>
				</Show>
			</Presence>
			<OverlayScrollbarsComponent
				element="div"
				options={{ scrollbars: { autoHide: "scroll" } }}
				class="w-full h-full"
				defer
			>
				<div class="TableContainer flex h-full flex-col">
					<div class={`TableHead z-10 flex w-fit`}>
						<For each={table()?.getHeaderGroups()}>
							{(headerGroup) => (
								<div class="TableHeadGroup border-dividing-color flex min-w-full gap-0 border-t lg:border-b-2 lg:border-t-0">
									<For each={headerGroup.headers}>
										{(header) => {
											const { column } = header;
											if (props.hiddenColumnDef.includes(column.id as keyof T)) {
												// 默认隐藏的数据
												return;
											}

											let columnKey = column.id;
											try {
												columnKey = props.dictionary?.fields[column.id as keyof Dic<T>["fields"]].key ?? column.id;
											} catch (error) {
												console.log("字典中不存在该字段", column.id, error);
											}
											return (
												<div
													style={{
														...getCommonPinningStyles(column),
														width: `${getCommonPinningStyles(column).width}px`,
													}}
													{...{
														onClick: header.column.getToggleSortingHandler(),
													}}
													class={`hover:bg-area-color flex-none px-6 py-3 text-left font-normal text-nowrap lg:py-6 ${
														header.column.getCanSort() ? "cursor-pointer select-none" : ""
													}`}
												>
													{columnKey}
													{{
														asc: " ▲",
														desc: " ▼",
													}[header.column.getIsSorted() as string] ?? null}
												</div>
											);
										}}
									</For>
								</div>
							)}
						</For>
					</div>
					<OverlayScrollbarsComponent
						element="div"
						options={{ scrollbars: { autoHide: "scroll" } }}
						ref={setVirtualScrollRef}
						class="TableBodyContaier h-full min-w-full flex-1"
						style={{
							width: `${table()
								?.getAllColumns()
								.reduce((acc, col) => {
									if (props.hiddenColumnDef.includes(col.id as keyof T)) {
										return acc;
									}
									return acc + col.getSize();
								}, 0)}px`,
						}}
					>
						<Show
							when={data.state === "ready"}
							fallback={
								<div class="flex h-full w-full items-center justify-center">
									<LoadingBar />
								</div>
							}
						>
							<div style={{ height: `${tableContainer().getTotalSize()}px` }} class={`TableBody relative`}>
								<For each={tableContainer().getVirtualItems()}>
									{(virtualRow) => {
										const row = table()?.getRowModel().rows[virtualRow.index];
										if (!row) {
											return null;
										}
										const primaryKey = String(row.getValue(props.primaryKeyField));
										return (
											<button
												type="button"
												ref={(el) => {
													if (el && props.measure) {
														el.setAttribute("data-index", virtualRow.index.toString());
														tableContainer().measureElement(el);
													}
												}}
												style={{
													position: "absolute",
													transform: `translateY(${virtualRow.start}px)`,
													"border-bottom": "1px solid transparent",
													"border-image":
														"repeating-linear-gradient(to right, var(--color-dividing-color) 0 3px, transparent 3px 6px) 1",
												}}
												onPointerDown={handleRowPointerDown}
												onClick={(e) => handleRowClick(primaryKey, e)}
												class={`Row group border-dividing-color hover:bg-area-color flex cursor-pointer transition-none hover:rounded hover:border-transparent`}
											>
												<For
													each={row.getVisibleCells().filter((cell) => !props.hiddenColumnDef.includes(cell.column.id))}
												>
													{(cell) => {
														const columnId = cell.column.id;
														let columnKey = columnId;
														const isEnum = "enumMap" in props.dictionary.fields[columnId];
														try {
															columnKey = isEnum
																? (props.dictionary.fields[columnId] as EnumFieldDetail<string>).enumMap[
																		cell.getValue<string>()
																	]
																: cell.getValue<string>();
														} catch (error) {
															console.log("字典中不存在该字段", columnId, error);
														}

														const hasFieldGenerator = columnId in props.tdGenerator;
														const fieldGenerator = hasFieldGenerator ? props.tdGenerator[columnId] : () => null;
														return (
															<div
																style={{
																	...getCommonPinningStyles(cell.column),
																	width: `${getCommonPinningStyles(cell.column).width}px`,
																}}
																class={`text-main-text-color flex flex-col justify-center overflow-x-hidden px-6 py-6 text-ellipsis`}
															>
																<Show when={hasFieldGenerator} fallback={String(columnKey)}>
																	{fieldGenerator?.({ cell, dic: props.dictionary })}
																</Show>
															</div>
														);
													}}
												</For>
											</button>
										);
									}}
								</For>
							</div>
						</Show>
					</OverlayScrollbarsComponent>
				</div>
			</OverlayScrollbarsComponent>
		</>
	);
}

// 获取表头样式
export const getCommonPinningStyles = <T,>(column: Column<T>): JSX.CSSProperties => {
	const isPinned = column.getIsPinned();
	const isLastLeft = isPinned === "left" && column.getIsLastColumn("left");
	const isFirstRight = isPinned === "right" && column.getIsFirstColumn("right");
	const styles: JSX.CSSProperties = {
		position: isPinned ? "sticky" : "relative",
		width: column.getSize().toString(),
		"z-index": isPinned ? 1 : 0,
	};
	if (isPinned) {
		styles.left = isLastLeft ? `${column.getStart("left")}px` : undefined;
		styles.right = isFirstRight ? `${column.getAfter("right")}px` : undefined;
		styles["border-width"] = isLastLeft ? "0px 2px 0px 0px" : isFirstRight ? "0px 0px 0px 2px" : undefined;
	}
	return styles;
};
