import { assign, createMachine, fromPromise } from "xstate";

// 定义状态机的上下文类型 - 存储所有状态数据
export interface IndexPageContext {
	// 搜索相关状态
	searchInputValue: string; // 搜索输入框的值
	searchResult: Record<
		string,
		{
			id: string;
			name: string;
			[key: string]: unknown;
		}[]
	>; // 搜索结果，按数据类型分组
	isSearching: boolean; // 是否正在搜索中
	isNullResult: boolean; // 搜索结果是否为空
	resultListState: boolean[]; // 每个结果组的展开/折叠状态

	// UI 状态
	searchResultOpened: boolean; // 是否显示搜索结果面板
	toolMenuIsOpen: boolean; // 小工具菜单是否打开

	// 动画相关状态
	isAnimationEnabled: boolean; // 是否启用动画效果

	// 错误状态
	error: string | null; // 错误信息
}

export type IndexPageEvent =
	| { type: "SEARCH_INPUT_CHANGE"; value: string } // 搜索输入变化
	| { type: "SEARCH_SUBMIT" } // 提交搜索
	| { type: "SEARCH_CLEAR" } // 清除搜索
	| { type: "TOGGLE_SEARCH_RESULTS" } // 切换搜索结果显示
	| { type: "UPDATE_RESULT_LIST_STATE"; resultListState: boolean[] } // 更新结果列表状态
	| { type: "TOGGLE_TOOL_MENU" } // 切换小工具菜单显示
	| { type: "TOGGLE_ANIMATION" } // 切换动画开关
	| { type: "RESET" }; // 重置所有状态

