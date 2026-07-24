import { type DB, DBSchema } from "@db/generated/zod";
import { repositoryReaders, type RepositoryReader } from "@db/generated/repositories";
import { getPrimaryKeys } from "@db/generated/dmmf-utils";
import type { SkillTreeType } from "@db/schema/enums";
import { useNavigate, useParams } from "@solidjs/router";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createEffect, createMemo, createSignal, onCleanup, onMount, Show, useContext } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { DATA_CONFIG, type TableDataConfig } from "~/components/business/data-config";
import type { ZodSchemaFor } from "~/lib/utils/zod";
import type { Dic } from "~/locales/type";
import { Button } from "~/components/controls/button";
import { LoadingBar } from "~/components/controls/loadingBar";
import { Select } from "~/components/controls/select";
import { ObjRenderer } from "~/components/dataDisplay/ObjRenderer";
import { CharacterConfigPanel } from "~/components/features/character/CharacterConfigPanel";
import { SkillPreviewPanel } from "~/components/features/character/SkillPreviewPanel";
import { Icons } from "~/components/icons";
import { useDictionary } from "~/contexts/Dictionary";
import { MediaContext } from "~/contexts/Media";
import type { CharacterEdit } from "~/features/character/edit/characterEditProtocol";
import { useCharacterSession } from "~/features/character/session/CharacterSession";
import { createDefaultCharacterWorldResource } from "~/lib/3dScene/resources/defaultCharacterResource";
import { type CharacterContentSession, useSceneRuntime } from "~/lib/3dScene/SceneRuntime";
import { StatsRenderer } from "~/lib/engine/core/World/Member/MemberStatusPanel";
import { createLogger } from "~/lib/Logger";
import { type DialogLayerEntryInit, useOverlay } from "~/lib/overlay/OverlayContext";
import { useInterfaceActor } from "~/machines/AppActorContext";
import { store } from "~/store";
import { createCharacter } from "./createCharacter";

const logger = createLogger("CharacterPage");

