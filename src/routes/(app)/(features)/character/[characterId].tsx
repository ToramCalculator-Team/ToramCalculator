import type { character, DB } from "@db/generated/zod";
import { useNavigate, useParams } from "@solidjs/router";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createEffect, createMemo, createSignal, onCleanup, onMount, Show, useContext } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { DataRenderer } from "~/components/business/card/DataRenderer";
import { DATA_CONFIG } from "~/components/business/data-config";
import { DataForm } from "~/components/business/form/DataForm";
import { Button } from "~/components/controls/button";
import { LoadingBar } from "~/components/controls/loadingBar";
import { Select } from "~/components/controls/select";
import { CharacterConfigPanel } from "~/components/features/character/CharacterConfigPanel";
import { SkillPreviewPanel } from "~/components/features/character/SkillPreviewPanel";
import { Icons } from "~/components/icons";
import { useDictionary } from "~/contexts/Dictionary";
import { MediaContext } from "~/contexts/Media";
import { type CharacterContentSession, useSceneRuntime } from "~/lib/3dScene/SceneRuntime";
import { useEngine } from "~/lib/engine/core/thread/EngineContext";
import { StatsRenderer } from "~/lib/engine/core/World/Member/MemberStatusPanel";
import { createLogger } from "~/lib/Logger";
import { type DialogLayerEntryInit, useOverlay } from "~/lib/overlay/OverlayContext";
import { useInterfaceActor } from "~/machines/AppActorContext";
import { store } from "~/store";
import { createCharacterPageModel } from "./characterPageModel";
import { createCharacter } from "./createCharacter";

const logger = createLogger("CharacterPage");