export const indexPageMachine = createMachine(
	{
		id: "indexPage", // 状态机标识
		initial: "idle", // 初始状态为 'idle'

		// 初始上下文数据 - 状态机启动时的默认值
		context: {
			searchInputValue: "",
			searchResult: {},
			isSearching: false,
			isNullResult: true,
			resultListState: [],
			searchResultOpened: false,
			toolMenuIsOpen: false,
			isAnimationEnabled: true,
			error: null,
		} as IndexPageContext,

		// 定义所有可能的状态
		states: {
			/**
			 * 空闲状态 - 页面初始加载完成，等待用户操作
			 *
			 * 在这个状态下：
			 * - 用户可以输入搜索内容
			 * - 可以打开登录对话框
			 * - 可以切换动画设置
			 * - 不能进行搜索（因为输入为空）
			 */
			idle: {
				// on: 定义这个状态可以响应的事件
				on: {
					// 搜索输入变化事件
					SEARCH_INPUT_CHANGE: {
						// actions: 事件触发时执行的动作
						actions: assign({
							// assign 用于更新 context 中的数据
							// ({ event }) 是 XState v5 的新语法，解构事件对象
							searchInputValue: ({ event }) => {
								if (event.type === "SEARCH_INPUT_CHANGE") {
									return event.value;
								}
								return "";
							},
						}),
					},

					// 提交搜索事件
					SEARCH_SUBMIT: {
						// guard: 守卫条件，只有满足条件才会执行转换
						guard: ({ context }) => context.searchInputValue.trim().length > 0,
						// target: 转换到的目标状态
						target: "searching",
					},
				},
			},

			/**
			 * 搜索中状态 - 正在执行搜索操作
			 *
			 * 这是一个临时状态，搜索完成后会转换到其他状态
			 * 在这个状态下：
			 * - 显示加载动画
			 * - 禁用搜索按钮
			 * - 可以取消搜索
			 */
			searching: {
				// entry: 进入状态时执行的动作
				entry: assign({
					isSearching: true,
					isNullResult: true,
					error: null,
				}),

				// invoke: 调用异步服务（如 API 请求）
				invoke: {
					src: "performSearch", // 服务名称，在 actors 中定义
					// input: 传递给服务的参数
					input: ({ context }) => ({ searchValue: context.searchInputValue }),

					// onDone: 服务成功完成时的处理
					onDone: {
						target: "searchResults", // 转换到搜索结果状态
						actions: assign({
							// 更新搜索结果
							searchResult: ({ event }) => event.output.result,
							isSearching: false,
							isNullResult: ({ event }) => event.output.isNullResult,
							resultListState: ({ event }) => event.output.resultListState,
							searchResultOpened: true,
						}),
					},

					// onError: 服务失败时的处理
					onError: {
						target: "searchError", // 转换到错误状态
						actions: assign({
							error: ({ event }) => {
								if (event.error instanceof Error) {
									return event.error.message;
								}
								return String(event.error);
							},
							isSearching: false,
						}),
					},
				},

				// 在搜索过程中可以响应的事件
				on: {
					// 清除搜索事件
					SEARCH_CLEAR: {
						target: "idle", // 直接回到空闲状态
						actions: assign({
							// 重置所有搜索相关状态
							searchInputValue: "",
							searchResult: {},
							isSearching: false,
							isNullResult: true,
							resultListState: [],
							searchResultOpened: false,
							error: null,
						}),
					},
				},
			},

			/**
			 * 搜索结果状态 - 显示搜索结果
			 *
			 * 这是最复杂的状态，包含：
			 * - 搜索结果的展示
			 * - 历史记录管理
			 * - 结果列表的展开/折叠
			 */
			searchResults: {
				// entry: 进入状态时执行的动作（数组形式，可以执行多个动作）
				entry: [
					// 添加历史记录，这样后退时能关闭搜索
					() => {
						if (typeof window !== "undefined") {
							// pushState 添加一条历史记录，不会改变 URL
							history.pushState({ popup: true }, "");
						}
					},
				],

				// 在这个状态下可以响应的事件
				on: {
					// 搜索输入变化 - 允许用户修改搜索内容
					SEARCH_INPUT_CHANGE: {
						actions: assign({
							searchInputValue: ({ event }) => {
								if (event.type === "SEARCH_INPUT_CHANGE") {
									return event.value;
								}
								return "";
							},
						}),
					},

					// 提交新的搜索
					SEARCH_SUBMIT: {
						guard: ({ context }) => context.searchInputValue.trim().length > 0,
						target: "searching", // 重新开始搜索
					},

					// 切换搜索结果显示（关闭搜索）
					TOGGLE_SEARCH_RESULTS: {
						target: "idle", // 回到空闲状态
						actions: [
							assign({
								searchResultOpened: false,
							}),
							// 移除历史记录
							() => {
								if (typeof window !== "undefined") {
									// replaceState 替换当前历史记录，不会添加新记录
									history.replaceState(null, "", location.href);
								}
							},
						],
					},

					// 更新结果列表的展开/折叠状态
					UPDATE_RESULT_LIST_STATE: {
						actions: assign({
							resultListState: ({ event }) => {
								if (event.type === "UPDATE_RESULT_LIST_STATE") {
									return event.resultListState;
								}
								return [];
							},
						}),
					},

					// 清除搜索
					SEARCH_CLEAR: {
						target: "idle",
						actions: [
							assign({
								// 重置所有状态
								searchInputValue: "",
								searchResult: {},
								isSearching: false,
								isNullResult: true,
								resultListState: [],
								searchResultOpened: false,
								error: null,
							}),
							// 移除历史记录
							() => {
								if (typeof window !== "undefined") {
									history.replaceState(null, "", location.href);
								}
							},
						],
					},
				},
			},

			/**
			 * 搜索错误状态 - 搜索失败时的状态
			 *
			 * 在这个状态下：
			 * - 显示错误信息
			 * - 允许用户重新搜索
			 * - 允许清除搜索
			 */
			searchError: {
				on: {
					// 搜索输入变化 - 清除错误信息
					SEARCH_INPUT_CHANGE: {
						actions: assign({
							searchInputValue: ({ event }) => {
								if (event.type === "SEARCH_INPUT_CHANGE") {
									return event.value;
								}
								return "";
							},
							error: null, // 清除错误信息
						}),
					},

					// 重新提交搜索
					SEARCH_SUBMIT: {
						guard: ({ context }) => context.searchInputValue.trim().length > 0,
						target: "searching",
					},

					// 清除搜索
					SEARCH_CLEAR: {
						target: "idle",
						actions: assign({
							searchInputValue: "",
							searchResult: {},
							isSearching: false,
							isNullResult: true,
							resultListState: [],
							searchResultOpened: false,
							error: null,
						}),
					},

					// 重置所有状态
					RESET: {
						target: "idle",
					},
				},
			},
		},

		/**
		 * 全局事件处理器 - 所有状态都能响应的事件
		 *
		 * 这些事件不依赖于当前状态，可以在任何时候触发
		 */
		on: {
			// 切换小工具菜单显示状态
			TOGGLE_TOOL_MENU: {
				actions: assign({
					toolMenuIsOpen: ({ context }) => !context.toolMenuIsOpen,
				}),
			},

			// 切换动画设置
			TOGGLE_ANIMATION: {
				actions: assign({
					isAnimationEnabled: ({ context }) => !context.isAnimationEnabled,
				}),
			},
		},
	},
	{
		/**
		 * actors: 定义异步服务
		 *
		 * actors 是状态机中处理异步操作的方式，比如：
		 * - API 调用
		 * - 定时器
		 * - WebSocket 连接
		 * - 文件操作
		 */
		actors: {
			// 执行搜索的异步服务
			performSearch: fromPromise(async ({ input }: { input: { searchValue: string } }) => {
				const serviceStartTime = performance.now();
				console.log(`🚀 [状态机] 开始执行搜索服务，关键词: "${input.searchValue}"`);

				// 动态导入性能分析
				const importStartTime = performance.now();
				const { searchAllTables } = await import("./search");
				const importTime = performance.now() - importStartTime;
				console.log(`📦 [状态机] 动态导入耗时: ${importTime.toFixed(2)}ms`);

				// 输入验证
				if (!input.searchValue || input.searchValue.trim() === "") {
					console.log(`⚠️ [状态机] 搜索关键词为空，跳过搜索`);
					return {
						result: {},
						isNullResult: true,
						resultListState: [],
					};
				}

				try {
					// 执行实际的搜索
					const searchStartTime = performance.now();
					console.log(`🔍 [状态机] 开始调用 searchAllTables`);
					const finalResult = await searchAllTables(input.searchValue);
					const searchTime = performance.now() - searchStartTime;
					console.log(`✅ [状态机] searchAllTables 执行完成，耗时: ${searchTime.toFixed(2)}ms`);

					// 结果处理性能分析
					const processStartTime = performance.now();

					// 进入展示前剔除空组，保证列表状态和动画延迟只基于实际可见内容
					const filteredResult = Object.entries(finalResult).reduce<IndexPageContext["searchResult"]>(
						(acc, [key, groupResult]) => {
							if (groupResult.length > 0) {
								acc[key] = groupResult as IndexPageContext["searchResult"][string];
							}
							return acc;
						},
						{},
					);
					const isNullResult = Object.keys(filteredResult).length === 0;
					const resultListState = Object.keys(filteredResult).map(() => true);

					const processTime = performance.now() - processStartTime;
					console.log(`⚙️ [状态机] 结果处理耗时: ${processTime.toFixed(2)}ms`);

					const totalServiceTime = performance.now() - serviceStartTime;
					console.log(
						`🎯 [状态机] 搜索服务总耗时: ${totalServiceTime.toFixed(2)}ms (导入: ${importTime.toFixed(2)}ms, 搜索: ${searchTime.toFixed(2)}ms, 处理: ${processTime.toFixed(2)}ms)`,
					);

					// 返回搜索结果
					return {
						result: filteredResult,
						isNullResult,
						resultListState,
					};
				} catch (error) {
					const errorTime = performance.now() - serviceStartTime;
					console.error(`❌ [状态机] 搜索服务出错，总耗时: ${errorTime.toFixed(2)}ms`, error);
					// 抛出错误，会被 onError 处理器捕获
					throw new Error(error instanceof Error ? error.message : "搜索失败");
				}
			}),
		},
	},
);

// 导出状态机的类型，用于 TypeScript 类型检查
export type IndexPageState = typeof indexPageMachine;
