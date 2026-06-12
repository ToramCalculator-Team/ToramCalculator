/**
 * 成员状态显示面板
 *
 * 职责：
 * - 显示选中成员的详细信息
 * - 实时更新成员状态
 * - 展示成员属性、位置、状态等数据
 */

import { createVirtualizer, type VirtualItem, type Virtualizer } from "@tanstack/solid-virtual";
import type { OverlayScrollbarsComponentRef } from "overlayscrollbars-solid";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { type Accessor, createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { Dialog } from "~/components/containers/dialog";
import { Button } from "~/components/controls/button";
import { Icons } from "~/components/icons";
import { useEngine } from "../../thread/EngineContext";
import type { EngineRPC } from "../../thread/protocol";
import type { MemberSerializeData } from "./Member";
import { type DataStorage, isDataStorageType } from "./runtime/StatContainer/StatContainer";

// ============================== 组件实现 ==============================

const actualValueClass = "Value text-nowrap rounded-sm px-1 flex-1 flex items-center ";
const baseValueClass = " Value text-nowrap rounded-sm px-1 text-accent-color-70 flex-1 flex items-center ";
const modifierStaticClass = " Value text-nowrap rounded-sm px-1 text-accent-color-70 ";
const modifierDynamicClass = " Value text-nowrap rounded-sm px-1 text-accent-color-70 ";
const originClass =
	"Origin buttom-full absolute left-0 z-10 hidden rounded-sm bg-primary-color p-2 text-sm text-accent-color-70 shadow-xl shadow-transition-color-8 group-hover:flex pointer-events-none";
// 由于tailwind编译时生成对应class，此处class将不会生效
// const columns = 8;
const columnsWidth = "";
// 用于递归遍历对象并生成DOM结构的组件（响应式）
export const StatsRenderer = (props: { data?: object }) => {
	const renderObject = (
		obj: unknown,
		path: string[] = [],
		d: Record<string, string | number | object> | undefined = {},
	) =>
		Object.entries(obj ?? {}).map((data) => {
			const [key, value] = data as [string, DataStorage];
			const currentPath = [...path, key].join(".");
			if (typeof value === "object" && value !== null) {
				if (!isDataStorageType(value)) {
					return (
						<>
							<div
								class={`key=${currentPath} Object border-boundary-color flex gap-1 ${!currentPath.includes(".") && columnsWidth}`}
							>
								<span
									class="bg-area-color text-main-text-color w-8 rounded-sm text-center font-bold"
									style={{
										"writing-mode": "sideways-lr",
										"text-orientation": "mixed",
									}}
								>
									{key}
								</span>
								<div class="flex w-full flex-col gap-1">
									{renderObject(value, [...path, key], d[key] as Record<string, string | number | object> | undefined)}
								</div>
							</div>
							<div class="bg-boundary-color h-px w-full"></div>
						</>
					);
				}
				return (
					<div
						class={`key=${currentPath} Modifiers bg-area-color flex w-full flex-none flex-col gap-1 rounded-sm p-1 ${!(value.static.fixed.length > 0 || value.static.percentage.length > 0 || value.dynamic.fixed.length > 0 || value.dynamic.percentage.length > 0) && !currentPath.includes(".") && columnsWidth}`}
					>
						<div class="Key w-full p-1 text-sm font-bold">
							{value.displayName ?? (d[key] as string | number) ?? key}：
						</div>
						{value.static.fixed.length > 0 ||
						value.static.percentage.length > 0 ||
						value.dynamic.fixed.length > 0 ||
						value.dynamic.percentage.length > 0 ? (
							<div class="Values border-dividing-color border-t-px flex flex-1 flex-wrap gap-1 lg:gap-4">
								<div
									class={`TotalValue flex flex-col rounded-sm p-1 ${!(value.static.fixed.length > 0 || value.static.percentage.length > 0 || value.dynamic.fixed.length > 0 || value.dynamic.percentage.length > 0) && "w-full"}`}
								>
									<div class="Key text-accent-color-70 text-sm">{"实际值"}</div>
									<div class={` ${actualValueClass}`}>{value.actValue}</div>
								</div>
								<div class="BaseVlaue flex w-[25%] flex-col rounded-sm p-1 lg:w-[10%]">
									<span class="BaseValueName text-accent-color-70 text-sm">{"基础值"}</span>
									<span class={` ${baseValueClass}`}>{value.baseValue}</span>
								</div>
								<div class="ModifierVlaue flex w-full flex-1 flex-col rounded-sm p-1">
									<span class="ModifierValueName text-accent-color-70 px-1 text-sm">{"修正值"}</span>
									<div class="ModifierValueContent flex gap-1">
										{(value.static.fixed.length > 0 || value.static.percentage.length > 0) && (
											<div class="ModifierStaticBox flex flex-1 items-center px-1">
												<span class="ModifierStaticName text-accent-color-70 text-sm">{"静态修正值"}</span>
												<div class="ModifierStaticContent flex flex-wrap gap-1 rounded-sm p-1 text-nowrap">
													{value.static.fixed.length > 0 && (
														<div class="ModifierStaticFixedBox flex gap-2">
															{value.static.fixed.map((mod, index) => (
																<div
																	class={`key=${`ModifierStaticFixed${index}`} ModifierStaticFixed group bg-transition-color-20 relative flex items-center gap-1 rounded-sm px-1 py-0.5`}
																>
																	<span class={` ${modifierStaticClass}`}>{mod.value}</span>
																	<span class={` ${originClass}`}>来源：{mod.sourceId}</span>
																</div>
															))}
														</div>
													)}
													{value.static.percentage.length > 0 && (
														<div class="ModifierStaticPercentageBox flex flex-wrap gap-1">
															{value.static.percentage.map((mod, index) => (
																<div
																	class={`key=${`ModifierStaticPercentage${index}`} ModifierStaticPercentage group bg-transition-color-20 relative flex items-center gap-1 rounded-sm px-1 py-0.5`}
																>
																	<span class={` ${modifierStaticClass}`}>{mod.value}%</span>
																	<span class={` ${originClass}`}>来源：{mod.sourceId}</span>
																</div>
															))}
														</div>
													)}
												</div>
											</div>
										)}
										{(value.dynamic.fixed.length > 0 || value.dynamic.percentage.length > 0) && (
											<div class="ModifierDynamicBox flex flex-1 items-center px-1">
												<span class="ModifierDynamicName text-accent-color-70 text-sm">{"动态修正值"}</span>
												<div class="ModifierDynamicContent flex flex-wrap gap-1 rounded-sm p-1 text-nowrap">
													{value.dynamic.fixed.length > 0 && (
														<div class="ModifierDynamicFixedBox flex flex-1 flex-wrap gap-1">
															{value.dynamic.fixed.map((mod, index) => (
																<div
																	class={`key=${`ModifierDynamicFixed${index}`} ModifierDynamicFixed group bg-transition-color-20 relative flex items-center gap-1 rounded-sm px-1 py-0.5`}
																>
																	<span class={` ${modifierDynamicClass}`}>{mod.value}</span>
																	<span class={` ${originClass}`}>来源：{mod.sourceId}</span>
																</div>
															))}
														</div>
													)}
													{value.dynamic.percentage.length > 0 && (
														<div class="ModifierDynamicPercentageBox flex">
															{value.dynamic.percentage.map((mod, index) => (
																<div
																	class={`key=${`ModifierDynamicPercentage${index}`} ModifierDynamicPercentage group bg-transition-color-20 relative flex items-center gap-1 rounded-sm px-1 py-0.5`}
																>
																	<span class={` ${modifierDynamicClass}`}>{mod.value}%</span>
																	<span class={` ${originClass}`}>来源：{mod.sourceId}</span>
																</div>
															))}
														</div>
													)}
												</div>
											</div>
										)}
									</div>
								</div>
							</div>
						) : (
							<div class={` ${actualValueClass}`}>{value.actValue}</div>
						)}
					</div>
				);
			}
			return (
				<div
					class={`String bg-area-color flex w-full flex-none flex-col gap-1 rounded-sm p-1 lg:gap-4 ${!currentPath.includes(".") && columnsWidth}`}
				>
					<div class="Key w-full p-1 text-sm font-bold">{(d[key] as string | number) ?? key}：</div>
					<div class={` ${actualValueClass}`}>{String(value)}</div>
				</div>
			);
		});
	const dom = createMemo(() => renderObject(props.data));

	return (
		<div class="RenderObject flex w-full flex-col gap-1">{dom()}</div>
	);
};

// ============================== 虚拟化属性渲染 ==============================

// 扁平化后的行：分组标题行（group）、属性叶子行（attr）或标量行（string）。
type FlatStatRow =
	| { kind: "group"; id: string; depth: number; key: string }
	| { kind: "attr"; id: string; depth: number; key: string; storage: DataStorage }
	| { kind: "string"; id: string; depth: number; key: string; value: string };

// 将 StatContainer.exportNestedValues() 生成的任意深度嵌套树扁平化为线性行列表。
// 分组节点先产出标题行再递归子节点；DataStorage 叶子产出 attr 行；其余标量产出 string 行。
function flattenStats(obj: unknown, path: string[] = [], depth = 0, acc: FlatStatRow[] = []): FlatStatRow[] {
	for (const [key, value] of Object.entries(obj ?? {})) {
		const id = [...path, key].join(".");
		if (typeof value === "object" && value !== null) {
			if (isDataStorageType(value)) {
				acc.push({ kind: "attr", id, depth, key, storage: value });
			} else {
				acc.push({ kind: "group", id, depth, key });
				flattenStats(value, [...path, key], depth + 1, acc);
			}
		} else {
			acc.push({ kind: "string", id, depth, key, value: String(value) });
		}
	}
	return acc;
}

const hasModifiers = (s: DataStorage) =>
	s.static.fixed.length > 0 ||
	s.static.percentage.length > 0 ||
	s.dynamic.fixed.length > 0 ||
	s.dynamic.percentage.length > 0;

// 单条属性叶子行（复用 StatsRenderer 的修正值结构，去掉外层嵌套盒；缩进由外层行容器的 padding-left 负责）。
const AttrRow = (props: { row: Extract<FlatStatRow, { kind: "attr" }> }) => {
	const value = () => props.row.storage;
	return (
		<div class="Modifiers bg-area-color flex w-full flex-none flex-col gap-1 rounded-sm p-1">
			<div class="Key w-full p-1 text-sm font-bold">{value().displayName ?? props.row.key}：</div>
			<Show when={hasModifiers(value())} fallback={<div class={` ${actualValueClass}`}>{value().actValue}</div>}>
				<div class="Values border-dividing-color border-t-px flex flex-1 flex-wrap gap-1 lg:gap-4">
					<div class="TotalValue flex flex-col rounded-sm p-1">
						<div class="Key text-accent-color-70 text-sm">{"实际值"}</div>
						<div class={` ${actualValueClass}`}>{value().actValue}</div>
					</div>
					<div class="BaseVlaue flex w-[25%] flex-col rounded-sm p-1 lg:w-[10%]">
						<span class="BaseValueName text-accent-color-70 text-sm">{"基础值"}</span>
						<span class={` ${baseValueClass}`}>{value().baseValue}</span>
					</div>
					<div class="ModifierVlaue flex w-full flex-1 flex-col rounded-sm p-1">
						<span class="ModifierValueName text-accent-color-70 px-1 text-sm">{"修正值"}</span>
						<div class="ModifierValueContent flex gap-1">
							<Show when={value().static.fixed.length > 0 || value().static.percentage.length > 0}>
								<div class="ModifierStaticBox flex flex-1 items-center px-1">
									<span class="ModifierStaticName text-accent-color-70 text-sm">{"静态修正值"}</span>
									<div class="ModifierStaticContent flex flex-wrap gap-1 rounded-sm p-1 text-nowrap">
										<Show when={value().static.fixed.length > 0}>
											<div class="ModifierStaticFixedBox flex gap-2">
												<For each={value().static.fixed}>
													{(mod) => (
														<div class="ModifierStaticFixed group bg-transition-color-20 relative flex items-center gap-1 rounded-sm px-1 py-0.5">
															<span class={` ${modifierStaticClass}`}>{mod.value}</span>
															<span class={` ${originClass}`}>来源：{mod.sourceId}</span>
														</div>
													)}
												</For>
											</div>
										</Show>
										<Show when={value().static.percentage.length > 0}>
											<div class="ModifierStaticPercentageBox flex flex-wrap gap-1">
												<For each={value().static.percentage}>
													{(mod) => (
														<div class="ModifierStaticPercentage group bg-transition-color-20 relative flex items-center gap-1 rounded-sm px-1 py-0.5">
															<span class={` ${modifierStaticClass}`}>{mod.value}%</span>
															<span class={` ${originClass}`}>来源：{mod.sourceId}</span>
														</div>
													)}
												</For>
											</div>
										</Show>
									</div>
								</div>
							</Show>
							<Show when={value().dynamic.fixed.length > 0 || value().dynamic.percentage.length > 0}>
								<div class="ModifierDynamicBox flex flex-1 items-center px-1">
									<span class="ModifierDynamicName text-accent-color-70 text-sm">{"动态修正值"}</span>
									<div class="ModifierDynamicContent flex flex-wrap gap-1 rounded-sm p-1 text-nowrap">
										<Show when={value().dynamic.fixed.length > 0}>
											<div class="ModifierDynamicFixedBox flex flex-1 flex-wrap gap-1">
												<For each={value().dynamic.fixed}>
													{(mod) => (
														<div class="ModifierDynamicFixed group bg-transition-color-20 relative flex items-center gap-1 rounded-sm px-1 py-0.5">
															<span class={` ${modifierDynamicClass}`}>{mod.value}</span>
															<span class={` ${originClass}`}>来源：{mod.sourceId}</span>
														</div>
													)}
												</For>
											</div>
										</Show>
										<Show when={value().dynamic.percentage.length > 0}>
											<div class="ModifierDynamicPercentageBox flex">
												<For each={value().dynamic.percentage}>
													{(mod) => (
														<div class="ModifierDynamicPercentage group bg-transition-color-20 relative flex items-center gap-1 rounded-sm px-1 py-0.5">
															<span class={` ${modifierDynamicClass}`}>{mod.value}%</span>
															<span class={` ${originClass}`}>来源：{mod.sourceId}</span>
														</div>
													)}
												</For>
											</div>
										</Show>
									</div>
								</div>
							</Show>
						</div>
					</div>
				</div>
			</Show>
		</div>
	);
};

const GROUP_ROW_ESTIMATE = 40;
const ATTR_ROW_ESTIMATE = 90;

// 虚拟化版属性面板：扁平化 + 缩进，仅渲染视口内 ~20 行，消除 10hz 全树 diff。
export const VirtualStatsRenderer = (props: { data?: object }) => {
	const rows = createMemo(() => flattenStats(props.data));

	const [scrollRef, setScrollRef] = createSignal<OverlayScrollbarsComponentRef | undefined>(undefined);
	const [virtualizer, setVirtualizer] = createSignal<Virtualizer<HTMLElement, Element> | null>(null);
	const [virtualItems, setVirtualItems] = createSignal<VirtualItem[]>([]);
	const virtualItemKeys = createMemo(() => virtualItems().map((item) => String(item.key)));
	const virtualItemByKey = createMemo(() => {
		const map = new Map<string, VirtualItem>();
		for (const item of virtualItems()) map.set(String(item.key), item);
		return map;
	});

	const estimateSize = (index: number) => {
		const row = rows()[index];
		if (!row) return ATTR_ROW_ESTIMATE;
		return row.kind === "group" ? GROUP_ROW_ESTIMATE : ATTR_ROW_ESTIMATE;
	};

	onMount(() => {
		const v = createVirtualizer({
			get count() {
				return rows().length;
			},
			getItemKey: (index) => rows()[index]?.id ?? index,
			getScrollElement: () => scrollRef()?.osInstance()?.elements().viewport ?? null,
			estimateSize,
			overscan: 5,
			measureElement: (element) => {
				// ResizeObserver 可能在元素卸载后回调，0 高度会污染尺寸缓存。
				if (!element.isConnected || !document.body.contains(element)) {
					return estimateSize(Number(element.getAttribute("data-index")));
				}
				const measuredHeight = element.getBoundingClientRect().height;
				if (measuredHeight <= 0) {
					return estimateSize(Number(element.getAttribute("data-index")));
				}
				return measuredHeight;
			},
			onChange: (instance) => {
				setVirtualItems(instance.getVirtualItems());
			},
			useAnimationFrameWithResizeObserver: true,
		});
		setVirtualizer(v);
	});

	return (
		<OverlayScrollbarsComponent
			element="div"
			options={{ scrollbars: { autoHide: "scroll" } }}
			ref={setScrollRef}
			class="RenderObject w-full h-[55vh]"
		>
			<Show when={virtualizer()}>
				{(v) => (
					<div style={{ height: `${v().getTotalSize()}px`, position: "relative", width: "100%" }}>
						<For each={virtualItemKeys()}>
							{(virtualKey) => {
								const currentVirtual = () => virtualItemByKey().get(virtualKey);
								const currentRow = () => {
									const vi = currentVirtual();
									return vi ? rows()[vi.index] : undefined;
								};
								return (
									<Show when={currentVirtual()}>
										{(vi) => (
											<div
												data-index={vi().index}
												ref={(el) => {
													if (el.dataset.measured === "1") return;
													el.dataset.measured = "1";
													requestAnimationFrame(() => {
														if (!el.isConnected || !document.body.contains(el)) return;
														virtualizer()?.measureElement(el);
													});
												}}
												style={{ position: "absolute", top: `${vi().start}px`, left: 0, width: "100%" }}
											>
												<Show when={currentRow()}>
													{(row) => (
														<Show
															when={row().kind === "attr"}
															fallback={
																<Show
																	when={row().kind === "group"}
																	fallback={
																		<div
																			class="String bg-area-color flex w-full flex-none flex-col gap-1 rounded-sm p-1 lg:gap-4"
																			style={{ "margin-left": `${row().depth * 16}px` }}
																		>
																			<div class="Key w-full p-1 text-sm font-bold">{row().key}：</div>
																			<div class={` ${actualValueClass}`}>
																				{(row() as Extract<FlatStatRow, { kind: "string" }>).value}
																			</div>
																		</div>
																	}
																>
																	<div
																		class="Object bg-area-color text-main-text-color rounded-sm px-2 py-1 font-bold"
																		style={{ "margin-left": `${row().depth * 16}px` }}
																	>
																		{row().key}
																	</div>
																</Show>
															}
														>
															<AttrRow row={row() as Extract<FlatStatRow, { kind: "attr" }>} />
														</Show>
													)}
												</Show>
											</div>
										)}
									</Show>
								);
							}}
						</For>
					</div>
				)}
			</Show>
		</OverlayScrollbarsComponent>
	);
};

export function MemberStatusPanel(props: { controllerId?: string; member: Accessor<MemberSerializeData | null> }) {
	const engine = useEngine();
	const runtimeEngine = engine.simulatorEngine();

	const [liveAttrs, setLiveAttrs] = createSignal<object | undefined>(undefined);
	const [subViewId, setSubViewId] = createSignal<string | null>(null);

	const selectedMemberData = createMemo(() => {
		return liveAttrs() ?? props.member()?.attrs;
	});
	const [displayDetail, setDisplayDetail] = createSignal(false);
	const [activeTab, setActiveTab] = createSignal<"attrs" | "buffs">("attrs");

	const handleDebugViewFrame = (data: { engineId: string; frame: unknown }) => {
		const currentViewId = subViewId();
		if (!currentViewId) return;
		const evt = data.frame as { viewId?: unknown; data?: unknown };
		if (evt && evt.viewId === currentViewId && evt.data && typeof evt.data === "object") {
			setLiveAttrs(evt.data as object);
		}
	};

	createEffect(() => {
		const listener = handleDebugViewFrame as (payload: { engineId: string; frame: unknown }) => void;
		runtimeEngine?.on("debug_view_frame", listener);
		onCleanup(() => {
			runtimeEngine?.off("debug_view_frame", listener);
		});
	});

	createEffect(() => {
		const member = props.member();
		const memberId = member?.id;
		const controllerId = props.controllerId ?? "ui";
		const shouldSubscribe = displayDetail() && activeTab() === "attrs" && typeof memberId === "string" && memberId.length > 0;

		const current = subViewId();
		if (!shouldSubscribe) {
			if (current) {
				const rpc: EngineRPC = { type: "unsubscribe_debug_view", viewId: current };
				runtimeEngine?.executeEngineRPC(rpc, "low").catch(console.error);
				setSubViewId(null);
				setLiveAttrs(undefined);
			}
			return;
		}

		if (!current) {
			const rpc: EngineRPC = {
				type: "subscribe_debug_view",
				controllerId,
				memberId,
				viewType: "stat_container_export",
				hz: 10,
			};
			runtimeEngine
				?.executeEngineRPC(rpc, "low")
				.then((res) => {
					if (res?.success && res.data && typeof res.data === "object" && "viewId" in res.data) {
						setSubViewId((res.data as { viewId: string }).viewId);
					} else {
						console.warn("订阅成员属性面板失败:", res?.error);
					}
				})
				.catch(console.error);
		}
	});

	onCleanup(() => {
		const current = subViewId();
		if (current) {
			const rpc: EngineRPC = { type: "unsubscribe_debug_view", viewId: current };
			runtimeEngine?.executeEngineRPC(rpc, "low").catch(console.error);
		}
	});

	return (
		<Show
			when={props.member()}
			fallback={
				<div class="flex flex-1 items-center justify-center">
					<div class="text-dividing-color text-center">
						<div class="mb-2 text-lg">👤</div>
						<div class="text-sm">请选择一个成员查看详细信息</div>
					</div>
				</div>
			}
		>
			{/* 基础信息 */}
			<Button onClick={() => setDisplayDetail(!displayDetail())} level="secondary" class="w-fit h-fit">
				<Icons.Outline.InfoCircle />
			</Button>

			<Dialog state={displayDetail()} setState={setDisplayDetail} title="成员详情" maxWith="80vw">
				<div class="flex w-full flex-1 flex-col gap-1">
					{/* Tab 切换 */}
					<div class="border-dividing-color flex gap-2 border-b">
						<button
							type="button"
							onClick={() => setActiveTab("attrs")}
							class={`px-4 py-2 text-sm font-medium transition-colors ${
								activeTab() === "attrs"
									? "text-main-text-color border-b-2 border-brand-color-1st"
									: "text-accent-color-70 hover:text-main-text-color"
							}`}
						>
							属性
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("buffs")}
							class={`px-4 py-2 text-sm font-medium transition-colors ${
								activeTab() === "buffs"
									? "text-main-text-color border-b-2 border-brand-color-1st"
									: "text-accent-color-70 hover:text-main-text-color"
							}`}
						>
							Buff
						</button>
					</div>

					{/* Tab 内容 */}
					<div class="flex-1 overflow-auto">
						<Show when={activeTab() === "attrs"}>
							<div class="flex-1 rounded">
								<VirtualStatsRenderer data={selectedMemberData()} />
							</div>
						</Show>
						{/* <Show when={activeTab() === "buffs"}>
              <BuffTab buffs={props.member()?.buffs} />
            </Show> */}
					</div>

					{/* 调试信息 */}
					<div class="bg-area-color rounded p-2">
						<h4 class="text-md text-main-text-color mb-3 font-semibold">调试信息</h4>
						<details class="text-xs">
							<summary class="text-dividing-color hover:text-main-text-color cursor-pointer">查看原始数据</summary>
							<pre class="bg-primary-color text-main-text-color mt-2 rounded p-2">
								{JSON.stringify(props.member(), null, 2)}
							</pre>
						</details>
					</div>
				</div>
			</Dialog>
		</Show>
	);
}
