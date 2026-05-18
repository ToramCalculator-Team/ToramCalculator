import { debounce } from "@solid-primitives/scheduled";
import type { Column } from "@tanstack/solid-table";
import {
	type Cell,
	type ColumnDef,
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
import { createVirtualizer, type VirtualItem, type Virtualizer } from "@tanstack/solid-virtual";
import type { OverlayScrollbarsComponentRef } from "overlayscrollbars-solid";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import {
	type Accessor,
	createEffect,
	createMemo,
	createSignal,
	For,
	type JSX,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import { Motion, Presence } from "solid-motionone";
import type { Dic, EnumFieldDetail } from "~/locales/type";
import { store } from "~/store";
import { Button } from "../controls/button";

export interface VirtualTableProps<T extends Record<string, unknown>> {
	primaryKey: keyof T;
	// 行高预测
	measure?: {
		estimateSize: number;
	};
	// 数据（由父组件提供的响应式访问器）
	data: Accessor<T[]>;
	// 列定义
	columnsDef: ColumnDef<T>[];
	// 隐藏列定义
	hiddenColumnDef: Array<keyof T>;
	// 单元格渲染器
	tdGenerator: Partial<{
		[K in keyof T]: (props: { cell: Cell<T, unknown>; dic: Dic<T> }) => JSX.Element;
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
	columnVisibility?: VisibilityState;
	// 列可见性变化处理
	onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
}

export function VirtualTable<T extends Record<string, unknown>>(props: VirtualTableProps<T>) {
	const ROW_DRAG_THRESHOLD = 3;
	const VIRTUAL_TABLE_DEBUG_QUERY_KEY = "debugVirtualTable";
	const VIRTUAL_TABLE_DEBUG_STORAGE_KEY = "VirtualTableDebug";

	const rowRenderCountById = new Map<string, number>();
	const rowDomMountCountById = new Map<string, number>();
	const rowMeasureCountById = new Map<string, number>();
	const lastMeasuredHeightById = new Map<string, number>();
	let virtualizerChangeCount = 0;
	let lastVirtualRangeSignature = "";

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
		const res = props.data();
		debugVirtualTable("dataChanged", {
			length: res.length,
			firstRowId: res[0]?.[props.primaryKey],
			lastRowId: res.at(-1)?.[props.primaryKey],
			globalFilter: props.globalFilterStr(),
		});
	});

	// 创建一次 table，用 reactive getter 保持响应式
	const table = createSolidTable({
		get data() {
			const res = props.data();
			return res;
		},
		get columns() {
			return props.columnsDef;
		},
		getRowId: (row) => String(row[props.primaryKey]),
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
	const [virtualItems, setVirtualItems] = createSignal<VirtualItem[]>([]);
	const virtualItemKeys = createMemo(() => virtualItems().map((item) => String(item.key)));
	const virtualItemByKey = createMemo(() => {
		const itemMap = new Map<string, VirtualItem>();
		for (const item of virtualItems()) {
			itemMap.set(String(item.key), item);
		}
		return itemMap;
	});

	onMount(() => {
		console.log("VirtualTable onMount");
		debugVirtualTable("mount", {
			rowCount: table.getRowCount(),
			columnCount: table.getAllColumns().length,
			estimateSize: estimateRowSize(),
			animationEnabled: store.settings.userInterface.isAnimationEnabled,
		});
		const v = createVirtualizer({
			get count() {
				return table.getRowCount();
			},
			getItemKey: (index) => {
				const row = table.getRowModel().rows[index];
				return row?.id ?? index;
			},
			getScrollElement: () => virtualScrollRef()?.osInstance()?.elements().viewport ?? null,
			estimateSize: estimateRowSize,
			overscan: 5,
			measureElement: (element) => {
				const index = element.getAttribute("data-index");
				const rowId = element.getAttribute("data-row-id") ?? index ?? "unknown";
				const virtualKey = element.getAttribute("data-virtual-key");
				// ResizeObserver 可能在元素卸载后仍然回调；此时测量值为 0，不能写入 virtualizer 的尺寸缓存。
				if (!element.isConnected || !document.body.contains(element)) {
					debugVirtualTable("skipDisconnectedMeasure", {
						index,
						rowId,
						virtualKey,
						datasetMeasured: element.getAttribute("data-measured"),
					});
					return estimateRowSize();
				}
				const measuredHeight = element.getBoundingClientRect().height;
				if (measuredHeight <= 0) {
					const htmlElement = element instanceof HTMLElement ? element : undefined;
					debugVirtualTable("skipZeroHeightMeasure", {
						index,
						rowId,
						virtualKey,
						offsetHeight: htmlElement?.offsetHeight,
						clientHeight: htmlElement?.clientHeight,
						scrollHeight: htmlElement?.scrollHeight,
						childElementCount: htmlElement?.childElementCount,
					});
					return estimateRowSize();
				}
				const htmlElement = element instanceof HTMLElement ? element : undefined;
				const previousHeight = lastMeasuredHeightById.get(rowId);
				const measureCount = (rowMeasureCountById.get(rowId) ?? 0) + 1;
				rowMeasureCountById.set(rowId, measureCount);
				lastMeasuredHeightById.set(rowId, measuredHeight);
				debugVirtualTable("measureElement", {
					index,
					rowId,
					virtualKey,
					measureCount,
					measuredHeight,
					previousHeight,
					deltaFromPrevious: previousHeight === undefined ? undefined : measuredHeight - previousHeight,
					deltaFromEstimate: measuredHeight - estimateRowSize(),
					offsetHeight: htmlElement?.offsetHeight,
					scrollHeight: htmlElement?.scrollHeight,
					childElementCount: htmlElement?.childElementCount,
				});
				return measuredHeight;
			},
			onChange: (instance, sync) => {
				const nextVirtualItems = instance.getVirtualItems();
				const rangeSignature = nextVirtualItems
					.map((item) => `${item.index}:${Math.round(item.start)}:${Math.round(item.size)}`)
					.join("|");
				if (rangeSignature !== lastVirtualRangeSignature) {
					virtualizerChangeCount += 1;
					lastVirtualRangeSignature = rangeSignature;
					debugVirtualTable("virtualizerChange", {
						changeCount: virtualizerChangeCount,
						sync,
						totalSize: Math.round(instance.getTotalSize()),
						rowCount: table.getRowCount(),
						visibleCount: nextVirtualItems.length,
						range: nextVirtualItems.map((item) => ({
							index: item.index,
							key: String(item.key),
							start: Math.round(item.start),
							size: Math.round(item.size),
							end: Math.round(item.end),
						})),
					});
				}
				setVirtualItems(nextVirtualItems);
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
										<For each={virtualItemKeys()}>
											{(virtualKey, index) => {
												try {
													const currentVirtualRow = () => virtualItemByKey().get(virtualKey);
													const currentRow = () => {
														const virtualRow = currentVirtualRow();
														if (!virtualRow) return;
														return table.getRowModel().rows[virtualRow.index];
													};
													const currentRowId = () => currentRow()?.id ?? virtualKey;
													const currentVirtualIndex = () => currentVirtualRow()?.index ?? -1;

													createEffect(() => {
														const virtualRow = currentVirtualRow();
														const row = currentRow();
														if (!virtualRow || !row) return;
														const rowId = row.id;
														const renderCount = (rowRenderCountById.get(rowId) ?? 0) + 1;
														rowRenderCountById.set(rowId, renderCount);
														debugVirtualTable("rowRender", {
															rowId,
															renderCount,
															virtualIndex: virtualRow.index,
															virtualKey,
															virtualStart: Math.round(virtualRow.start),
															virtualSize: Math.round(virtualRow.size),
															virtualEnd: Math.round(virtualRow.end),
															visiblePosition: index(),
															cellCount: row.getVisibleCells().length,
														});
													});
													return (
														<Motion.button
															type="button"
															data-index={currentVirtualIndex()}
															data-row-id={currentRowId()}
															data-virtual-key={virtualKey}
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
															ref={(el) => {
																const virtualRow = currentVirtualRow();
																const row = currentRow();
																if (!virtualRow || !row) return;
																const rowId = row.id;
																el.setAttribute("data-index", virtualRow.index.toString());
																el.setAttribute("data-row-id", rowId);
																el.setAttribute("data-virtual-key", virtualKey);
																const mountCount = (rowDomMountCountById.get(rowId) ?? 0) + 1;
																rowDomMountCountById.set(rowId, mountCount);
																debugVirtualTable("rowRef", {
																	rowId,
																	mountCount,
																	renderCount: rowRenderCountById.get(rowId),
																	virtualIndex: virtualRow.index,
																	virtualKey,
																	virtualStart: Math.round(virtualRow.start),
																	virtualSize: Math.round(virtualRow.size),
																	dataMeasured: el.dataset.measured,
																	isConnected: el.isConnected,
																	offsetHeight: el.offsetHeight,
																	scrollHeight: el.scrollHeight,
																});
																// 仅在该 DOM 首次挂载时测量一次，避免重复测量触发 RO loop 警告。
																if (el.dataset.measured === "1") {
																	debugVirtualTable("skipAlreadyMeasuredRef", {
																		rowId,
																		virtualIndex: virtualRow.index,
																		virtualKey,
																		mountCount,
																	});
																	return;
																}
																el.dataset.measured = "1";
																requestAnimationFrame(() => {
																	// rAF 延迟期间，虚拟列表可能已经卸载该 DOM；跳过过期元素，避免 0 高度污染尺寸缓存。
																	if (!el.isConnected || !document.body.contains(el)) {
																		debugVirtualTable("skipDisconnectedRafMeasure", {
																			rowId,
																			virtualIndex: virtualRow.index,
																			virtualKey,
																			datasetIndex: el.getAttribute("data-index"),
																		});
																		return;
																	}
																	debugVirtualTable("rafMeasure", {
																		rowId,
																		virtualIndex: virtualRow.index,
																		virtualKey,
																		beforeHeight: el.getBoundingClientRect().height,
																		offsetHeight: el.offsetHeight,
																		scrollHeight: el.scrollHeight,
																	});
																	validVirtualer().measureElement(el);
																});
															}}
															style={{
																position: "absolute",
																top: `${currentVirtualRow()?.start ?? 0}px`,
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
																	.filter((cell) => !props.hiddenColumnDef.includes(cell.column.id))}
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
														</Motion.button>
													);
												} catch (error) {
													console.log("virtualKey", virtualKey, error);
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
