/**
 * 成员状态显示面板
 *
 * 职责：
 * - 显示选中成员的详细信息
 * - 实时更新成员状态
 * - 展示成员属性、位置、状态等数据
 */

import { type Accessor, createEffect, createMemo, createSignal, onCleanup, Show } from "solid-js";
import { Dialog } from "~/components/containers/dialog";
import { Button } from "~/components/controls/button";
import { useEngine } from "../../thread/EngineContext";
import type { DataQueryCommand } from "../../thread/SimulatorPool";
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

	return <div class="RenderObject flex w-full flex-col gap-1">{dom()}</div>;
};

// 虚拟化展示组件（待优化）

// import { createVirtualizer } from '@tanstack/solid-virtual';

// // 数据项类型定义
// interface VirtualItem {
//   id: string;
//   type: 'object' | 'modifier' | 'string';
//   level: number;
//   key: string;
//   value: any;
//   path: string[];
//   displayData?: any;
// }

// // 用于递归遍历对象并生成虚拟列表数据
// const StatsRenderer = (props: { data?: object }) => {
//   const [parentRef, setParentRef] = createSignal<HTMLElement>();
//   const [isReady, setIsReady] = createSignal(false);

//   // 确保容器准备就绪后再创建虚拟化器
//   onMount(() => {
//     const parent = parentRef();
//     if (parent) {
//       // 使用 setTimeout 确保 DOM 完全渲染
//       setTimeout(() => {
//         setIsReady(true);
//         console.log('Container ready:', {
//           element: parent,
//           clientHeight: parent.clientHeight,
//           scrollHeight: parent.scrollHeight,
//           offsetHeight: parent.offsetHeight
//         });
//       }, 0);
//     }
//   });

//   // 将嵌套对象扁平化为虚拟列表项
//   const flattenData = (
//     obj: unknown,
//     path: string[] = [],
//     level: number = 0,
//     d: Record<string, string | number | object> | undefined = {}
//   ): VirtualItem[] => {
//     const items: VirtualItem[] = [];

//     Object.entries(obj ?? {}).forEach(([key, value]) => {
//       const currentPath = [...path, key];
//       const id = currentPath.join('.');

//       if (typeof value === "object" && value !== null) {
//         if (!isDataStorageType(value)) {
//           // 对象类型
//           items.push({
//             id,
//             type: 'object',
//             level,
//             key,
//             value,
//             path: currentPath,
//             displayData: d[key]
//           });

//           // 递归添加子项
//           items.push(...flattenData(value, currentPath, level + 1, d[key] as Record<string, string | number | object> | undefined));
//         } else {
//           // 修正值类型
//           items.push({
//             id,
//             type: 'modifier',
//             level,
//             key,
//             value,
//             path: currentPath,
//             displayData: d[key]
//           });
//         }
//       } else {
//         // 字符串/数字类型
//         items.push({
//           id,
//           type: 'string',
//           level,
//           key,
//           value,
//           path: currentPath,
//           displayData: d[key]
//         });
//       }
//     });

//     return items;
//   };

//   // 生成虚拟列表数据
//   const virtualItems = createMemo(() => flattenData(props.data));

//   // 创建虚拟化器
//   const virtualizer = createMemo(() => {
//     const parent = parentRef();
//     const items = virtualItems();
//     const ready = isReady();

//     console.log('Creating virtualizer:', {
//       parent,
//       itemCount: items.length,
//       ready,
//       parentHeight: parent?.clientHeight
//     });

//     if (!parent || items.length === 0 || !ready) return null;

//     const v = createVirtualizer({
//       count: items.length,
//       getScrollElement: () => parent,
//       estimateSize: (index) => {
//         const item = items[index];
//         if (!item) return 60;
//         if (item.type === 'object') return 60;
//         if (item.type === 'modifier') {
//           // 根据修正值数量估算高度
//           const hasModifiers = item.value?.static?.fixed?.length > 0 ||
//                               item.value?.static?.percentage?.length > 0 ||
//                               item.value?.dynamic?.fixed?.length > 0 ||
//                               item.value?.dynamic?.percentage?.length > 0;
//           return hasModifiers ? 200 : 80;
//         }
//         return 60;
//       },
//       overscan: 5,
//     });

//     console.log('Virtualizer created:', v);
//     return v;
//   });

//   // 渲染单个虚拟项
//   const renderVirtualItem = (item: VirtualItem) => {
//     const currentPath = item.path.join('.');
//     const { key, value, level, displayData } = item;

//     // 添加缩进样式
//     const indentStyle = {
//       'margin-left': `${level * 16}px`
//     };

