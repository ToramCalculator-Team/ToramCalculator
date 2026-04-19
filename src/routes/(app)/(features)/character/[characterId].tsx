import { useNavigate, useParams } from "@solidjs/router";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import {
	createEffect,
	createMemo,
	createResource,
	createSignal,
	on,
	onCleanup,
	onMount,
	Show,
	useContext,
} from "solid-js";
import { Portal } from "solid-js/web";
import { BuiltinAnimationType, type CharacterEntityRuntime, EntityFactory } from "~/lib/engine/render/RendererController";
// import "@babylonjs/core/Debug/debugLayer"; // Augments the scene with the debug methods
// import "@babylonjs/inspector"; // Injects a local ES6 version of the inspector to prevent automatically relying on the none compatible version
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_draco_mesh_compression";
import {
	type AbstractEngine,
	ArcRotateCamera,
	Color3,
	Scene,
	ShadowGenerator,
	SpotLight,
	Vector3,
} from "@babylonjs/core";
import { Engine } from "@babylonjs/core/Engines/engine";
import { getPrimaryKeys } from "@db/generated/dmmf-utils";
import { repositoryMethods } from "@db/generated/repositories";
import { selectAllCharactersByBelongtoplayerid, updateCharacter } from "@db/generated/repositories/character";
import type { MemberWithRelations } from "@db/generated/repositories/member";
import { selectPlayerByIdWithRelations } from "@db/generated/repositories/player";
import type { PlayerArmorWithRelations } from "@db/generated/repositories/player_armor";
import type { PlayerOptionWithRelations } from "@db/generated/repositories/player_option";
import type { PlayerSpecialWithRelations } from "@db/generated/repositories/player_special";
import type { PlayerWeaponWithRelations } from "@db/generated/repositories/player_weapon";
import type { TeamWithRelations } from "@db/generated/repositories/team";
import type { character, DB } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import type { CharacterPersonalityType } from "@db/schema/enums";
import { VisibilityState } from "@tanstack/solid-table";
import { Motion, Presence } from "solid-motionone";
import { DATA_CONFIG } from "~/components/business/data-config";
import { Sheet } from "~/components/containers/sheet";
import { Button } from "~/components/controls/button";
import { Input } from "~/components/controls/input";
import { LoadingBar } from "~/components/controls/loadingBar";
import { RangeInput } from "~/components/controls/range";
import { Select } from "~/components/controls/select";
import { VirtualTable } from "~/components/dataDisplay/virtualTable";
import { Icons } from "~/components/icons";
import { useDictionary } from "~/contexts/Dictionary";
import { MediaContext } from "~/contexts/Media";
import { useEngine } from "~/lib/engine/core/thread/EngineContext";
import { createPreviewConfig, type EngineScenarioData } from "~/lib/engine/core/types";
import { StatsRenderer } from "~/lib/engine/core/World/Member/MemberStatusPanel";
import { createLiveKyselyQuery } from "~/lib/liveQuery";
import { setStore, store } from "~/store";
import { createCharacter } from "./createCharacter";
import { EquipmentPanel, type EquipmentSlot } from "./panels/EquipmentPanel";

