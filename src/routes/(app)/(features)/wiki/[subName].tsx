import { defaultData } from "@db/defaultData";
import type { DB } from "@db/generated/zod/index";
import { A, useNavigate, useParams, useSearchParams } from "@solidjs/router";
import {
	createEffect,
	createMemo,
	createSignal,
	For,
	type JSX,
	on,
	onCleanup,
	onMount,
	Show,
	useContext,
} from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { Button } from "~/components/ui/controls/button";
import { LoadingBar } from "~/components/ui/controls/loadingBar";
import { ObjRenderer } from "~/components/ui/dataDisplay/ObjRenderer";
import { VirtualTable } from "~/components/ui/dataDisplay/virtualTable";
import { Icons } from "~/components/ui/icons/index";
import { useDictionary } from "~/contexts/Dictionary";
import { MediaContext } from "~/contexts/Media";
import { useOverlay } from "~/contexts/overlay/OverlayContext";
import { buildFKCardRenderers, ReferencedBySection } from "~/features/wiki/fkRenderers";
import { setWikiStore, wikiStore } from "~/features/wiki/store";
import { createTableConfig, getTablePrimaryKey, type TableConfig } from "~/features/wiki/tableConfig";
import { createOpenRelatedCard } from "~/features/wiki/wikiCardNav";
import { createOpenRecordForm } from "~/features/wiki/wikiFormSheet";
import { wikiPageConfig } from "~/features/wiki/wikiPage/wikiPageConfig";
import { store } from "~/store";