//     if (item.type === 'object') {
//       return (
//         <div
//           class={`key=${currentPath} Object border-boundary-color flex gap-1 border-b p-1 ${!currentPath.includes(".") && "columnsWidth"}`}
//           style={indentStyle}
//         >
//           <span class="bg-area-color text-main-text-color w-8 text-center font-bold"
//                 style={{ "writing-mode": "sideways-lr", "text-orientation": "mixed" }}>
//             {key}
//           </span>
//         </div>
//       );
//     }

//     if (item.type === 'modifier') {
//       const hasModifiers = value.static.fixed.length > 0 ||
//                           value.static.percentage.length > 0 ||
//                           value.dynamic.fixed.length > 0 ||
//                           value.dynamic.percentage.length > 0;

//       return (
//         <div
//           class={`key=${currentPath} Modifiers bg-area-color flex w-full flex-none flex-col gap-1 rounded-sm p-1 ${!hasModifiers && !currentPath.includes(".") && "columnsWidth"}`}
//           style={indentStyle}
//         >
//           <div class="Key w-full p-1 text-sm font-bold">
//             {value.displayName ?? (displayData as string | number) ?? key}：
//           </div>

//           {hasModifiers ? (
//             <div class="Values border-dividing-color flex flex-1 flex-wrap gap-1 border-t-px lg:gap-4">
//               <div class={`TotalValue flex flex-col rounded-sm p-1 ${!hasModifiers && "w-full"}`}>
//                 <div class="Key text-accent-color-70 text-sm">实际值</div>
//                 <div class="actualValueClass">{value.actValue}</div>
//               </div>

//               <div class="BaseVlaue flex w-[25%] flex-col rounded-sm p-1 lg:w-[10%]">
//                 <span class="BaseValueName text-accent-color-70 text-sm">基础值</span>
//                 <span class="baseValueClass">{value.baseValue}</span>
//               </div>

//               <div class="ModifierVlaue flex w-full flex-1 flex-col rounded-sm p-1">
//                 <span class="ModifierValueName text-accent-color-70 px-1 text-sm">修正值</span>
//                 <div class="ModifierValueContent flex gap-1">
//                   {(value.static.fixed.length > 0 || value.static.percentage.length > 0) && (
//                     <div class="ModifierStaticBox flex flex-1 items-center px-1">
//                       <span class="ModifierStaticName text-accent-color-70 text-sm">静态修正值</span>
//                       <div class="ModifierStaticContent flex flex-wrap gap-1 rounded-sm p-1 text-nowrap">
//                         {value.static.fixed.length > 0 && (
//                           <div class="ModifierStaticFixedBox flex gap-2">
//                             {value.static.fixed.map((mod: any, index: number) => (
//                               <div class={`key=${"ModifierStaticFixed" + index} ModifierStaticFixed group bg-transition-color-20 relative flex items-center gap-1 rounded-sm px-1 py-0.5`}>
//                                 <span class="modifierStaticClass">{mod.value}</span>
//                                 <span class="originClass">来源：{mod.sourceId}</span>
//                               </div>
//                             ))}
//                           </div>
//                         )}
//                         {value.static.percentage.length > 0 && (
//                           <div class="ModifierStaticPercentageBox flex flex-wrap gap-1">
//                             {value.static.percentage.map((mod: any, index: number) => (
//                               <div class={`key=${"ModifierStaticPercentage" + index} ModifierStaticPercentage group bg-transition-color-20 relative flex items-center gap-1 rounded-sm px-1 py-0.5`}>
//                                 <span class="modifierStaticClass">{mod.value}%</span>
//                                 <span class="originClass">来源：{mod.sourceId}</span>
//                               </div>
//                             ))}
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   )}

//                   {(value.dynamic.fixed.length > 0 || value.dynamic.percentage.length > 0) && (
//                     <div class="ModifierDynamicBox flex flex-1 items-center px-1">
//                       <span class="ModifierDynamicName text-accent-color-70 text-sm">动态修正值</span>
//                       <div class="ModifierDynamicContent flex flex-wrap gap-1 rounded-sm p-1 text-nowrap">
//                         {value.dynamic.fixed.length > 0 && (
//                           <div class="ModifierDynamicFixedBox flex flex-1 flex-wrap gap-1">
//                             {value.dynamic.fixed.map((mod: any, index: number) => (
//                               <div class={`key=${"ModifierDynamicFixed" + index} ModifierDynamicFixed group bg-transition-color-20 relative flex items-center gap-1 rounded-sm px-1 py-0.5`}>
//                                 <span class="modifierDynamicClass">{mod.value}</span>
//                                 <span class="originClass">来源：{mod.sourceId}</span>
//                               </div>
//                             ))}
//                           </div>
//                         )}
//                         {value.dynamic.percentage.length > 0 && (
//                           <div class="ModifierDynamicPercentageBox flex">
//                             {value.dynamic.percentage.map((mod: any, index: number) => (
//                               <div class={`key=${"ModifierDynamicPercentage" + index} ModifierDynamicPercentage group bg-transition-color-20 relative flex items-center gap-1 rounded-sm px-1 py-0.5`}>
//                                 <span class="modifierDynamicClass">{mod.value}%</span>
//                                 <span class="originClass">来源：{mod.sourceId}</span>
//                               </div>
//                             ))}
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>
//           ) : (
//             <div class="actualValueClass">{value.actValue}</div>
//           )}
//         </div>
//       );
//     }

