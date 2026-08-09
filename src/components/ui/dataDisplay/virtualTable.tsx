import type { DB } from "@db/generated/zod/index";
import { debounce } from "@solid-primitives/scheduled";
import {
	type Cell,
	type Column,
	type ColumnDef,
	type ColumnVisibilityState,
	columnFacetingFeature,
	columnFilteringFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createFacetedMinMaxValues,
	createFacetedRowModel,
	createFacetedUniqueValues,
	createFilteredRowModel,
	createSortedRowModel,
	createTable,
	filterFn_includesString,
	globalFilteringFeature,
	type OnChangeFn,
	rowSortingFeature,
	tableFeatures,
} from "@tanstack/solid-table";
import { createVirtualizer, type Virtualizer } from "@tanstack/solid-virtual";
import type { Compilable, Kysely } from "kysely";
import type { OverlayScrollbarsComponentRef } from "overlayscrollbars-solid";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { type Accessor, createEffect, createSignal, For, type JSX, onCleanup, onMount, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import type { Dic, EnumFieldDetail } from "~/locales/type";
import { createLiveKyselyQuery } from "~/platform/pglite/liveQuery";
import { store } from "~/store";
import { Button } from "../controls/button";

const virtualTableFeatures = tableFeatures({
	columnFacetingFeature,
	columnFilteringFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	globalFilteringFeature,
	rowSortingFeature,
	filteredRowModel: createFilteredRowModel(),
	sortedRowModel: createSortedRowModel(),
	facetedRowModel: createFacetedRowModel(),
	facetedUniqueValues: createFacetedUniqueValues(),
	facetedMinMaxValues: createFacetedMinMaxValues(),
	filterFns: { includesString: filterFn_includesString },
});

export type VirtualTableFeatures = typeof virtualTableFeatures;

export interface VirtualTableProps<T extends object> {
	primaryKey: keyof T;
	// 行高预测
	measure?: {
		estimateSize: number;
	};
	// 查询构建器
	query: (db: Kysely<DB>) => Compilable<T> | null | undefined;
	// 列定义 - 强制 id 必须是 T 的键
	columnsDef: Array<ColumnDef<VirtualTableFeatures, T> & { id: keyof T }>;
	// 隐藏列定义
	hiddenColumnDef: Array<keyof T>;
	// 单元格渲染器
	tdGenerator: Partial<{
		[K in keyof T]: (props: { cell: Cell<VirtualTableFeatures, T, unknown>; dic: Dic<T> }) => JSX.Element;
	}>;
	// 默认排序
	defaultSort: { field: keyof T; desc: boolean };
	// 全局过滤字符串
	globalFilterStr: Accessor<string>;
	// 字典
	dictionary: Dic<T>;
	// 行点击处理
	rowHandleClick: (data: T) => void;
	// 列可见性
	columnVisibility?: ColumnVisibilityState;
	// 列可见性变化处理
	onColumnVisibilityChange?: OnChangeFn<ColumnVisibilityState>;
}

export function VirtualTable<T extends object>(props: VirtualTableProps<T>) {
	// 组件内部处理 live query
	const liveResult = createLiveKyselyQuery(props.query);
	const data = () => liveResult.rows();

	const ROW_DRAG_THRESHOLD = 3;
	const VIRTUAL_TABLE_DEBUG_QUERY_KEY = "debugVirtualTable";
	const VIRTUAL_TABLE_DEBUG_STORAGE_KEY = "VirtualTableDebug";

	// 诊断日志默认关闭，避免大表滚动和逐行测量时刷屏。
	// 设计目的：把“列表行重新渲染”和“虚拟器重新测量”拆开观察，定位高度修正造成的二次布局。
	const getVirtualTableDebugMode = () => {
		if (!import.meta.env.DEV || typeof window === "undefined") return;
		try {
			const urlMode = new URLSearchParams(window.location.search).get(VIRTUAL_TABLE_DEBUG_QUERY_KEY);
			const storageMode = window.localStorage.getItem(VIRTUAL_TABLE_DEBUG_STORAGE_KEY);
			const mode = urlMode ?? storageMode;
			if (!mode || mode === "0" || mode === "false") return;
			return mode;
		} catch {
			return;
		}
	};

	const isVirtualTableDebugEnabled = () => getVirtualTableDebugMode() !== undefined;

	const debugTableLabel = () => {
		const dictionaryName = (props.dictionary as { selfName?: string }).selfName;
		return dictionaryName ? `${dictionaryName}:${String(props.primaryKey)}` : String(props.primaryKey);
	};

	const debugVirtualTable = (label: string, payload: Record<string, unknown> = {}) => {
		if (!isVirtualTableDebugEnabled()) return;
		console.log(`[VirtualTable:${debugTableLabel()}] ${label}`, {
			time: Math.round(performance.now()),
			...payload,
		});
	};

	const estimateRowSize = () => props.measure?.estimateSize ?? 96;

	// [列可见性控制组件]的可见状态
	const [columnVisibleIsOpen] = createSignal(false);

	const [globalFilter, setGlobalFilter] = createSignal("");
	const debounceSetGlobalFilter = debounce((value: string) => setGlobalFilter(value), 500);

	// 过滤字符串
	createEffect(() => debounceSetGlobalFilter(props.globalFilterStr()));
	createEffect(() => {
		const res = data();
		debugVirtualTable("dataChanged", {
			length: res.length,
			firstRowId: res[0]?.[props.primaryKey],
			lastRowId: res.at(-1)?.[props.primaryKey],
			globalFilter: props.globalFilterStr(),
		});
	});

	// 创建一次 table，用 reactive getter 保持响应式
	const table = createTable({
		features: virtualTableFeatures,
		get data() {
			return data();
		},
		get columns() {
			return props.columnsDef;
		},
		getRowId: (row) => String(row[props.primaryKey]),
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
		debugTable: true,
		debugHeaders: false,
		debugColumns: false,
		initialState: {
			sorting: [
				{
					id: props.defaultSort.field as string,
					desc: props.defaultSort.desc,
				},
			],
		},
	});

	createEffect(() => {
		const rowModel = table.getRowModel();
		debugVirtualTable("rowModelChanged", {
			rowCount: rowModel.rows.length,
			firstRowId: rowModel.rows[0]?.id,
			lastRowId: rowModel.rows.at(-1)?.id,
			globalFilter: globalFilter(),
		});
	});

	const [virtualScrollRef, setVirtualScrollRef] = createSignal<OverlayScrollbarsComponentRef | undefined>(undefined);
	const [virtualer, setVirtualer] = createSignal<Virtualizer<HTMLElement, Element> | null>(null);

	onMount(() => {
		console.log("VirtualTable onMount");
		debugVirtualTable("mount", {
			rowCount: table.getRowModel().rows.length,
			columnCount: table.getAllColumns().length,
			estimateSize: estimateRowSize(),
			animationEnabled: store.settings.userInterface.isAnimationEnabled,
		});
		const v = createVirtualizer({
			get count() {
				return table.getRowModel().rows.length;
			},
			getItemKey: (index) => {
				const row = table.getRowModel().rows[index];
				return row?.id ?? index;
			},
			getScrollElement: () => virtualScrollRef()?.osInstance()?.elements().viewport ?? null,
			estimateSize: estimateRowSize,
			overscan: 5,
			// 测量防御：卸载元素 / 0 高度返回估计值，避免把无效高度写入尺寸缓存。
			// v3 的 RO 回调与 ref 同步测量都会走这里（默认实现还会优先返回缓存，缺少实测兜底）。
			measureElement: (element) => {
				if (!element.isConnected || !document.body.contains(element)) return estimateRowSize();
				const measuredHeight = element.getBoundingClientRect().height;
				return measuredHeight > 0 ? measuredHeight : estimateRowSize();
			},
			onChange: (instance, sync) => {
				debugVirtualTable("virtualizerChange", {
					sync,
					totalSize: Math.round(instance.getTotalSize()),
					rowCount: table.getRowModel().rows.length,
					visibleCount: instance.getVirtualItems().length,
					range: instance.getVirtualItems().map((item) => ({
						index: item.index,
						key: String(item.key),
						start: Math.round(item.start),
						size: Math.round(item.size),
						end: Math.round(item.end),
					})),
				});
			},
			useAnimationFrameWithResizeObserver: true,
		});
		setVirtualer(v);
	});

	onCleanup(() => {
		clearRowDragListeners();
		clearSuppressedClickReset();
		console.log("VirtualTable onCleanup");
	});

	// 行点击和拖拽事件
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

	const handleRowClick = (data: T, e: MouseEvent) => {
		if (suppressNextRowClick) {
			suppressNextRowClick = false;
			clearSuppressedClickReset();
			e.preventDefault();
			e.stopPropagation();
			return;
		}

		props.rowHandleClick(data);
	};

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
									level={table.getIsAllColumnsVisible() ? "default" : "primary"}
									onClick={() => {
										const allVisible = table.getIsAllColumnsVisible() ?? false;
										props.onColumnVisibilityChange?.((old) => {
											const newVisibility = { ...old };
											table.getAllLeafColumns().forEach((col) => {
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
								<For each={table.getAllLeafColumns()}>
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
			<OverlayScrollbarsComponent element="div" options={{ scrollbars: { autoHide: "scroll" } }} class="w-full h-full">
				<div class="TableContainer flex h-full flex-col">
					<Motion.div
						// animate={{
						// 	opacity: [0, 1],
						// }}
						// transition={{
						// 	duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0,
						// }}
						class={`TableHead z-10 flex w-fit`}
					>
						<For each={table.getHeaderGroups()}>
							{(headerGroup) => (
								<div class="TableHeadGroup border-dividing-color flex min-w-full gap-0 lg:border-b-2">
									<For each={headerGroup.headers}>
										{(header) => {
											const { column } = header;
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
					</Motion.div>
					<OverlayScrollbarsComponent
						element="div"
						options={{ scrollbars: { autoHide: "scroll" } }}
						ref={setVirtualScrollRef}
						class="TableBodyContaier h-full min-w-full flex-1"
						style={{
							width: `${table.getAllColumns().reduce((acc, col) => {
								if (props.hiddenColumnDef.includes(col.id as keyof T)) {
									return acc;
								}
								return acc + col.getSize();
							}, 0)}px`,
						}}
					>
						<Show when={virtualer()} fallback={"virtualer undifined"}>
							{(validVirtualer) => {
								return (
									<div style={{ height: `${validVirtualer().getTotalSize()}px` }} class={`TableBody relative`}>
										{/* 直接消费 solid-virtual 内部响应式 store（getVirtualItems），
										    数据/滚动变化由 createVirtualizer 的 createComputed 自动 reconcile，
										    不再维护组件的第二套 virtualItems 状态。 */}
										<For each={validVirtualer().getVirtualItems()}>
											{(virtualRow, index) => {
												try {
													const currentRow = () => table.getRowModel().rows[virtualRow.index];
													const currentRowId = () => currentRow()?.id ?? String(virtualRow.key);
													return (
														<Motion.button
															type="button"
															data-index={virtualRow.index}
															data-row-id={currentRowId()}
															data-virtual-key={virtualRow.key}
															animate={{
																opacity: [0, 1],
																transform: ["translateY(30px)", "translateY(0)"],
															}}
															transition={{
																duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0,
																delay: store.settings.userInterface.isAnimationEnabled
																	? index() < 15
																		? index() * 0.07
																		: 0
																	: 0,
															}}
															// 仅首次挂载时延迟一帧测量：行内容（图片等）渲染完成后才有准确高度，
															// 避免把布局未完成的高度写入尺寸缓存；内容后续变化由 v3 的 RO 观察自动重测。
															ref={(el) => {
																if (el.dataset.measured === "1") return;
																el.dataset.measured = "1";
																requestAnimationFrame(() => {
																	// rAF 延迟期间行可能已被虚拟列表卸载；跳过过期元素，避免 0 高度污染尺寸缓存。
																	if (!el.isConnected || !document.body.contains(el)) return;
																	validVirtualer().measureElement(el);
																});
															}}
															style={{
																position: "absolute",
																top: `${virtualRow.start}px`,
																"border-bottom": "1px solid transparent",
																"border-image":
																	"repeating-linear-gradient(to right, var(--color-dividing-color) 0 3px, transparent 3px 6px) 1",
															}}
															onPointerDown={handleRowPointerDown}
															onClick={(e) => {
																const row = currentRow();
																if (!row) return;
																console.log("row.original", row.original);
																handleRowClick(row.original, e);
															}}
															class={`Row group border-dividing-color hover:bg-area-color flex cursor-pointer transition-none hover:rounded hover:border-transparent`}
														>
															<For
																each={currentRow()
																	?.getVisibleCells()
																	.filter((cell) => !props.hiddenColumnDef.includes(cell.column.id as keyof T))}
															>
																{(cell) => {
																	const columnId = cell.column.id as keyof T;
																	let columnKey: string = String(columnId);
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
														</Motion.button>
													);
												} catch (error) {
													console.log("virtualKey", virtualRow.key, error);
												}
											}}
										</For>
									</div>
								);
							}}
						</Show>
					</OverlayScrollbarsComponent>
				</div>
			</OverlayScrollbarsComponent>
		</>
	);
}

// 获取表头样式
export const getCommonPinningStyles = <T extends object>(
	column: Column<VirtualTableFeatures, T>,
): JSX.CSSProperties => {
	const isPinned = column.getIsPinned();
	const isLastStart = isPinned === "start" && column.getAfter("start") === 0;
	const isFirstEnd = isPinned === "end" && column.getStart("end") === 0;
	const styles: JSX.CSSProperties = {
		position: isPinned ? "sticky" : "relative",
		width: column.getSize().toString(),
		"z-index": isPinned ? 1 : 0,
	};
	if (isPinned) {
		styles.left = isPinned === "start" ? `${column.getStart("start")}px` : undefined;
		styles.right = isPinned === "end" ? `${column.getAfter("end")}px` : undefined;
		styles["border-width"] = isLastStart ? "0px 2px 0px 0px" : isFirstEnd ? "0px 0px 0px 2px" : undefined;
	}
	return styles;
};