export default function WikiSubPage() {
	const media = useContext(MediaContext);
	const dictionary = useDictionary();
	// 页面根作用域的 overlay 句柄:列表点击从这里 openDialog 新建 dialog layer。
	const overlay = useOverlay();
	const openRelatedCard = createOpenRelatedCard(dictionary);
	const openRecordForm = createOpenRecordForm(dictionary, openRelatedCard);
	// url 参数
	const params = useParams();
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();

	// 状态管理参数
	const [isMainContentFullscreen, setIsMainContentFullscreen] = createSignal(true);
	const [activeBannerIndex, setActiveBannerIndex] = createSignal(0);

	const currentTableConfig = createMemo(() => createTableConfig(wikiStore.type, dictionary()));

	/** 列表点击入口:从页面根作用域新建一个 dialog layer。 */
	const openCurrentTableCard = <TTableName extends keyof DB>(
		type: TTableName,
		data: DB[TTableName],
		tableConfig: TableConfig<TTableName>,
	) => {
		overlay.openDialog({
			title: "name" in data ? String(data.name) : "",
			titleIcon: () => <Icons.Spirits iconName={type} />,
			layout: "fill",
			render: () => {
				// 编辑 sheet 必须挂在当前 dialog layer 下，不能使用页面根层的 overlay 句柄。
				const dialogOverlay = useOverlay();
				const primaryKey = getTablePrimaryKey(type);
				const primaryKeyValue = data[primaryKey];
				const primaryKeyString = primaryKeyValue == null ? "" : String(primaryKeyValue);

				// FK列自动检测（跳过 hiddenFields 里的列）
				const fkCardRenderers = buildFKCardRenderers(
					type,
					tableConfig.UIConfig.card.hiddenFields ?? [],
					dictionary(),
					(relatedTable, id) => openRelatedCard(relatedTable, id, dialogOverlay),
				);

				return (
					<ObjRenderer
						query={(db) => {
							if (!primaryKeyString) return null;
							return tableConfig.readers.get?.(db, primaryKeyString) ?? null;
						}}
						dataSchema={tableConfig.schema}
						dictionary={tableConfig.dic}
						hiddenFields={tableConfig.UIConfig.card.hiddenFields}
						fieldGroupMap={tableConfig.UIConfig.fieldGroupMap}
						renderers={{
							fields: {
								...fkCardRenderers.fields,
								...tableConfig.UIConfig.card.renderers?.fields,
							},
							containers: tableConfig.UIConfig.card.renderers?.containers,
						}}
						// 卡片操作属于页面 DOM 编排层，ObjRenderer 只负责数据内容展示。
						after={(currentData) => (
							<>
								{/* 被引用方关联记录区块（来自 data-config 显式声明） */}
								<ReferencedBySection
									tableName={type}
									referencedBy={tableConfig.UIConfig.card.referencedBy}
									data={currentData}
									dictionary={dictionary()}
									onOpenCard={(relatedTable, rowData) => {
										const pk = getTablePrimaryKey(relatedTable);
										const id = String(rowData[pk as keyof typeof rowData] ?? "");
										if (id) openRelatedCard(relatedTable, id, dialogOverlay);
									}}
								/>
								<div class="CardActions border-dividing-color flex flex-wrap items-center gap-2 border-t pt-3">
									<Show when={primaryKeyString}>
										<Button
											icon={<Icons.Outline.Edit />}
											// 表单 sheet 必须挂在当前 dialog layer 下（关掉卡片会级联关掉表单），
											// 所以传 dialogOverlay 而非页面根层句柄。
											onClick={() =>
												openRecordForm({ mode: "update", tableName: type, id: primaryKeyString }, dialogOverlay, "open")
											}
										>
											{dictionary().ui.actions.modify}
										</Button>
									</Show>
								</div>
							</>
						)}
					/>
				);
			},
		});
	};

	/** 顶栏/控制栏的新建入口:从页面根作用域新建一个 sheet layer。 */
	const openCreateForm = <TTableName extends keyof DB>(tableConfig: TableConfig<TTableName>) => {
		openRecordForm({ mode: "create", tableName: tableConfig.tableName }, overlay, "open");
	};

	/**
	 * 设计思路：VirtualTable 需要同一个 T 同时约束主键、列配置、字典和点击数据。
	 * 函数职责：在泛型组件体内消费已绑定的 TableConfig，避免 keyof DB 联合类型让 keyof T 收缩成 never。
	 */
	const CurrentVirtualTable = <TTableName extends keyof DB>(props: {
		tableName: TTableName;
		tableConfig: TableConfig<TTableName>;
	}) => {
		return (
			<VirtualTable<DB[TTableName]>
				measure={props.tableConfig.UIConfig.table.measure}
				query={(db) => props.tableConfig.readers.getAll?.(db) ?? null}
				primaryKey={getTablePrimaryKey(props.tableName)}
				columnsDef={props.tableConfig.UIConfig.table.columnsDef}
				hiddenColumnDef={props.tableConfig.UIConfig.table.hiddenColumnDef}
				tdGenerator={props.tableConfig.UIConfig.table.tdGenerator}
				defaultSort={props.tableConfig.UIConfig.table.defaultSort}
				dictionary={props.tableConfig.dic}
				globalFilterStr={() => wikiStore.table.globalFilterStr}
				rowHandleClick={(data) => openCurrentTableCard(props.tableName, data, props.tableConfig)}
				columnVisibility={wikiStore.table.columnVisibility}
				onColumnVisibilityChange={(updater) => {
					if (typeof updater === "function") {
						setWikiStore("table", {
							columnVisibility: updater(wikiStore.table.columnVisibility),
						});
					}
				}}
			/>
		);
	};

	const openTableConfigDialog = () => {
		overlay.openDialog({
			title: dictionary().ui.wiki.tableConfig.title,
			render: () => <div class="flex h-52 w-2xs flex-col gap-3"></div>,
		});
	};

	const openWikiSelectorDialog = () => {
		overlay.openDialog({
			title: dictionary().ui.wiki.selector.title,
			render: (api) => (
				<div class="flex flex-col gap-3">
					<For each={wikiSelectorConfig}>
						{(group) => {
							return (
								<div class="Group flex flex-col gap-2">
									<div class="GroupTitle flex flex-col gap-3">
										<h3 class="text-accent-color flex items-center gap-2 font-bold">
											{group.groupName}
											<div class="Divider bg-dividing-color h-px w-full flex-1" />
										</h3>
									</div>
									<div class="GroupContent flex flex-wrap gap-2">
										<For each={group.groupFields}>
											{(field) => {
												return (
													<A
														href={`/wiki/${field.name}`}
														onClick={api.close}
														class="bg-area-color hover:shadow-card shadow-dividing-color flex lg:w-[calc((100%-2rem)/5)] w-[calc((100%-1rem)/3)] flex-col items-center gap-2 rounded px-2 lg:py-6 py-3"
													>
														{field.icon}
														<span class="text-nowrap text-ellipsis">{dictionary().db[field.name].selfName}</span>
													</A>
												);
											}}
										</For>
									</div>
								</div>
							);
						}}
					</For>
				</div>
			),
		});
	};

	// 监听url参数变化, 初始化页面状态
	createEffect(
		on(
			() => params.subName,
			() => {
				console.log("Url参数：", params.subName);
				if (params.subName && params.subName in defaultData) {
					const tabkeName = params.subName as keyof DB;
					// 重置页面状态
					setWikiStore("type", tabkeName);
					// 重置表状态，避免旧表的过滤/列可见性泄漏到新表；过滤值从 URL ?q= 读取，
					// 支持分享已过滤的视图，切表时由于导航链接不带 ?q= 所以自然归零。
					setWikiStore("table", {
						globalFilterStr: typeof searchParams.q === "string" ? searchParams.q : "",
						columnVisibility: {},
						configSheetIsOpen: false,
					});
					setIsMainContentFullscreen(true);
					setActiveBannerIndex(0);
				} else {
					navigate(`/404`);
				}
				// console.log("Effect end", performance.now() - start);
			},
		),
	);

	// 同步过滤值到 URL：globalFilterStr 变化时写入 ?q= 参数，使过滤后的视图可分享。
	createEffect(() => {
		const q = wikiStore.table.globalFilterStr;
		setSearchParams({ q: q || undefined });
	});

	// wiki 选择器(弹出层)配置
	const wikiSelectorConfig: {
		groupName: string;
		groupFields: {
			name: keyof DB;
			icon: JSX.Element;
		}[];
	}[] = [
		{
			groupName: dictionary().ui.wiki.selector.groupName.combat,
			groupFields: [
				{
					name: "mob",
					icon: <Icons.Filled.Browser />,
				},
				{
					name: "skill",
					icon: <Icons.Filled.Basketball />,
				},
				{
					name: "weapon",
					icon: <Icons.Filled.Box2 />,
				},
				{
					name: "armor",
					icon: <Icons.Filled.Category2 />,
				},
				{
					name: "option",
					icon: <Icons.Filled.Layers />,
				},
				{
					name: "special",
					icon: <Icons.Filled.Layers />,
				},
				{
					name: "crystal",
					icon: <Icons.Filled.Layers />,
				},
			],
		},
		{
			groupName: dictionary().ui.wiki.selector.groupName.daily,
			groupFields: [
				{
					name: "address",
					icon: <Icons.Filled.Layers />,
				},
				{
					name: "zone",
					icon: <Icons.Filled.Layers />,
				},
				{
					name: "npc",
					icon: <Icons.Filled.Layers />,
				},
				{
					name: "consumable",
					icon: <Icons.Filled.Layers />,
				},
				{
					name: "material",
					icon: <Icons.Filled.Layers />,
				},
				{
					name: "task",
					icon: <Icons.Filled.Layers />,
				},
				{
					name: "activity",
					icon: <Icons.Filled.Layers />,
				},
			],
		},
	];

	onMount(() => {
		console.log(`--Wiki Page Mount`);
	});

	onCleanup(() => {
		console.log(`--Wiki Page Unmount`);
	});

	return (
		<Show when={currentTableConfig()} fallback={<p>Current Table UI Config is Undefined</p>}>
			{(validCurrentTableConfig) => {
				// console.log("syncState", JSON.stringify(store.database.hasInitialSnapshot, null, 2), "wikiStore.type", JSON.stringify(wikiStore.type), "validDataConfig", validDataConfig());
				return (
					<Show
						when={store.database.hasInitialSnapshot[wikiStore.type]}
						fallback={
							<Motion.div
								animate={{ opacity: [0, 1] }}
								exit={{ opacity: 0 }}
								transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
								class="LoadingState flex h-full w-full flex-col items-center justify-center gap-3"
							>
								<LoadingBar class="w-1/2 min-w-[320px]" />
								<h1 class="animate-pulse">awaiting DB-{wikiStore.type} sync...</h1>
							</Motion.div>
						}
					>
						{/* 标题 */}
						<Motion.div
							class={`Title portrait:flex flex-col ${isMainContentFullscreen() ? "landscape:hidden" : "landscape:flex"} landscape:p-3 lg:landscape:pt-12`}
							animate={{ opacity: [0, 1] }}
							exit={{ opacity: 0 }}
							transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
						>
							<div class="Content flex flex-row items-center justify-between gap-4 px-6 py-0 lg:px-0 lg:py-3">
								<h1 class="Text flex cursor-pointer items-center gap-3 text-left text-2xl font-black lg:bg-transparent lg:text-[2.5rem] lg:leading-12 lg:font-normal">
									{dictionary().db[wikiStore.type].selfName}
								</h1>
								<input
									id="DataSearchBox"
									type="search"
									placeholder={dictionary().ui.searchPlaceholder}
									class="border-b-boundary-color placeholder:text-dividing-color hover:border-main-text-color focus:border-main-text-color hidden h12.5 w-full flex-1 rounded-none border-b bg-transparent px-3 py-2 backdrop-blur-xl focus:outline-hidden lg:block lg:h-12 lg:flex-1 lg:px-5 lg:font-normal"
									onInput={(e) => {
										setWikiStore("table", {
											globalFilterStr: e.target.value,
										});
									}}
								/>
								<div class="FunctionGroup flex">
									<Show when={store.session.user?.id}>
										<Button // 仅移动端显示
											size="sm"
											icon={<Icons.Outline.CloudUpload />}
											class="flex bg-transparent lg:hidden"
											onClick={() => openCreateForm(validCurrentTableConfig())}
										></Button>
									</Show>
									<Button // 仅移动端显示
										size="sm"
										icon={<Icons.Outline.InfoCircle />}
										class="flex bg-transparent lg:hidden"
										onClick={() => {}}
									></Button>
									<Show when={store.session.user?.id}>
										<Button // 仅PC端显示
											icon={<Icons.Outline.CloudUpload />}
											class="hidden lg:flex"
											onClick={() => openCreateForm(validCurrentTableConfig())}
										>
											{dictionary().ui.actions.add}
										</Button>
									</Show>
								</div>
							</div>
						</Motion.div>

						{/* 轮播图 */}
						<Presence exitBeforeEnter>
							<Show when={!isMainContentFullscreen()}>
								<Motion.div
									class="Banner hidden h-65 flex-initial gap-3 p-3 opacity-0 lg:flex"
									animate={{ opacity: [0, 1] }}
									exit={{ opacity: [1, 0] }}
									transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
								>
									<div class="BannerContent flex flex-1 gap-6 lg:gap-2">
										<For each={[0, 1, 2]}>
											{(_, index) => {
												const brandColor = {
													1: "1st",
													2: "2nd",
													3: "3rd",
												}[1 + (index() % 3)];
												return (
													<Presence exitBeforeEnter>
														<Show when={!isMainContentFullscreen()}>
															<Motion.div
																class={`Banner-${index} bg-primary-color flex-none overflow-hidden rounded border-2 ${activeBannerIndex() === index() ? "active shadow-card shadow-dividing-color border-primary-color" : "border-transparent"}`}
																onMouseEnter={() => setActiveBannerIndex(index())}
																style={{
																	// "background-image": `url(${mobList()?.[0]?.image.dataUrl !== `"data:image/png;base64,"` ? mobList()?.[0]?.image.dataUrl : defaultImage.dataUrl})`,
																	"background-position": "center center",
																}}
																animate={{
																	opacity: [0, 1],
																	transform: ["scale(0.9)", "scale(1)"],
																}}
																exit={{
																	opacity: [1, 0],
																	transform: ["scale(1)", "scale(0.9)"],
																}}
																transition={{
																	duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0,
																	delay: index() * 0.05,
																}}
															>
																<div
																	class={`mask ${activeBannerIndex() === index() ? `bg-brand-color-${brandColor}` : `bg-area-color`} text-primary-color hidden h-full flex-col justify-center gap-2 p-8 lg:flex`}
																>
																	<span
																		class={`text-3xl font-bold ${activeBannerIndex() === index() ? `text-primary-color` : `text-accent-color`}`}
																	>
																		TOP.{index() + 1}
																	</span>
																	<div
																		class={`h-px w-27.5 ${activeBannerIndex() === index() ? `bg-primary-color` : `bg-accent-color`}`}
																	></div>
																	<span
																		class={`text-xl ${activeBannerIndex() === index() ? `text-primary-color` : `text-accent-color`}`}
																	>
																		{/* {"name" in defaultData[tableName()] ? dataConfig().table.dataList?.latest?.[index()].name : ""} */}
																	</span>
																</div>
															</Motion.div>
														</Show>
													</Presence>
												);
											}}
										</For>
									</div>
								</Motion.div>
							</Show>
						</Presence>

						{/* 表格和新闻 */}
						<div class="Table&News flex h-full flex-1 flex-col gap-3 overflow-hidden lg:flex-row lg:p-3">
							<div class="TableModule flex flex-1 flex-col overflow-hidden">
								<div class="Title hidden h-12 w-full items-center gap-3 lg:flex">
									<div class={`Text px-6 text-xl`}>{dictionary().db[wikiStore.type].selfName}</div>
									<div
										class={`Description ${!isMainContentFullscreen() ? "opacity-0" : "opacity-100"} bg-area-color flex-1 rounded p-3`}
									>
										{dictionary().db[wikiStore.type].description}
									</div>
									<Button
										level="quaternary"
										icon={isMainContentFullscreen() ? <Icons.Outline.Collapse /> : <Icons.Outline.Expand />}
										onClick={() => {
											setIsMainContentFullscreen((pre) => !pre);
										}}
									/>
								</div>
								{/* rowPage=true 是调试参数：强制显示基础虚拟表，跳过专用页面配置 */}
								<Show
									when={wikiPageConfig[wikiStore.type] && searchParams.rowPage !== "true"}
									fallback={
										<Motion.div
											animate={{
												opacity: [0, 1],
											}}
											transition={{
												duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0,
											}}
											class="VirtualTableAnimationBox w-full h-full"
										>
											{/* 排序、滚动位置和行高缓存都是单表作用域的状态，按表名 keyed 重建，
									    否则切表后列定义已换成新表，排序里仍留着旧表字段。 */}
											<Show when={validCurrentTableConfig().tableName} keyed>
												{(tableName) => (
													<CurrentVirtualTable tableName={tableName} tableConfig={validCurrentTableConfig()} />
												)}
											</Show>
										</Motion.div>
									}
								>
									{wikiPageConfig[wikiStore.type]?.mainContent()}
								</Show>
							</div>
							<Presence exitBeforeEnter>
								<Show when={!isMainContentFullscreen()}>
									<Motion.div
										animate={{ opacity: [0, 1] }}
										exit={{ opacity: 0 }}
										class="News hidden w-62 flex-initial flex-col gap-2 lg:flex"
									>
										<div class="Title flex h-12 text-xl">{dictionary().ui.wiki.news.title}</div>
										<div class="Content flex flex-1 flex-col gap-3">
											<For each={[0, 1, 2]}>
												{(_, index) => {
													return (
														<Motion.div
															class="Item bg-area-color h-full w-full flex-1 rounded"
															animate={{
																opacity: [0, 1],
																transform: ["scale(0.9)", "scale(1)"],
															}}
															exit={{
																opacity: [1, 0],
																transform: ["scale(1)", "scale(0.9)"],
															}}
															transition={{
																duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0,
																delay: index() * 0.05,
															}}
														></Motion.div>
													);
												}}
											</For>
										</div>
									</Motion.div>
								</Show>
							</Presence>
						</div>

						{/* 控制栏 */}
						<Presence exitBeforeEnter>
							<Show when={isMainContentFullscreen() || media.width < 1024}>
								<Motion.div
									class="Control bg-primary-color shadow-dividing-color shadow-dialog absolute bottom-3 left-1/2 z-10 flex w-1/2 min-w-80 gap-1 rounded p-1 lg:min-w-2xl landscape:bottom-6"
									animate={{
										opacity: [0, 1],
										transform: ["translateX(-50%)", "translateX(-50%)"],
									}}
									exit={{ opacity: 0, transform: "translateX(-50%)" }}
									transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
								>
									<Button
										size="sm"
										level="quaternary"
										icon={<Icons.Outline.Swap />}
										onClick={openWikiSelectorDialog}
									></Button>
									<Show when={store.session.user?.id}>
										<Button // 仅PC端显示
											size="sm"
											level="quaternary"
											icon={<Icons.Outline.CloudUpload />}
											class="hidden lg:flex"
											onClick={() => openCreateForm(validCurrentTableConfig())}
										></Button>
									</Show>
									<input
										id="filterInput"
										type="text"
										placeholder={dictionary().ui.actions.filter}
										value={wikiStore.table.globalFilterStr}
										onInput={(e) => {
											setWikiStore("table", {
												globalFilterStr: e.target.value,
											});
										}}
										class="focus:placeholder:text-accent-color bg-area-color placeholder:text-boundary-color w-full flex-1 rounded px-4 py-2 text-lg font-bold mix-blend-multiply outline-hidden! placeholder:text-base placeholder:font-normal focus-within:outline-hidden landscape:flex landscape:bg-transparent dark:mix-blend-normal"
									/>
									<Button
										size="sm"
										class="bg-transparent"
										onclick={openTableConfigDialog}
										icon={<Icons.Outline.Settings />}
									/>
								</Motion.div>
							</Show>
						</Presence>
					</Show>
				);
			}}
		</Show>
	);
}