//     // 字符串类型
//     return (
//       <div
//         class={`String bg-area-color flex w-full flex-none flex-col gap-1 rounded-sm p-1 lg:gap-4 ${!currentPath.includes(".") && "columnsWidth"}`}
//         style={indentStyle}
//       >
//         <div class="Key w-full p-1 text-sm font-bold">
//           {(displayData as string | number) ?? key}：
//         </div>
//         <div class="actualValueClass">{String(value)}</div>
//       </div>
//     );
//   };

//   return (
//     <div
//       ref={setParentRef}
//       class="RenderObject flex w-full flex-col gap-1"
//       style={{
//         height: '400px',
//         'overflow-y': 'auto',
//         'overflow-x': 'hidden'
//       }}
//     >
//       {(() => {
//         const v = virtualizer();
//         const items = virtualItems();

//         if (!v) {
//           return <div class="p-4">Loading virtualizer...</div>;
//         }

//         const renderedItems = v.getVirtualItems();
//         console.log('Render check:', {
//           virtualizerExists: !!v,
//           itemsLength: items.length,
//           virtualItemsLength: renderedItems.length,
//           totalSize: v.getTotalSize()
//         });

//         return (
//           <div
//             style={{
//               height: `${v.getTotalSize()}px`,
//               width: '100%',
//               position: 'relative',
//             }}
//           >
//             {renderedItems.map((virtualItem) => {
//               console.log('Rendering virtual item:', virtualItem);
//               const item = items[virtualItem.index];
//               if (!item) return null;

//               return (
//                 <div
//                   style={{
//                     position: 'absolute',
//                     top: 0,
//                     left: 0,
//                     width: '100%',
//                     height: `${virtualItem.size}px`,
//                     transform: `translateY(${virtualItem.start}px)`,
//                   }}
//                 >
//                   {renderVirtualItem(item)}
//                 </div>
//               );
//             })}
//           </div>
//         );
//       })()}
//     </div>
//   );
// };

export function MemberStatusPanel(props: { controllerId?: string; member: Accessor<MemberSerializeData | null> }) {
	const engine = useEngine();
	const pool = engine.realtimePool;

	const [liveAttrs, setLiveAttrs] = createSignal<object | undefined>(undefined);
	const [subViewId, setSubViewId] = createSignal<string | null>(null);

	const selectedMemberData = createMemo(() => {
		return liveAttrs() ?? props.member()?.attrs;
	});
	const [displayDetail, setDisplayDetail] = createSignal(false);
	const [activeTab, setActiveTab] = createSignal<"attrs" | "buffs">("attrs");

	const handleDebugViewFrame = (data: { workerId: string; event: unknown }) => {
		const currentViewId = subViewId();
		if (!currentViewId) return;
		const evt = data.event as { viewId?: unknown; data?: unknown };
		if (evt && evt.viewId === currentViewId && evt.data && typeof evt.data === "object") {
			setLiveAttrs(evt.data as object);
		}
	};

	createEffect(() => {
		pool.on("debug_view_frame", handleDebugViewFrame);
		onCleanup(() => {
			pool.off("debug_view_frame", handleDebugViewFrame);
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
				const cmd: DataQueryCommand = { type: "unsubscribe_debug_view", viewId: current };
				pool.executeTask("data_query", cmd, "low").catch(console.error);
				setSubViewId(null);
				setLiveAttrs(undefined);
			}
			return;
		}

		if (!current) {
			const cmd: DataQueryCommand = {
				type: "subscribe_debug_view",
				controllerId,
				memberId,
				viewType: "stat_container_export",
				hz: 10,
			};
			pool
				.executeTask("data_query", cmd, "low")
				.then((res) => {
					const task = res.data as { success?: boolean; data?: { viewId?: string }; error?: string } | undefined;
					if (res.success && task?.success && task.data?.viewId) {
						setSubViewId(task.data.viewId);
					} else {
						console.warn("订阅成员属性面板失败:", task?.error ?? res.error);
					}
				})
				.catch(console.error);
		}
	});

	onCleanup(() => {
		const current = subViewId();
		if (current) {
			const cmd: DataQueryCommand = { type: "unsubscribe_debug_view", viewId: current };
			pool.executeTask("data_query", cmd, "low").catch(console.error);
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
				{props.member()?.name || "未知成员"}
			</Button>

			<Dialog state={displayDetail()} setState={setDisplayDetail} title="成员详情">
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
								<StatsRenderer data={selectedMemberData()} />
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