export default function CharactePage() {
	const dictionary = useDictionary();

	const navigate = useNavigate();

	const media = useContext(MediaContext);

	// 面板模式
	type PanelModeType = "Config" | "AttrPreview" | "SkillPreview";
	const [panelMode, setPanelMode] = createSignal<PanelModeType>("Config");

	const params = useParams();

	const [playerWithRelations, { refetch: refetchPlayerWithRelations }] = createResource(
		() => params.characterId,
		async () => {
			const playerId = store.session.account.player?.id;
			if (!playerId) return null;
			const player = await selectPlayerByIdWithRelations(playerId);
			console.log("player", player);
			return player;
		},
	);
	const character = createMemo(() => {
		const player = playerWithRelations();
		if (!player) return null;
		const character = player.characters.find((c) => c.id === params.characterId);
		if (!character) return null;
		console.log("character", character);
		return character;
	});
	const charactersFinder = (id: string) => selectAllCharactersByBelongtoplayerid(id);
	const [characters, { refetch: refetchCharacters }] = createResource(
		() => store.session.account.player?.id ?? "",
		charactersFinder,
	);

	// ==================== 引擎集成 ====================
	const engine = useEngine();
	const previewTeamAId = "CHARACTER_PREVIEW_TEAM_A";
	const previewTeamBId = "CHARACTER_PREVIEW_TEAM_B";
	const previewMemberId = "CHARACTER_PREVIEW_MEMBER";
	const previewStatisticId = "CHARACTER_PREVIEW_STATISTIC";
	const [scenarioLoaded, setScenarioLoaded] = createSignal(false);
	let rangeUpdateTimer: number | undefined;

	const queueCharacterPatch = (patch: Partial<character>, debounceMs = 200) => {
		if (rangeUpdateTimer !== undefined) {
			window.clearTimeout(rangeUpdateTimer);
		}
		rangeUpdateTimer = window.setTimeout(() => {
			rangeUpdateTimer = undefined;
			void commitCharacterPatch(patch);
		}, debounceMs);
	};

	const commitCharacterPatch = async (patch: Partial<character>) => {
		const current = character();
		if (!current) return;
		if (rangeUpdateTimer !== undefined) {
			window.clearTimeout(rangeUpdateTimer);
			rangeUpdateTimer = undefined;
		}
		await updateCharacter(current.id, patch);
		await refetchPlayerWithRelations();
	};

	createEffect(
		on(
			() => ({
				ready: engine.ready(),
				playerWithRelations: playerWithRelations(),
			}),
			async () => {
				if (!engine.ready()) return null;
				console.log("玩家配置发生变化，将更新引擎初始化数据");

				const currentCharacter = character();
				const player = playerWithRelations();
				if (!currentCharacter || !player) return null;
				if (!player.id) return null;
				if (!Array.isArray(player.characters) || player.characters.length === 0) return null;

				const now = new Date().toISOString();

				const member: MemberWithRelations = {
					id: previewMemberId,
					name: currentCharacter.name ?? "未命名角色",
					sequence: 0,
					type: "Player",
					playerId: player.id,
					partnerId: null,
					mercenaryId: null,
					mobId: null,
					mobDifficultyFlag: "Normal",
					belongToTeamId: previewTeamAId,
					player,
					partner: null,
					mercenary: null,
					mob: null,
				};

				const teamA: TeamWithRelations = {
					id: previewTeamAId,
					name: "CharacterPreviewTeamA",
					gems: [],
					members: [member],
				};
				const teamB: TeamWithRelations = {
					id: previewTeamBId,
					name: "CharacterPreviewTeamB",
					gems: [],
					members: [],
				};

				const scenario: EngineScenarioData = {
					simulator: {
						id: "CHARACTER_PREVIEW_SIMULATOR",
						name: "CharacterPreviewSimulator",
						details: null,
						statisticId: previewStatisticId,
						updatedByAccountId: null,
						createdByAccountId: null,
						campA: [teamA],
						campB: [teamB],
						statistic: {
							id: previewStatisticId,
							updatedAt: now,
							createdAt: now,
							usageTimestamps: [],
							viewTimestamps: [],
						},
					},
					runtimeSelection: {
						primaryMemberId: previewMemberId,
					},
				};
				try {
					if (!scenarioLoaded()) {
						console.log("loading scenario", scenario);
						await engine.service.loadScenario(scenario);
						await engine.service.setRuntimeConfig(createPreviewConfig());
						await engine.refreshMembers();
						setScenarioLoaded(true);
						return;
					}

					await engine.patchMemberConfig(previewMemberId, member);
				} catch (error) {
					console.error("Character 页加载预览场景失败", error);
				}
			},
		),
	);

	const primaryMember = createMemo(() => {
		const list = engine.members();
		const primaryMember = list.find((member) => member.id === previewMemberId);
		console.log("primaryMember", primaryMember);
		return primaryMember;
	});

	const [selectSheetIsOpen, setSelectSheetIsOpen] = createSignal(false);
	const [selectSheetTitle, setSelectSheetTitle] = createSignal("");
	const [dialogVistualTableType, setDialogVistualTableType] = createSignal<keyof DB>("player_weapon");
	const [globalFilterStr, setGlobalFilterStr] = createSignal("");
	const [dialogTableColumnVisibility, setDialogTableColumnVisibility] = createSignal<VisibilityState>({});

	const equipmentSlotConfig: Record<EquipmentSlot, keyof DB> = {
		mainHand: "player_weapon",
		subHand: "player_weapon",
		armor: "player_armor",
		additional: "player_option",
		special: "player_special",
	};

	const openEquipmentPicker = (slot: EquipmentSlot) => {
		const tableType = equipmentSlotConfig[slot];
		const primaryKey = getPrimaryKeys(tableType)[0];
		if (!primaryKey) return;
		console.log("tableType", tableType, "primaryKey", primaryKey);
		setSelectSheetIsOpen(true);
		setDialogVistualTableType(tableType);
		setSelectSheetTitle(dictionary().db[tableType].selfName);
	};

	const clearEquipmentSlot = (slot: EquipmentSlot) => {
		const tableType = equipmentSlotConfig[slot];
		const primaryKey = getPrimaryKeys(tableType)[0];
		if (!primaryKey) return;
		console.log("tableType", tableType, "primaryKey", primaryKey);
		queueCharacterPatch({
			[primaryKey]: "",
		} as Partial<character>);
	};

	const previewEquipmentItem = (
		slot: EquipmentSlot,
		item: PlayerWeaponWithRelations | PlayerArmorWithRelations | PlayerOptionWithRelations | PlayerSpecialWithRelations,
	) => {
		const tableType = equipmentSlotConfig[slot];
		setStore("pages", "cardGroup", store.pages.cardGroup.length, {
			type: tableType,
			data: item,
		});
	};

	const dataConfig = createMemo(() => DATA_CONFIG[dialogVistualTableType()]);

	// 响应式订阅当前表的行数据（如果 dataConfig 声明了 liveQuery）。
	// 切换 wikiStore.type 时，createEffect 内部会自动退订旧订阅、订阅新表。
	const liveTableRows = createLiveKyselyQuery(async () => {
		const cfg = dataConfig();
		if (!cfg) return null;
		const liveQueryBuilder = cfg(dictionary).dataFetcher.liveQuery;
		if (!liveQueryBuilder) return null;
		const db = await getDB();
		return liveQueryBuilder(db);
	});

	const tabs = {
		combo: { label: dictionary().ui.character.tabs.combo, value: "combo" },
		behavior: { label: dictionary().ui.character.tabs.behavior, value: "behavior" },
		equipment: { label: dictionary().ui.character.tabs.equipment.selfName, value: "equipment" },
		consumable: { label: dictionary().ui.character.tabs.consumable, value: "consumable" },
		cooking: { label: dictionary().ui.character.tabs.cooking, value: "cooking" },
		registlet: { label: dictionary().ui.character.tabs.registlet, value: "registlet" },
		skill: { label: dictionary().ui.character.tabs.skill, value: "skill" },
		ability: { label: dictionary().ui.character.tabs.ability, value: "ability" },
		base: { label: dictionary().ui.character.tabs.base, value: "base" },
	};
	const [activeTab, setActiveTab] = createSignal<keyof typeof tabs>("equipment");

	const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null);
	let babylonEngine: AbstractEngine;
	let scene: Scene;
	let camera: ArcRotateCamera;

	const createBabylonScene = (canvas: HTMLCanvasElement): Scene => {
		babylonEngine = new Engine(canvas, true);
		babylonEngine.loadingScreen = {
			displayLoadingUI: (): void => {
				// console.log('display')
			},
			hideLoadingUI: (): void => {
				// console.log('hidden')
			},
			loadingUIBackgroundColor: "#000000",
			loadingUIText: "Loading...",
		};
		scene = new Scene(babylonEngine);
		scene.autoClear = false;
		// 雾
		scene.fogMode = Scene.FOGMODE_EXP2;
		scene.fogDensity = 0.01;
		scene.fogStart = 16;
		scene.fogEnd = 22;
		scene.fogColor = new Color3(0.8, 0.8, 0.8);
		// 测试模式配置函数
		// function testModelOpen() {
		//   // 是否开启inspector ///////////////////////////////////////////////////////////////////////////////////////////////////
		//   void scene.debugLayer.show({
		//     // embedMode: true
		//   });
		//   // 世界坐标轴显示
		//   new AxesViewer(scene, 0.1);
		// }
		// testModelOpen();

		// 摄像机
		camera = new ArcRotateCamera("Camera", 1.55, 1.2, 7, new Vector3(0, 1, 0), scene);
		camera.minZ = 0.1;
		camera.fov = 1;

		// -----------------------------------光照设置------------------------------------
		// 设置顶部锥形光
		const mainSpotLight = new SpotLight(
			"mainSpotLight",
			new Vector3(0, 18, 8),
			new Vector3(0, -1, 0),
			Math.PI,
			5,
			scene,
		);
		mainSpotLight.id = "mainSpotLight";
		mainSpotLight.radius = 10;
		mainSpotLight.intensity = 1500;

		// 顶部锥形光的阴影发生器---------------------
		const mainSpotLightShadowGenerator = new ShadowGenerator(1024, mainSpotLight);
		mainSpotLightShadowGenerator.bias = 0.000001;
		mainSpotLightShadowGenerator.darkness = 0.1;
		mainSpotLightShadowGenerator.contactHardeningLightSizeUVRatio = 0.05;

		// 设置正面锥形光
		const frontSpotLight = new SpotLight(
			"frontSpotLight",
			new Vector3(0, -1, 10),
			new Vector3(0, 1, 0),
			Math.PI,
			5,
			scene,
		);
		frontSpotLight.id = "frontSpotLight";
		frontSpotLight.radius = 10;
		frontSpotLight.intensity = 1500;

		// -----------------------------------------角色模型--------------------------------------------

		// 开始渲染循环
		babylonEngine.runRenderLoop(() => {
			scene.render();
		});

		const onWinResize = () => babylonEngine.resize();
		window.addEventListener("resize", onWinResize);
		return scene;
	};

	// new Engine会重设canvas尺寸，这会导致布局重绘，然后引起视觉抖动。这里通过延迟渲染解决
	createEffect(
		on(
			() => canvas(),
			(c) => {
				if (c)
					setTimeout(async () => {
						const scene = createBabylonScene(c);
						const factory = new EntityFactory(scene);
						let characterEntity: CharacterEntityRuntime | null = null;
						// 创建角色实体
						characterEntity = await factory.createCharacter(
							character()?.id ?? "unknown",
							character()?.name ?? "未命名角色",
							new Vector3(0, 0, 4),
						);

						// idle 动画已经在 createCharacter 中自动播放
						// 如果需要切换到其他动画，可以使用：
						characterEntity.animationController.playBuiltinAnimation(BuiltinAnimationType.WALK);
					}, 10);
			},
		),
	);

	onMount(() => {
		console.log("--CharacterIdPage render");
	});

	onCleanup(() => {
		if (rangeUpdateTimer !== undefined) {
			window.clearTimeout(rangeUpdateTimer);
		}
		console.log("--CharacterIdPage unmount");
	});

	return (
		<Show
			when={character()}
			fallback={
				<div class="LoadingState flex h-full w-full flex-col items-center justify-center gap-3">
					<LoadingBar center class="h-12 w-1/2 min-w-[320px]" />
				</div>
			}
		>
			{(character) => (
				<Show when={dataConfig()}>
					{(validDataConfig) => {
						const cfg = validDataConfig()(dictionary);
						return (
							<Motion.div
								animate={{ opacity: [0, 1] }}
								exit={{ opacity: 0 }}
								transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
								class="CharacterPage relative flex h-full w-full flex-col overflow-hidden"
							>
								<div class={`Title w-full flex gap-2`}>
									<Select
										value={character().name}
										setValue={(value) => {
											navigate(`/character/${value}`);
										}}
										options={characters()?.map((character) => ({ label: character.name, value: character.id })) ?? []}
										placeholder={character().name}
										styleLess
										textCenter
									/>
									<Button
										icon={<Icons.Outline.AddUser />}
										level="quaternary"
										onClick={async () => {
											const character = await createCharacter();
											navigate(`/character/${character.id}`);
										}}
									/>
								</div>
								<div class="Content flex h-full w-full flex-1 flex-col overflow-hidden p-6 landscape:flex-row">
									{/* 配置版块 */}
									<Show when={panelMode() === "Config" || media.width >= 1024}>
										{/* 角色视图 */}
										<div class="CharacterView hidden w-full flex-1 h-48 overflow-hidden portrait:block">
											<canvas ref={setCanvas} class="border-dividing-color block h-full w-full rounded-md border">
												当前浏览器不支持canvas，尝试更换Google Chrome浏览器尝试
											</canvas>
										</div>
										<div class="Divider landscape:bg-dividing-color flex-none portrait:h-6 portrait:w-full landscape:mx-2 landscape:hidden landscape:h-full landscape:w-px"></div>

										{/* 标签栏 */}
										<OverlayScrollbarsComponent
											element="div"
											options={{ scrollbars: { visibility: "hidden" } }}
											defer
											class="flex-none portrait:w-full landscape:w-fit"
										>
											<div class={`flex flex-row items-start gap-2 landscape:flex-col`}>
												<Button
													onClick={() => setActiveTab("combo")}
													level={activeTab() === "combo" ? "primary" : "quaternary"}
													icon={<Icons.Outline.Gamepad />}
													textAlign="left"
													class="flex-none landscape:w-full"
												>
													{dictionary().ui.character.tabs.combo}
												</Button>
												<Button
													onClick={() => setActiveTab("equipment")}
													level={activeTab() === "equipment" ? "primary" : "quaternary"}
													icon={<Icons.Outline.Category />}
													textAlign="left"
													class="flex-none landscape:w-full"
												>
													{dictionary().ui.character.tabs.equipment.selfName}
												</Button>
												<Button
													onClick={() => setActiveTab("consumable")}
													level={activeTab() === "consumable" ? "primary" : "quaternary"}
													icon={<Icons.Outline.Sale />}
													textAlign="left"
													class="flex-none landscape:w-full"
												>
													{dictionary().ui.character.tabs.consumable}
												</Button>
												<Button
													onClick={() => setActiveTab("cooking")}
													level={activeTab() === "cooking" ? "primary" : "quaternary"}
													icon={<Icons.Outline.Coupon2 />}
													textAlign="left"
													class="flex-none landscape:w-full"
												>
													{dictionary().ui.character.tabs.cooking}
												</Button>
												<Button
													onClick={() => setActiveTab("registlet")}
													level={activeTab() === "registlet" ? "primary" : "quaternary"}
													icon={<Icons.Outline.CreditCard />}
													textAlign="left"
													class="flex-none landscape:w-full"
												>
													{dictionary().ui.character.tabs.registlet}
												</Button>
												<Button
													onClick={() => setActiveTab("skill")}
													level={activeTab() === "skill" ? "primary" : "quaternary"}
													icon={<Icons.Outline.Scale />}
													textAlign="left"
													class="flex-none landscape:w-full"
												>
													{dictionary().ui.character.tabs.skill}
												</Button>
												<Button
													onClick={() => setActiveTab("ability")}
													level={activeTab() === "ability" ? "primary" : "quaternary"}
													icon={<Icons.Outline.Filter />}
													textAlign="left"
													class="flex-none landscape:w-full"
												>
													{dictionary().ui.character.tabs.ability}
												</Button>
												<Button
													onClick={() => setActiveTab("base")}
													level={activeTab() === "base" ? "primary" : "quaternary"}
													icon={<Icons.Outline.Edit />}
													textAlign="left"
													class="flex-none landscape:w-full"
												>
													{dictionary().ui.character.tabs.base}
												</Button>
											</div>
										</OverlayScrollbarsComponent>
										<div class="Divider landscape:bg-dividing-color flex-none portrait:h-6 portrait:w-full landscape:mx-2 landscape:h-full landscape:w-px"></div>

										<div class="Config flex flex-col gap-2 w-full lg:w-[30dvw] lg:flex-none">
											<OverlayScrollbarsComponent
												element="div"
												options={{ scrollbars: { autoHide: "scroll" } }}
												defer
												class="flex flex-none w-full h-full"
											>
												{/* 装备 */}
												<Show when={activeTab() === "equipment"}>
													<EquipmentPanel
														slots={{
															mainHand: character().weapon,
															subHand: character().subWeapon,
															armor: character().armor,
															additional: character().option,
															special: character().special,
														}}
														onPickRequested={openEquipmentPicker}
														onClearRequested={clearEquipmentSlot}
														onItemPreviewRequested={previewEquipmentItem}
													/>
												</Show>

												{/* 基本配置 */}
												<Show when={activeTab() === "base"}>
													<div class="BasicConfig flex flex-col gap-2">
														<div class="BasicConfigItem flex flex-col gap-2">
															<div class="BasicConfigItemLabel">角色名称</div>
															<Input
																type="text"
																value={character().name}
																onChange={async (e) => {
																	await commitCharacterPatch({
																		name: e.target.value,
																	});
																}}
																description="请输入角色名称"
															/>
														</div>
													</div>
												</Show>

												{/* 能力值版块 */}
												<Show when={activeTab() === "ability"}>
													<div class="AbilityConfig flex flex-col gap-2">
														<div class="Level flex flex-col gap-2">
															<div class="LevelLabel">{dictionary().db.character.fields.lv.key}</div>
															<RangeInput
																value={character().lv}
																setValue={(value) => {
																	queueCharacterPatch({
																		lv: value,
																	});
																}}
																min={1}
																max={300}
																showSlider={false}
															/>
														</div>
														<div class="Ability flex flex-col gap-2">
															<div class="AbilityLabel">ABI</div>
															<div class="AbilityValueGroup flex flex-col gap-2">
																<div class="Str flex items-center gap-2">
																	<div class="StrLabel">{dictionary().db.character.fields.str.key}</div>
																	<RangeInput
																		value={character().str}
																		setValue={(value) => {
																			queueCharacterPatch({
																				str: value,
																			});
																		}}
																		min={1}
																	/>
																</div>
																<div class="Int flex items-center gap-2">
																	<div class="IntLabel">{dictionary().db.character.fields.int.key}</div>
																	<RangeInput
																		value={character().int}
																		setValue={(value) => {
																			queueCharacterPatch({
																				int: value,
																			});
																		}}
																		min={1}
																	/>
																</div>
																<div class="Vit flex items-center gap-2">
																	<div class="VitLabel">{dictionary().db.character.fields.vit.key}</div>
																	<RangeInput
																		value={character().vit}
																		setValue={(value) => {
																			queueCharacterPatch({
																				vit: value,
																			});
																		}}
																		min={1}
																	/>
																</div>
																<div class="Agi flex items-center gap-2">
																	<div class="AgiLabel">{dictionary().db.character.fields.agi.key}</div>
																	<RangeInput
																		value={character().agi}
																		setValue={(value) => {
																			queueCharacterPatch({
																				agi: value,
																			});
																		}}
																		min={1}
																	/>
																</div>
																<div class="Dex flex items-center gap-2">
																	<div class="DexLabel">{dictionary().db.character.fields.dex.key}</div>
																	<RangeInput
																		value={character().dex}
																		setValue={(value) => {
																			queueCharacterPatch({
																				dex: value,
																			});
																		}}
																		min={1}
																	/>
																</div>
															</div>
														</div>
														<div class="PersonalityType flex flex-col gap-2">
															<div class="PersonalityTypeLabel">
																{dictionary().db.character.fields.personalityType.key}
															</div>
															<Select
																value={character().personalityType}
																setValue={async (value) => {
																	await commitCharacterPatch({
																		personalityType: value as CharacterPersonalityType,
																	});
																}}
																options={[
																	{
																		label: dictionary().db.character.fields.personalityType.enumMap.None,
																		value: "None",
																	},
																	{ label: dictionary().db.character.fields.personalityType.enumMap.Luk, value: "Luk" },
																	{ label: dictionary().db.character.fields.personalityType.enumMap.Cri, value: "Cri" },
																	{ label: dictionary().db.character.fields.personalityType.enumMap.Tec, value: "Tec" },
																	{ label: dictionary().db.character.fields.personalityType.enumMap.Men, value: "Men" },
																]}
															/>
														</div>
														<div class="PersonalityValue flex flex-col gap-2">
															<div class="PersonalityValueLabel">
																{dictionary().db.character.fields.personalityValue.key}
															</div>
															<RangeInput
																value={character().personalityValue}
																setValue={(value) => {
																	queueCharacterPatch({
																		personalityValue: value,
																	});
																}}
																min={1}
																max={255}
																showSlider={false}
															/>
														</div>
													</div>
												</Show>
											</OverlayScrollbarsComponent>
										</div>
									</Show>

									{/* 属性面板 */}
									<Show when={panelMode() === "AttrPreview" || media.width >= 1024}>
										<div class="Divider landscape:bg-dividing-color flex-none portrait:hidden landscape:mx-2 landscape:h-full landscape:w-px" />
										<OverlayScrollbarsComponent
											element="div"
											options={{ scrollbars: { autoHide: "scroll" } }}
											defer
											class="MemberStats flex flex-col gap-2 w-full landscape:flex-none"
										>
											<StatsRenderer data={primaryMember()?.attrs} />
										</OverlayScrollbarsComponent>
									</Show>

									{/* 控制栏 */}
									<Presence exitBeforeEnter>
										<Show when={media.width < 1024}>
											<Motion.div
												class="Control bg-primary-color shadow-dividing-color shadow-dialog absolute bottom-3 left-1/2 z-10 flex gap-1 rounded p-1 landscape:bottom-6"
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

								{/* 弹窗 */}
								<Portal>
									<Sheet
										state={selectSheetIsOpen()}
										setState={(state) => {
											setSelectSheetIsOpen(state);
											setGlobalFilterStr("");
										}}
									>
										<div class="flex h-[90dvh] w-full flex-col gap-2 p-6">
											<div class="SheetTitle w-full text-xl font-bold flex items-center justify-between">
												{selectSheetTitle()}
												<Button
													icon={<Icons.Outline.Close />}
													level="quaternary"
													class="rounded-none rounded-tr"
													onClick={() => {
														setSelectSheetIsOpen(false);
														setGlobalFilterStr("");
													}}
												/>
											</div>
											<Input
												type="text"
												value={globalFilterStr()}
												onInput={(e) => setGlobalFilterStr(e.target.value)}
											/>
											{VirtualTable({
												measure: cfg.table.measure,
												data: liveTableRows.rows,
												dataLoading: () => liveTableRows.status() === "loading",
												columnsDef: cfg.table.columnsDef,
												hiddenColumnDef: cfg.table.hiddenColumnDef,
												tdGenerator: cfg.table.tdGenerator,
												defaultSort: cfg.table.defaultSort,
												dictionary: cfg.dictionary,
												globalFilterStr: () => globalFilterStr(),
												rowHandleClick: (data) =>
													setStore("pages", "cardGroup", store.pages.cardGroup.length, {
														type: dialogVistualTableType(),
														data,
													}),
												columnVisibility: dialogTableColumnVisibility(),
												onColumnVisibilityChange: (updater) => {
													if (typeof updater === "function") {
														setDialogTableColumnVisibility(updater(dialogTableColumnVisibility()));
													}
												},
											})}
										</div>
									</Sheet>
								</Portal>
							</Motion.div>
						);
					}}
				</Show>
			)}
		</Show>
	);
}