export default function CharactePage() {
	const navigate = useNavigate();
	const media = useContext(MediaContext);
	const dictionary = useDictionary();
	// 页面根作用域 overlay 句柄:预览 dialog 从这里 openDialog 新建 layer。
	const overlay = useOverlay();
	const params = useParams();
	const engine = useEngine();
	const sceneRuntime = useSceneRuntime();
	const interfaceActor = useInterfaceActor();

	type PanelModeType = "Config" | "AttrPreview" | "SkillPreview";
	const [panelMode, setPanelMode] = createSignal<PanelModeType>("Config");
	const isConfigPanelVisible = createMemo(() => panelMode() === "Config" || media.width >= 1024);
	const isAttrPreviewVisible = createMemo(() => panelMode() === "AttrPreview" || media.width >= 1024);
	const isSkillPreviewVisible = createMemo(() => panelMode() === "SkillPreview" || media.width >= 1024);

	const previewTeamAId = "CHARACTER_PREVIEW_TEAM_A";
	const previewTeamBId = "CHARACTER_PREVIEW_TEAM_B";
	const previewMemberId = "CHARACTER_PREVIEW_MEMBER";
	const previewStatisticId = "CHARACTER_PREVIEW_STATISTIC";

	// 角色配置变化后同步预览引擎；配置面板只提交 command，预览生命周期由页面 model 统一调度。
	const model = createCharacterPageModel({
		playerId: () => store.session.account.player?.id,
		characterId: () => params.characterId,
		engine,
		previewIds: {
			teamAId: previewTeamAId,
			teamBId: previewTeamBId,
			memberId: previewMemberId,
			statisticId: previewStatisticId,
		},
	});

	const character = createMemo(() => model.pageData.character);
	const characters = createMemo(() => model.pageData.characters);
	let activeInterfaceCharacterId: string | null = null;

	// 路由页面只声明当前交互空间；装备检查/编辑由子面板发送更具体的语义事件。
	createEffect(() => {
		const characterId = character()?.id ?? null;
		if (characterId === activeInterfaceCharacterId) return;
		if (!characterId) {
			if (activeInterfaceCharacterId) {
				interfaceActor.send({ type: "character.close", characterId: activeInterfaceCharacterId });
				activeInterfaceCharacterId = null;
			}
			return;
		}
		activeInterfaceCharacterId = characterId;
		interfaceActor.send({ type: "character.open", characterId });
	});

	onCleanup(() => {
		if (activeInterfaceCharacterId) {
			interfaceActor.send({ type: "character.close", characterId: activeInterfaceCharacterId });
			activeInterfaceCharacterId = null;
		}
	});

	const primaryMember = createMemo(() => {
		const list = engine.characterMembers();
		const primaryMember = list.find((member) => member.id === previewMemberId);
		logger.info("primaryMember", primaryMember);
		return primaryMember;
	});

	const dispatchCharacterPatch = (
		patch: Partial<character>,
		relations?: Partial<NonNullable<typeof model.pageData.character>>,
	) => {
		model.dispatch({ type: "character.patch", patch, relations });
	};

	/**
	 * 构造预览 dialog entry。render 在 dialog layer 作用域内执行:
	 * - 外键 drill → pushDialog 并入同一 layer;editor → openSheet 新建子 layer。
	 * 角色页的预览 dialog 由当前场景创建,递归关联和编辑表单沿用同一个角色页上下文。
	 */
	const buildPreviewDialogEntry = (type: keyof DB, data: unknown): DialogLayerEntryInit => {
		const cardData = data as Record<string, unknown>;
		const config = DATA_CONFIG[type]?.(dictionary);
		return {
			title: (cardData as { name?: unknown }).name?.toString() ?? "",
			titleIcon: () => <Icons.Spirits iconName={type} />,
			layout: "fill",
			render: (dialogApi) => {
				if (!config) return <pre>{JSON.stringify(cardData, null, 2)}</pre>;
				// dialog layer 作用域句柄:drill 用 pushDialog 并入同层,editor 用 openSheet 新建子层。
				const dialogOverlay = useOverlay();

				return (
					<DataRenderer
						primaryKey={config.primaryKey}
						dictionary={config.dictionary}
						deleteCallback={config.card.deleteCallback}
						onOpenRecord={(nextType, nextData) => dialogOverlay.pushDialog(buildPreviewDialogEntry(nextType, nextData))}
						onDeleted={dialogApi.close}
						openEditor={(nextData) => {
							dialogOverlay.openSheet({
								render: (api) => (
									<DataForm
										tableName={type}
										value={nextData}
										primaryKey={config.primaryKey}
										defaultValue={config.defaultData}
										dataSchema={config.dataSchema}
										dictionary={config.dictionary}
										hiddenFields={config.form.hiddenFields}
										fieldGroupMap={config.fieldGroupMap}
										renderers={config.form.renderers}
										inheritsFrom={config.inheritsFrom}
										embeds={config.embeds}
										onInsert={async (value) => {
											const result = await config.form.onInsert(value);
											api.close();
											return result;
										}}
										onUpdate={async (primaryKeyValue, value) => {
											const result = await config.form.onUpdate(primaryKeyValue, value);
											api.close();
											return result;
										}}
									/>
								),
							});
						}}
						editAbleCallback={config.card.editAbleCallback}
						tableName={type}
						data={() => cardData}
						dataSchema={config.dataSchema}
						hiddenFields={config.card.hiddenFields}
						fieldGroupMap={config.fieldGroupMap}
						fieldGenerator={config.card.fieldGenerator}
						inheritsFrom={config.inheritsFrom}
						embeds={config.embeds}
						relationOverrides={config.card.relationOverrides}
						after={config.card.after}
						before={config.card.before}
					/>
				);
			},
		};
	};

	/** 预览入口:从页面根作用域新建 dialog layer。 */
	const previewDataItem = (type: keyof DB, data: unknown) => {
		overlay.openDialog(buildPreviewDialogEntry(type, data));
	};

	onMount(() => {
		logger.info("--CharacterIdPage render");
	});

	// 共享常驻场景的角色内容：随当前有效角色 id 申请/释放（对称于 RealtimeSimulator 的 realtime session）。
	// 模型经全屏共享背景层渲染（不再内嵌配置面板小窗）。
	let contentSession: CharacterContentSession | null = null;
	let contentRequestSeq = 0;
	createEffect(() => {
		const id = character()?.id;
		const requestSeq = ++contentRequestSeq;
		// 先释放旧来源（id 变化 / 卸载），保证内容互斥。
		contentSession?.release();
		contentSession = null;
		if (!id) return;
		void sceneRuntime.acquireCharacterContent(id).then((session) => {
			// 异步加载期间若已被新请求/卸载抢占，立即释放本次结果。
			if (requestSeq !== contentRequestSeq) {
				session.release();
				return;
			}
			contentSession = session;
		});
	});
	onCleanup(() => {
		contentRequestSeq++;
		contentSession?.release();
		contentSession = null;
	});

	return (
		<Show
			when={character()}
			fallback={
				<div class="LoadingState flex h-full w-full flex-col items-center justify-center gap-3">
					<LoadingBar center class="h-12 w-1/2 min-w-[320px]" />
					<Show when={model.status() === "error"}>
						<div class="text-sm text-accent-color">角色数据加载失败</div>
					</Show>
				</div>
			}
		>
			{(validCharacter) => (
				<Motion.div
					animate={{ opacity: [0, 1] }}
					exit={{ opacity: 0 }}
					transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
					class="CharacterPage relative flex h-full w-full flex-col overflow-hidden"
				>
					<div class="Title w-full flex">
						<Show when={characters().length > 0} fallback={<LoadingBar class="w-full h-12" />}>
							<Select
								value={validCharacter().id}
								setValue={(value) => navigate(`/character/${value}`)}
								options={characters().map((character) => ({ label: character.name, value: character.id }))}
								optionGenerator={(option, selected, onclick) => (
									<button
										type="button"
										class={`w-full py-1 px-6 text-accent-color text-start ${selected ? "font-bold text-2xl" : ""} `}
										onClick={onclick}
									>
										{option.label ?? "---"}
									</button>
								)}
								placeholder={validCharacter().name}
								styleLess
							/>
						</Show>
						<Button
							icon={<Icons.Outline.AddUser />}
							level="quaternary"
							onClick={async () => {
								const character = await createCharacter();
								navigate(`/character/${character.id}`);
							}}
							class="absolute right-6 top-0"
						/>
					</div>
					<div class="Content flex h-full w-full flex-1 flex-col overflow-hidden p-6 landscape:flex-row">
						<OverlayScrollbarsComponent
							element="div"
							options={{ scrollbars: { autoHide: "scroll" } }}
							defer
							class={`CharacterConfigPanel landscape:basis-1/2 portrait:py-6`}
							style={{
								display: isConfigPanelVisible() ? "" : "none",
							}}
						>
							<CharacterConfigPanel
								character={validCharacter()}
								onPatchRequested={dispatchCharacterPatch}
								onItemPreviewRequested={previewDataItem}
								onCommand={model.dispatch}
							/>
						</OverlayScrollbarsComponent>

						<div
							class={`Divider landscape:bg-dividing-color flex-none portrait:hidden landscape:h-full landscape:w-px`}
						/>
						<OverlayScrollbarsComponent
							element="div"
							options={{ scrollbars: { autoHide: "scroll" } }}
							defer
							class={`MemberStats gap-2 landscape:basis-1/4 landscape:p-3`}
							style={{
								display: isAttrPreviewVisible() ? "flex" : "none",
							}}
						>
							<StatsRenderer data={primaryMember()?.attrs} />
						</OverlayScrollbarsComponent>

						<div
							class={`Divider landscape:bg-dividing-color flex-none portrait:hidden landscape:h-full landscape:w-px`}
						/>
						<OverlayScrollbarsComponent
							element="div"
							options={{ scrollbars: { autoHide: "scroll" } }}
							defer
							class={`SkillPreview gap-2 landscape:basis-1/4 landscape:p-3`}
							style={{
								display: isSkillPreviewVisible() ? "flex" : "none",
							}}
						>
							<SkillPreviewPanel
								memberId={previewMemberId}
								learnedSkills={validCharacter().skills ?? []}
								dataSource={model.skillPreviewDataSource}
							/>
						</OverlayScrollbarsComponent>

						{/* 模式切换器 */}
						<Presence exitBeforeEnter>
							<Show when={media.width < 1024}>
								<Motion.div
									class="ModuleSwitcher bg-primary-color shadow-dividing-color shadow-dialog absolute bottom-3 left-1/2 z-10 flex gap-1 rounded p-1 landscape:bottom-6"
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
										icon={<Icons.Outline.Edit />}
										onClick={() => setPanelMode("Config")}
										active={panelMode() === "Config"}
									/>
									<Button
										size="sm"
										level="quaternary"
										icon={<Icons.Outline.Chart />}
										onClick={() => setPanelMode("AttrPreview")}
										active={panelMode() === "AttrPreview"}
									/>
									<Button
										size="sm"
										level="quaternary"
										icon={<Icons.Outline.Basketball />}
										onClick={() => setPanelMode("SkillPreview")}
										active={panelMode() === "SkillPreview"}
									/>
								</Motion.div>
							</Show>
						</Presence>
					</div>
				</Motion.div>
			)}
		</Show>
	);
}