export default function CharactePage() {
	const navigate = useNavigate();
	const media = useContext(MediaContext);
	const dictionary = useDictionary();
	// 页面根作用域 overlay 句柄:预览 dialog 从这里 openDialog 新建 layer。
	const overlay = useOverlay();
	const params = useParams();
	const sceneRuntime = useSceneRuntime();
	const interfaceActor = useInterfaceActor();
	const session = useCharacterSession();

	type PanelModeType = "Config" | "AttrPreview" | "SkillPreview";
	const [panelMode, setPanelMode] = createSignal<PanelModeType>("Config");
	const isConfigPanelVisible = createMemo(() => panelMode() === "Config" || media.width >= 1024);
	const isAttrPreviewVisible = createMemo(() => panelMode() === "AttrPreview" || media.width >= 1024);
	const isSkillPreviewVisible = createMemo(() => panelMode() === "SkillPreview" || media.width >= 1024);

	const failedEdit = createMemo(() => {
		const edits = session.edits();
		return edits.status === "failed" ? edits : null;
	});
	const aggregate = createMemo(() => session.character()?.aggregate ?? null);
	const character = createMemo(() => aggregate()?.character ?? null);
	const characters = createMemo(() => aggregate()?.characters ?? []);
	const [pendingNavigation, setPendingNavigation] = createSignal<string | null>(null);
	let activeInterfaceCharacterId: string | null = null;

	createEffect(() => {
		if (pendingNavigation()) return;
		const playerId = store.session.account.player?.id;
		const characterId = params.characterId;
		if (!playerId || !characterId) return;
		const current = session.identity();
		if (!current) {
			session.send({ type: "character.load", playerId, characterId });
			return;
		}
		if (current.playerId !== playerId || current.characterId !== characterId) {
			session.send({ type: "character.switch.requested", playerId, characterId });
		}
	});

	createEffect(() => {
		const target = pendingNavigation();
		if (!target) return;
		if (session.identity()?.characterId === target) {
			if (params.characterId !== target) {
				navigate(`/character/${target}`);
				return;
			}
			setPendingNavigation(null);
			return;
		}
		if (session.error()?.operation === "switch") setPendingNavigation(null);
	});

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

	const primaryMember = createMemo(() => session.validation().members.find((member) => member.type === "Player"));

	const dispatchCharacterEdit = (edit: CharacterEdit) => {
		session.send({ type: "character.edit.submit", edit });
	};
	const dispatchSkillLevelAdjust = (payload: { templateId: string; delta: -1 | 1 }) => {
		session.send({ type: "character.edit.submit", edit: { type: "skills.adjustLevel", ...payload } });
	};
	const dispatchSkillTreeRemove = (treeType: SkillTreeType) => {
		session.send({ type: "character.edit.submit", edit: { type: "skills.removeTree", treeType } });
	};

	/**
	 * 构造预览 dialog entry。render 在 dialog layer 作用域内执行:
	 * - 外键 drill → pushDialog 并入同一 layer;editor → openSheet 新建子 layer。
	 * 角色页的预览 dialog 由当前场景创建,递归关联和编辑表单沿用同一个角色页上下文。
	 */

	// 预览卡片所需的最小配置子集，同 index.tsx 的 SearchResultConfig 模式。
	type PreviewConfig<TTableName extends keyof DB, T extends DB[TTableName] = DB[TTableName]> = {
		schema: ZodSchemaFor<T>;
		dic: Dic<T>;
		readers: RepositoryReader<TTableName>;
		card: TableDataConfig<TTableName, T>["card"];
		fieldGroupMap: TableDataConfig<TTableName, T>["fieldGroupMap"];
	};

	const buildPreviewConfig = <TTableName extends keyof DB>(
		type: TTableName,
		dict: ReturnType<typeof dictionary>,
	): PreviewConfig<TTableName> | undefined => {
		const uiConfig = DATA_CONFIG[type]?.(dict);
		if (!uiConfig) return undefined;
		return {
			schema: DBSchema[type],
			dic: dict.db[type],
			readers: repositoryReaders[type],
			card: uiConfig.card,
			fieldGroupMap: uiConfig.fieldGroupMap,
		} as PreviewConfig<TTableName>;
	};

	// 泛型子组件：在泛型上下文中使用 config，TypeScript 能证明各 prop 属于同一 TTableName。
	const CharacterPreviewCard = <TTableName extends keyof DB>(props: {
		id: string;
		config: PreviewConfig<TTableName>;
	}) => (
		<ObjRenderer
			title={props.config.card.title}
			query={(db) => props.config.readers.get?.(db, props.id) ?? null}
			dataSchema={props.config.schema}
			dictionary={props.config.dic}
			hiddenFields={props.config.card.hiddenFields}
			fieldGroupMap={props.config.fieldGroupMap}
			renderers={props.config.card.renderers}
			after={props.config.card.after}
			before={props.config.card.before}
		/>
	);

	const buildPreviewDialogEntry = (type: keyof DB, data: unknown): DialogLayerEntryInit => {
		const cardData = data as Record<string, unknown>;
		const config = buildPreviewConfig(type, dictionary());
		const getTablePrimaryKey = <TTableName extends keyof DB>(tableName: TTableName): keyof DB[TTableName] =>
		(getPrimaryKeys(tableName)[0] ?? "id") as keyof DB[TTableName];
		const primaryKey = getTablePrimaryKey(type);
		const id = String(cardData[primaryKey]);

		return {
			title: (cardData as { name?: unknown }).name?.toString() ?? "",
			titleIcon: () => <Icons.Spirits iconName={type} />,
			layout: "fill",
			render: () => {
				if (!config) return <pre>{JSON.stringify(cardData, null, 2)}</pre>;
				return <CharacterPreviewCard id={id} config={config} />;
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

	// 共享常驻场景的角色内容：随当前有效角色资源申请/释放（对称于 RealtimeSimulator 的 realtime session）。
	// 模型经全屏共享背景层渲染（不再内嵌配置面板小窗）。
	let contentSession: CharacterContentSession | null = null;
	let contentRequestSeq = 0;
	createEffect(() => {
		const currentCharacter = character();
		const requestSeq = ++contentRequestSeq;
		// 先释放旧来源（id 变化 / 卸载），保证内容互斥。
		contentSession?.release();
		contentSession = null;
		if (!currentCharacter) return;
		const resource = createDefaultCharacterWorldResource({
			memberId: currentCharacter.id,
			resourceId: currentCharacter.id,
			displayName: currentCharacter.name,
		});
		void sceneRuntime.acquireCharacterContent(resource).then((session) => {
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
			when={character()?.id}
			keyed
			fallback={
				<div class="LoadingState flex h-full w-full flex-col items-center justify-center gap-3">
					<LoadingBar center class="h-12 w-1/2 min-w-[320px]" />
					<Show when={session.error()}>
						{(error) => <div class="text-danger-color text-sm">{error().message}</div>}
					</Show>
				</div>
			}
		>
			{(activeCharacterId) => {
				const initialCharacter = character();
				if (!initialCharacter || initialCharacter.id !== activeCharacterId) return null;
				// keyed 分支只按身份重建；同一角色继续读取最新 live 值，退出阶段则保留初始快照供异步清理读取。
				const displayedCharacter = createMemo(() => {
					const current = character();
					return current?.id === activeCharacterId ? current : initialCharacter;
				});

				return (
					<Motion.div
						animate={{ opacity: [0, 1] }}
						exit={{ opacity: 0 }}
						transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
						class="CharacterPage relative flex h-full w-full flex-col overflow-hidden"
					>
						<Show when={session.error()}>
							{(error) => (
								<div class="border-danger-color flex items-center justify-between gap-2 border-b px-6 py-2 text-sm text-danger-color">
									<span class="min-w-0 truncate">
										{error().operation}: {error().message}
									</span>
									<Show when={failedEdit()}>
										<div class="flex shrink-0 items-center gap-2">
											<Button
												size="sm"
												level="secondary"
												onClick={() => session.send({ type: "character.edits.retryFailed" })}
											>
												重试失败修改
											</Button>
											<Button
												size="sm"
												level="quaternary"
												onClick={() => session.send({ type: "character.edits.discardFailed" })}
											>
												放弃失败修改
											</Button>
										</div>
									</Show>
								</div>
							)}
						</Show>
						<div class="Title w-full flex">
							<Show when={characters().length > 0} fallback={<LoadingBar class="w-full h-12" />}>
								<Select
									value={displayedCharacter().id}
									setValue={(value) => {
										const playerId = store.session.account.player?.id;
										if (!playerId || !value || value === session.identity()?.characterId) return;
										setPendingNavigation(value);
										session.send({ type: "character.switch.requested", playerId, characterId: value });
									}}
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
									placeholder={displayedCharacter().name}
									styleLess
								/>
							</Show>
							<Button
								icon={<Icons.Outline.AddUser />}
								level="quaternary"
								onClick={async () => {
									const createdCharacter = await createCharacter();
									const playerId = store.session.account.player?.id;
									if (!playerId) return;
									setPendingNavigation(createdCharacter.id);
									session.send({
										type: "character.switch.requested",
										playerId,
										characterId: createdCharacter.id,
									});
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
									character={displayedCharacter()}
									onEditRequested={dispatchCharacterEdit}
									onItemPreviewRequested={previewDataItem}
									onSkillLevelAdjustRequested={dispatchSkillLevelAdjust}
									onSkillTreeRemoveRequested={dispatchSkillTreeRemove}
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
								<SkillPreviewPanel learnedSkills={displayedCharacter().skills ?? []} />
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
				);
			}}
		</Show>
	);
}
