import { getPrimaryKeys } from "@db/generated/dmmf-utils";
import { type RepositoryReader, repositoryReaders } from "@db/generated/repositories";
import { type DB, DBSchema } from "@db/generated/zod/index";
import { MetaProvider, Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import { useMachine } from "@xstate/solid";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createSignal, For, onCleanup, onMount, Show, useContext } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { Filing } from "~/components/app/filing";
import { Button } from "~/components/ui/controls/button";
import { LoadingBar } from "~/components/ui/controls/loadingBar";
import { ObjRenderer } from "~/components/ui/dataDisplay/ObjRenderer";
import { Icons } from "~/components/ui/icons/index";
import { useDictionary } from "~/contexts/Dictionary";
import { MediaContext } from "~/contexts/Media";
import { type DialogLayerEntryInit, useOverlay } from "~/contexts/overlay/OverlayContext";
import { DATA_CONFIG, type TableDataConfig } from "~/dataConfig/data-config";
import type { ZodSchemaFor } from "~/lib/utils/zod";
import type { Dic, Dictionary } from "~/locales/type";
import { setStore, store } from "~/store";
import { indexPageMachine } from "./searchMachine";

export default function IndexPage() {
	const [searchButtonRef, setSearchButtonRef] = createSignal<HTMLButtonElement | undefined>(undefined);
	const [searchInputRef, setSearchInputRef] = createSignal<HTMLInputElement | undefined>(undefined);

	// 导航
	const navigate = useNavigate();
	// UI文本字典
	const dictionary = useDictionary();
	// 页面根作用域 overlay 句柄:搜索结果 dialog 从这里 openDialog 新建 layer。
	const overlay = useOverlay();
	// 媒体查询
	const media = useContext(MediaContext);

	// 使用状态机管理此页面状态
	const [state, send] = useMachine(indexPageMachine);
	const context = () => state.context;

	/**
	 * 构造搜索结果 dialog entry。render 在 dialog layer 作用域内执行:
	 * - 外键 drill → pushDialog 并入同层;editor → openSheet 新建子层。
	 * 首页搜索结果 dialog 在首页场景内创建,递归关联继续沿用当前语言字典。
	 */
	/**
	 * 搜索结果卡片所需的最小配置子集。
	 * 设计思路同 wiki/[subName].tsx 的 TableConfig：用单一泛型参数收拢各配置源，
	 * 避免 TS 在使用点把动态索引展开为 keyof DB 联合类型导致的 prop 不兼容错误。
	 */
	type SearchResultConfig<TTableName extends keyof DB, T extends DB[TTableName] = DB[TTableName]> = {
		tableName: TTableName;
		schema: ZodSchemaFor<T>;
		dic: Dic<T>;
		readers: RepositoryReader<TTableName>;
		UIConfig: TableDataConfig<TTableName, T>;
	};

	const buildSearchResultConfig = <TTableName extends keyof DB>(
		tableName: TTableName,
	): SearchResultConfig<TTableName> | undefined => {
		const UIConfig = DATA_CONFIG[tableName]?.(dictionary());
		if (!UIConfig) return undefined;
		// 同 createTableConfig：TypeScript 无法从动态索引自动证明各映射对象 K 相同，集中断言。
		return {
			tableName,
			schema: DBSchema[tableName],
			dic: dictionary().db[tableName],
			readers: repositoryReaders[tableName],
			UIConfig,
		} as SearchResultConfig<TTableName>;
	};

	/**
	 * 泛型子组件：在泛型上下文中使用 config 的各字段，
	 * TS 能从单一 TTableName 推断出所有 prop 类型一致，不会展开为联合类型。
	 * 对应 wiki/[subName].tsx 中的 CurrentVirtualTable 模式。
	 */
	const SearchResultCard = <TTableName extends keyof DB>(props: {
		id: string;
		config: SearchResultConfig<TTableName>;
	}) => (
		<ObjRenderer
			query={(db) => props.config.readers.get?.(db, props.id) ?? null}
			dataSchema={props.config.schema}
			dictionary={props.config.dic}
			hiddenFields={props.config.UIConfig.card.hiddenFields}
			fieldGroupMap={props.config.UIConfig.fieldGroupMap}
			renderers={props.config.UIConfig.card.renderers}
			after={props.config.UIConfig.card.after}
			before={props.config.UIConfig.card.before}
		/>
	);

	const buildSearchResultDialogEntry = (type: keyof DB, data: Record<string, unknown>): DialogLayerEntryInit => {
		const config = buildSearchResultConfig(type);
		const primaryKey = getPrimaryKeys(type)[0];

		if (!primaryKey)
			return {
				title: (data as { name?: unknown }).name?.toString() ?? "",
				titleIcon: () => <Icons.Spirits iconName={type} />,
				layout: "fill",
				render() {
					return <div>primary key is undefined</div>;
				},
			};

		const id = String(data[primaryKey]);

		return {
			title: (data as { name?: unknown }).name?.toString() ?? "",
			titleIcon: () => <Icons.Spirits iconName={type} />,
			layout: "fill",
			render: () => (config ? <SearchResultCard id={id} config={config} /> : <div>此表暂无 UI 配置</div>),
		};
	};

	/** 搜索结果点击入口:从页面根作用域新建 dialog layer。 */
	const openSearchResultCard = (type: keyof DB, data: Record<string, unknown>) => {
		overlay.openDialog(buildSearchResultDialogEntry(type, data));
	};

	// 事件分发函数，调用状态机处理事件
	const handleSearchInput = (e: Event & { target: HTMLInputElement }) => {
		send({ type: "SEARCH_INPUT_CHANGE", value: e.target.value });
	};
	const handleSearch = () => {
		send({ type: "SEARCH_SUBMIT" });
	};
	const handleToggleSearchResults = () => {
		send({ type: "TOGGLE_SEARCH_RESULTS" });
	};

	type CustomMenuConfig = {
		groupType: "wiki" | "appPages";
		title: keyof Dictionary["db"] | keyof Dictionary["ui"]["nav"];
		icon: keyof typeof Icons.Filled;
	};

	// 自定义首页导航配置
	const [customMenuConfig] = createSignal<{
		top: CustomMenuConfig[];
		all: CustomMenuConfig[];
	}>({
		top: [
			{
				groupType: "wiki",
				title: "mob",
				icon: "Browser",
			},
			{
				groupType: "wiki",
				title: "skill",
				icon: "Basketball",
			},
			{
				groupType: "wiki",
				title: "weapon",
				icon: "Category2",
			},
			{
				groupType: "wiki",
				title: "crystal",
				icon: "Box2",
			},
			{
				groupType: "wiki",
				title: "armor",
				icon: "User",
			},
			{
				groupType: "wiki",
				title: "option",
				icon: "Gamepad",
			},
		],
		all: [
			{
				groupType: "wiki",
				title: "mob",
				icon: "Browser",
			},
			{
				groupType: "wiki",
				title: "skill",
				icon: "Basketball",
			},
			{
				groupType: "wiki",
				title: "weapon",
				icon: "Category2",
			},
			{
				groupType: "wiki",
				title: "crystal",
				icon: "Box2",
			},
			{
				groupType: "wiki",
				title: "player_pet",
				icon: "Heart",
			},
			{
				groupType: "wiki",
				title: "item",
				icon: "Layers",
			},
			{
				groupType: "wiki",
				title: "armor",
				icon: "User",
			},
			{
				groupType: "appPages",
				title: "option",
				icon: "Gamepad",
			},
		],
	});

	// 问候语计算方法
	const getGreetings = () => {
		const now = new Date().getHours();
		if (now >= 13 && now < 18) {
			return dictionary().ui.index.goodAfternoon;
		} else if ((now >= 18 && now < 24) || now < 5) {
			return dictionary().ui.index.goodEvening;
		} else {
			return dictionary().ui.index.goodMorning;
		}
	};

	onMount(() => {
		// console.log("Index loaded");

		// 键盘事件
		const handleKeyPress = (e: KeyboardEvent) => {
			switch (e.key) {
				case "Enter":
					{
						if (document.activeElement === searchInputRef()) {
							searchButtonRef()?.click();
						}
					}
					break;
				case "Escape":
					{
						if (store.pages.settingsDialogState) {
							setStore("pages", "settingsDialogState", false);
							e.stopPropagation();
						} else if (document.activeElement === searchInputRef()) {
							searchInputRef()?.blur();
							e.stopPropagation();
						} else if (context().searchResultOpened) {
							handleToggleSearchResults();
							e.stopPropagation();
						}
						if (document.activeElement === searchInputRef()) {
							searchInputRef()?.blur();
						}
					}
					break;
				case "·":
				case "`":
					{
						if (document.activeElement !== searchInputRef()) {
							searchInputRef()?.focus();
							e.preventDefault(); // 阻止默认输入行为
						}
					}
					break;
				default:
					break;
			}
		};

		// 浏览器后退事件监听
		const handlePopState = (): void => {
			// 如果当前在搜索结果状态，后退时关闭搜索
			if (context().searchResultOpened) {
				send({ type: "TOGGLE_SEARCH_RESULTS" });
			}
		};

		// 监听绑带与清除
		document.addEventListener("keydown", handleKeyPress);

		window.addEventListener("popstate", handlePopState);

		onCleanup(() => {
			document.removeEventListener("keydown", handleKeyPress);
			window.removeEventListener("popstate", handlePopState);
		});
	});

	return (
		<MetaProvider>
			<Title>ToramCalculator 首页</Title>
			<Motion.div
				animate={{ opacity: [0, 1] }}
				transition={{
					duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0,
				}}
				class={`Client relative flex h-full w-full flex-col justify-between opacity-0`}
			>
				{/* 顶部返回入口 */}
				<div class="Config absolute top-6 left-6 z-10">
					<Button
						class="outline-hidden focus-within:outline-hidden"
						level="quaternary"
						onClick={() => navigate("/")}
						icon={<Icons.Outline.Home />}
						title="返回首页"
						aria-label="返回首页"
					/>
				</div>

				{/* 顶部 */}
				<div
					class={`Top flex flex-1 flex-col justify-center overflow-hidden ${context().searchResultOpened ? "p-3" : "p-6"} w-full landscape:mx-auto landscape:max-w-384 landscape:p-3`}
				>
					{/* 问候语 */}
					<Presence exitBeforeEnter>
						<Show when={!context().searchResultOpened}>
							<Motion.div
								animate={{
									opacity: [0, 1],
									paddingBottom: [
										0,
										media.orientation === "landscape" ? (media.width > 1024 ? "3rem" : "1rem") : "0rem",
									],
									height: ["0px", "120px"], // 临时数值
									filter: ["blur(20px)", "blur(0px)"],
								}}
								exit={{
									opacity: [1, 0],
									paddingBottom: 0,
									height: 0, // 临时数值
									filter: ["blur(0px)", "blur(20px)"],
								}}
								transition={{
									duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0,
								}}
								class={`Greetings grid flex-1 justify-items-center gap-2 overflow-hidden landscape:flex-none`}
							>
								<button
									class={`LogoBox mb-2 cursor-pointer self-end overflow-hidden rounded backdrop-blur-sm landscape:mb-0 dark:backdrop-blur-none`}
									onClick={() => setStore("pages", "loginDialogState", true)}
									type="button"
								>
									<Icons.Brand.LogoText class="h-12 landscape:h-auto" />
								</button>
								<h1 class={`text-main-text-color self-start py-4 landscape:hidden`}>
									{`${getGreetings()},  ${store.session.user?.name ?? dictionary().ui.index.adventurer}`}
								</h1>
							</Motion.div>
						</Show>
					</Presence>

					{/* 搜索功能区 */}
					<Motion.div
						animate={{
							filter: ["blur(20px)", "blur(0px)"],
						}}
						exit={{
							filter: ["blur(0px)", "blur(20px)"],
						}}
						transition={{
							duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0,
							delay: 0.3,
						}}
						class={`FunctionBox flex w-full flex-col justify-center landscape:flex-row landscape:justify-between`}
					>
						<div
							class={`BackButton m-0 hidden w-full flex-none self-start landscape:m-0 landscape:flex landscape:w-60 ${
								context().searchResultOpened
									? `pointer-events-auto mt-3 opacity-100`
									: `pointer-events-none -mt-12 opacity-0`
							}`}
						>
							<Button
								level="quaternary"
								onClick={handleToggleSearchResults}
								class="w-full outline-hidden focus-within:outline-hidden"
							>
								<Icons.Outline.Back />
								<span class="w-full text-left">{dictionary().ui.actions.back}</span>
							</Button>
						</div>
						<div
							class={`SearchBox border-b-none group border-dividing-color focus-within:border-accent-color hover:border-accent-color box-content flex w-full gap-1 p-0.5 duration-700! landscape:border-b-2 landscape:focus-within:px-4 landscape:hover:px-4 ${context().searchResultOpened ? `landscape:basis-full` : `landscape:basis-106.5`}`}
						>
							<input
								id="searchInput"
								ref={setSearchInputRef}
								type="text"
								placeholder={
									media.orientation === "landscape"
										? `${getGreetings()},${store.session.user?.name ?? dictionary().ui.index.adventurer}`
										: dictionary().ui.searchPlaceholder
								}
								value={context().searchInputValue}
								disabled={context().isSearching}
								onInput={handleSearchInput}
								class="focus:placeholder:text-transparent bg-area-color placeholder:text-boundary-color w-full flex-1 rounded px-4 py-2 text-lg font-bold mix-blend-multiply outline-hidden! placeholder:text-base placeholder:font-normal focus-within:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 landscape:flex landscape:bg-transparent dark:mix-blend-normal text-center"
							/>
							<Button
								ref={setSearchButtonRef}
								class="group-hover:text-accent-color landscape:bg-transparent"
								onClick={handleSearch}
							>
								<Icons.Outline.Search />
							</Button>
						</div>
						<div class="hidden w-60 flex-none landscape:flex"></div>
					</Motion.div>

					{/* 搜索结果 */}
					<Presence exitBeforeEnter>
						<Show when={context().searchResultOpened}>
							<Motion.div
								animate={{
									clipPath: ["inset(10% 10% 90% 10% round 12px)", "inset(0% 0% 0% 0% round 12px)"],
									opacity: [0, 1],
									flexBasis: ["0%", "100%"],
									flexGrow: [0, 1],
								}}
								exit={{
									clipPath: [
										"inset(0% 0% 0% 0% round 12px)",
										media.orientation === "landscape"
											? "inset(30% 20% 70% 20% round 12px)"
											: "inset(10% 10% 90% 10% round 12px)",
									],
									opacity: [1, 0],
									flexBasis: ["100%", "0%"],
									flexGrow: [1, 0],
								}}
								transition={{
									duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0,
								}}
								class={`Result mt-1 flex h-full gap-1 overflow-y-hidden`}
							>
								<Show
									when={!context().isSearching}
									fallback={
										<Motion.div class="flex flex-1 flex-col items-center justify-center gap-4">
											<LoadingBar class="w-1/2 min-w-[320px]" />
											<span class="text-lg font-bold">{dictionary().ui.actions.searching}</span>
										</Motion.div>
									}
								>
									<Show
										when={!context().isNullResult}
										fallback={
											<Motion.div
												class={`NullResult flex flex-1 flex-col gap-12 p-6 landscape:p-0`}
												animate={{
													opacity: [0, 1],
													marginTop: ["0", "calc(50vh - 54px)"],
													transform: ["translateY(0) scale(0.8)", "translateY(-50%) scale(1)"],
												}}
												transition={{
													duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0,
												}}
											>
												<span class="NullResultWarring text-center text-xl leading-loose font-bold landscape:text-2xl">
													{dictionary().ui.index.nullSearchResultWarring}
												</span>
												<p class={`NullResultTips text-main-text-color text-center leading-loose`}>
													{dictionary()
														.ui.index.nullSearchResultTips.split("\n")
														.map((line) => (
															<span>
																{line}
																<br />
															</span>
														))}
												</p>
											</Motion.div>
										}
									>
										<div
											class={`ResultContent bg-area-color flex h-full flex-1 flex-col gap-2 rounded p-2 backdrop-blur-md`}
										>
											<OverlayScrollbarsComponent
												element="div"
												class="w-full"
												options={{ scrollbars: { autoHide: "scroll" } }}
												defer
											>
												<div class="ResultGroupContainer flex w-full flex-col gap-1">
													<For each={Object.entries(context().searchResult)}>
														{([key, groupResultValue], groupIndex) => {
															const groupType = key as keyof DB;

															return (
																<Show when={groupResultValue.length > 0}>
																	<div class={`ResultGroup flex flex-col gap-0.5`}>
																		<Motion.button
																			onClick={() => {
																				const newResultListState = [...context().resultListState];
																				newResultListState[groupIndex()] = !newResultListState[groupIndex()];
																				send({
																					type: "UPDATE_RESULT_LIST_STATE",
																					resultListState: newResultListState,
																				});
																			}}
																			class={`Group bg-primary-color flex cursor-pointer justify-center gap-2 outline-hidden focus-within:outline-hidden ${context().resultListState[groupIndex()] ? "" : ""} rounded px-3 py-4`}
																			animate={{
																				opacity: [0, 1],
																				transform: ["translateY(30px)", "translateY(0)"],
																			}}
																			transition={{
																				duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0,
																				delay: store.settings.userInterface.isAnimationEnabled ? groupIndex() * 0.1 : 0,
																			}}
																		>
																			<Icons.Outline.Basketball />
																			<span class="w-full text-left font-bold">
																				{dictionary().db[groupType].selfName} [{groupResultValue.length}]
																			</span>
																			{context().resultListState[groupIndex()] ? (
																				<Icons.Outline.Left class="rotate-360" />
																			) : (
																				<Icons.Outline.Left class="rotate-270" />
																			)}
																		</Motion.button>
																		<div class="Content flex flex-col gap-1">
																			<For each={groupResultValue}>
																				{(resultItem, index) => {
																					return (
																						<Motion.button
																							class={`Item group flex flex-col gap-1 ${context().resultListState[groupIndex()] ? "" : "hidden"} bg-primary-color focus-within:bg-area-color rounded p-3 outline-hidden focus-within:outline-hidden`}
																							animate={{
																								opacity: [0, 1],
																								transform: ["translateY(30px)", "translateY(0)"],
																							}}
																							transition={{
																								duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0,
																								delay: store.settings.userInterface.isAnimationEnabled
																									? index() < 15
																										? groupIndex() * 0.1 + index() * 0.07
																										: 0
																									: 0,
																							}}
																							onClick={async () => {
																								// 设置卡片类型和ID
																								if ("id" in resultItem) {
																									openSearchResultCard(
																										groupType,
																										resultItem as Record<string, unknown>,
																									);
																								}
																							}}
																						>
																							<div class="Name group-hover:border-accent-color border-b-2 border-transparent p-1 text-left">
																								{"name" in resultItem ? resultItem.name : "此条目没有名称"}
																							</div>
																						</Motion.button>
																					);
																				}}
																			</For>
																		</div>
																	</div>
																</Show>
															);
														}}
													</For>
												</div>
											</OverlayScrollbarsComponent>
										</div>
									</Show>
								</Show>
							</Motion.div>
						</Show>
					</Presence>
				</div>

				{/* Bottom */}
				<Presence exitBeforeEnter>
					<Show when={!context().searchResultOpened}>
						<Motion.div
							animate={{
								opacity: [0, 1],
								gridTemplateRows: ["0fr", "1fr"],
								paddingBlockStart: [
									"0rem",
									media.orientation === "landscape" ? (media.width > 1024 ? "5rem" : "2.5rem") : "2.75rem",
								],
								paddingBlockEnd: [
									"0rem",
									media.orientation === "landscape" ? (media.width > 1024 ? "5rem" : "2.5rem") : "1.5rem",
								],
								filter: ["blur(20px)", "blur(0px)"],
							}}
							exit={{
								opacity: [1, 0],
								gridTemplateRows: ["1fr", "0fr"],
								paddingBlock: "0rem",
								filter: ["blur(0px)", "blur(20px)"],
							}}
							transition={{
								duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0,
							}}
							class={`Bottom bg-accent-color portrait:dark:bg-area-color grid w-full shrink-0 self-center px-6 portrait:rounded-t-[24px] landscape:grid landscape:w-fit landscape:bg-transparent`}
						>
							<div class="Btn bg-primary-color absolute top-3 left-1/2 h-2 w-24 -translate-x-1/2 rounded-full landscape:hidden"></div>
							<Motion.div
								class={`Content landscape:bg-area-color flex flex-wrap gap-3 overflow-hidden rounded landscape:flex-1 landscape:justify-center landscape:px-3 landscape:backdrop-blur-sm`}
								animate={{
									paddingBlock: ["0rem", media.orientation === "landscape" ? "0.75rem" : "0"],
								}}
								exit={{
									paddingBlock: "0rem",
								}}
								transition={{
									duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0,
								}}
							>
								<For each={customMenuConfig().top}>
									{(menuItem, index) => {
										const IconComponent = Icons.Filled[menuItem.icon];
										const brandColor = {
											1: "1st",
											2: "2nd",
											3: "3rd",
										}[1 + (index() % 3)];

										return (
											<Presence exitBeforeEnter>
												<Show when={!context().searchResultOpened}>
													<Motion.a
														href={menuItem.groupType === "wiki" ? `/wiki/${menuItem.title}` : menuItem.title}
														class={`flex-none basis-[calc(33.33%-8px)] overflow-hidden rounded landscape:basis-auto`}
														animate={{
															opacity: [0, 1],
															transform: ["scale(0.1)", "scale(1)"],
														}}
														exit={{
															opacity: [1, 0],
															transform: ["scale(1)", "scale(0.1)"],
														}}
														transition={{
															duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0,
															delay: index() * 0.05,
														}}
													>
														<Button
															class="group bg-primary-color-10 dark:bg-primary-color dark:text-accent-color landscape:bg-accent-color w-full flex-col landscape:w-fit landscape:flex-row"
															level="primary"
														>
															<IconComponent
																class={`text-brand-color-${brandColor} group-hover:text-primary-color dark:group-hover:text-accent-color h-10 w-10 landscape:h-6 landscape:w-6`}
															/>
															<span class="text-sm text-nowrap text-ellipsis landscape:hidden landscape:text-xl lg:landscape:block">
																{menuItem.groupType === "wiki"
																	? dictionary().db[menuItem.title as keyof DB].selfName
																	: dictionary().ui.nav[menuItem.title as keyof Dictionary["ui"]["nav"]]}
															</span>
														</Button>
													</Motion.a>
												</Show>
											</Presence>
										);
									}}
								</For>
							</Motion.div>
						</Motion.div>
					</Show>
				</Presence>
			</Motion.div>
			<Filing />
		</MetaProvider>
	);
}
