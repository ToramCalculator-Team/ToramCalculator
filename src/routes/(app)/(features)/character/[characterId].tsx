import { useNavigate, useParams } from "@solidjs/router";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createEffect, createMemo, createResource, createSignal, on, onCleanup, onMount, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { type CharacterEntityRuntime, EntityFactory } from "~/components/features/simulator/render/RendererController";
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
import {
	selectAllCharactersByBelongtoplayerid,
	selectCharacterById,
	updateCharacter,
} from "@db/generated/repositories/character";
import { selectAllCharacterRegistletsByBelongtocharacterid } from "@db/generated/repositories/character_registlet";
import { selectAllCharacterSkillsByBelongtocharacterid } from "@db/generated/repositories/character_skill";
import { selectAllCombosByBelongtocharacterid } from "@db/generated/repositories/combo";
import { selectAllConsumablesByCharacterId } from "@db/generated/repositories/consumable";
import type { MemberWithRelations } from "@db/generated/repositories/member";
import { selectPlayerByIdWithRelations } from "@db/generated/repositories/player";
import { selectPlayerArmorById } from "@db/generated/repositories/player_armor";
import { selectPlayerOptionById } from "@db/generated/repositories/player_option";
import { selectPlayerSpecialById } from "@db/generated/repositories/player_special";
import { selectPlayerWeaponById } from "@db/generated/repositories/player_weapon";
import type { TeamWithRelations } from "@db/generated/repositories/team";
import type { character, DB } from "@db/generated/zod";
import { Motion } from "solid-motionone";
import { DATA_CONFIG } from "~/components/business/data-config";
import { Sheet } from "~/components/containers/sheet";
import { Button } from "~/components/controls/button";
import { Input } from "~/components/controls/input";
import { LoadingBar } from "~/components/controls/loadingBar";
import { Select } from "~/components/controls/select";
import { VirtualTable } from "~/components/dataDisplay/virtualTable";
import { useEngine } from "~/components/features/simulator/core/thread/EngineContext";
import { createPreviewProfile, type EngineScenarioData } from "~/components/features/simulator/core/types";
import { StatsRenderer } from "~/components/features/simulator/core/World/Member/MemberStatusPanel";
import { Icons } from "~/components/icons";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import { createCharacter } from "./createCharacter";

export default function CharactePage() {
	// UI文本字典
	const dictionary = createMemo(() => getDictionary(store.settings.userInterface.language));

	const navigate = useNavigate();

	const params = useParams();
	const [character, { refetch: refetchCharacter }] = createResource(
		() => params.characterId,
		async (id) => {
			const result = await selectCharacterById(id);
			// console.log("selected character", result);
			return result;
		},
	);
	const [mainWeapon, { refetch: refetchMainWeapon }] = createResource(
		() => character()?.weaponId,
		async (id) => {
			const result = await selectPlayerWeaponById(id);
			// console.log("selected main weapon", result);
			return result;
		},
	);
	const [subWeapon, { refetch: refetchSubWeapon }] = createResource(
		() => character()?.subWeaponId,
		async (id) => {
			const result = await selectPlayerWeaponById(id);
			// console.log("selected sub weapon", result);
			return result;
		},
	);
	const [armor, { refetch: refetchArmor }] = createResource(
		() => character()?.armorId,
		async (id) => {
			const result = await selectPlayerArmorById(id);
			// console.log("selected armor", result);
			return result;
		},
	);
	const [option, { refetch: refetchOption }] = createResource(
		() => character()?.optionId,
		async (id) => {
			const result = await selectPlayerOptionById(id);
			// console.log("selected option", result);
			return result;
		},
	);
	const [special, { refetch: refetchSpecial }] = createResource(
		() => character()?.specialId,
		async (id) => {
			const result = await selectPlayerSpecialById(id);
			// console.log("selected special", result);
			return result;
		},
	);
	const [skills, { refetch: refetchSkills }] = createResource(
		() => character()?.id,
		async (id) => {
			const result = await selectAllCharacterSkillsByBelongtocharacterid(id);
			// console.log("selected skills", result);
			return result;
		},
	);
	const [registlets, { refetch: refetchRegistlets }] = createResource(
		() => character()?.id,
		async (id) => {
			const result = await selectAllCharacterRegistletsByBelongtocharacterid(id);
			// console.log("selected registlets", result);
			return result;
		},
	);
	const [consumables, { refetch: refetchConsumables }] = createResource(
		() => character()?.id,
		async (id) => {
			const result = await selectAllConsumablesByCharacterId(id);
			// console.log("selected consumables", result);
			return result;
		},
	);
	const [combos, { refetch: refetchCombos }] = createResource(
		() => character()?.id,
		async (id) => {
			const result = await selectAllCombosByBelongtocharacterid(id);
			// console.log("selected combos", result);
			return result;
		},
	);

	const charactersFinder = (id: string) => selectAllCharactersByBelongtoplayerid(id);
	const [characters, { refetch: refetchCharacters }] = createResource(
		() => store.session.account.player?.id ?? "",
		charactersFinder,
	);

	const [playerWithRelations, { refetch: refetchPlayerWithRelations }] = createResource(
		() => character()?.belongToPlayerId ?? null,
		async (playerId) => {
			if (!playerId) return null;
			const player = await selectPlayerByIdWithRelations(playerId);
			console.log("player", player);
			return player;
		},
	);

	// ==================== 引擎集成 ====================
	const engine = useEngine();

	const previewScenario = createMemo<EngineScenarioData | null>(() => {
		const currentCharacter = character();
		const player = playerWithRelations();
		if (!currentCharacter || !player) return null;
		if (!player.id) return null;
		if (!Array.isArray(player.characters) || player.characters.length === 0) return null;

		const now = new Date().toISOString();
		const teamAId = "CHARACTER_PREVIEW_TEAM_A";
		const teamBId = "CHARACTER_PREVIEW_TEAM_B";
		const memberId = "CHARACTER_PREVIEW_MEMBER";
		const statisticId = "CHARACTER_PREVIEW_STATISTIC";

		const member: MemberWithRelations = {
			id: memberId,
			name: currentCharacter.name ?? "未命名角色",
			sequence: 0,
			type: "Player",
			playerId: player.id,
			partnerId: null,
			mercenaryId: null,
			mobId: null,
			mobDifficultyFlag: "Normal",
			actions: null,
			belongToTeamId: teamAId,
			player,
			partner: null,
			mercenary: null,
			mob: null,
		};

		const teamA: TeamWithRelations = {
			id: teamAId,
			name: "CharacterPreviewTeamA",
			gems: [],
			members: [member],
		};
		const teamB: TeamWithRelations = {
			id: teamBId,
			name: "CharacterPreviewTeamB",
			gems: [],
			members: [],
		};

		return {
			simulator: {
				id: "CHARACTER_PREVIEW_SIMULATOR",
				name: "CharacterPreviewSimulator",
				details: null,
				statisticId,
				updatedByAccountId: null,
				createdByAccountId: null,
				campA: [teamA],
				campB: [teamB],
				statistic: {
					id: statisticId,
					updatedAt: now,
					createdAt: now,
					usageTimestamps: [],
					viewTimestamps: [],
				},
			},
			runtimeSelection: {
				primaryMemberId: memberId,
				activeCharacterId: currentCharacter.id ?? "",
			},
		};
	});

	createEffect(
		on(
			() => ({
				ready: engine.ready(),
				scenario: previewScenario(),
			}),
			async ({ ready, scenario }) => {
				if (!ready || !scenario) return;
				console.log("玩家配置发生变化，将更新引擎初始化数据", scenario);
				try {
					await engine.loadScenario(scenario);
					await engine.setProfile(createPreviewProfile());
				} catch (error) {
					console.error("Character 页加载预览场景失败", error);
				}
			},
		),
	);

	const primaryMember = createMemo(() => {
		const list = engine.members();
		const primaryMember = list.find((member) => member.id === "CHARACTER_PREVIEW_MEMBER");
		console.log("primaryMember", primaryMember);
		return primaryMember;
	});

	const [selectSheetIsOpen, setSelectSheetIsOpen] = createSignal(false);
	const [selectSheetTitle, setSelectSheetTitle] = createSignal("");
	const [dialogVistualTableType, setDialogVistualTableType] = createSignal<keyof DB>("player_weapon");
	const [operateTarget, setOperateTarget] = createSignal<keyof character>("weaponId");
	const [globalFilterStr, setGlobalFilterStr] = createSignal("");

	const tabs = {
		combo: { label: dictionary().ui.character.tabs.combo, value: "combo" },
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
						// characterEntity.animationController.playBuiltinAnimation(BuiltinAnimationType.WALK);
					}, 10);
			},
		),
	);

	onMount(() => {
		console.log("--CharacterIdPage render");
	});

	onCleanup(() => {
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
				<Motion.div
					animate={{ opacity: [0, 1] }}
					exit={{ opacity: 0 }}
					transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
					class="CharacterPage flex h-full w-full flex-col overflow-hidden"
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
						{/* 角色视图 */}
						<div class="CharacterView hidden w-full flex-1 max-h-48 overflow-hidden portrait:block">
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

						{/* 装备 */}
						<Show when={activeTab() === "equipment"}>
							<OverlayScrollbarsComponent
								element="div"
								options={{ scrollbars: { autoHide: "scroll" } }}
								defer
								class="flex flex-none portrait:w-full landscape:w-1/2"
							>
								<div class={`flex w-full flex-none gap-3 portrait:flex-wrap landscape:flex-col`}>
									{/* 主手 */}
									<section
										role="application"
										onClick={() => {
											const weaponId = character().weaponId;
											if (weaponId) {
												setStore("pages", "cardGroup", store.pages.cardGroup.length, {
													type: "player_weapon",
													id: weaponId,
												});
											}
										}}
										onKeyUp={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												e.stopPropagation();
											}
										}}
										class="MainHand  border-dividing-color flex flex-col gap-1 overflow-hidden backdrop-blur portrait:w-[calc(50%-6px)] portrait:rounded portrait:border landscape:w-full landscape:border-b"
									>
										<div class="Label px-4 py-3">{dictionary().ui.character.tabs.equipment.mainHand}</div>
										<div class="Selector flex w-full items-center gap-2 overflow-hidden px-4 text-ellipsis whitespace-nowrap">
											<Show when={mainWeapon()} fallback={<Icons.Spirits iconName="unknown" size={36} />}>
												{(mainWeapon) => (
													<>
														<Icons.Spirits iconName={mainWeapon().type ?? ""} size={36} />
														{mainWeapon().name}
													</>
												)}
											</Show>
										</div>
										<button type="button" onClick={(e) => e.stopPropagation()} class="Function flex flex-none">
											<Button
												icon={<Icons.Outline.Category />}
												level="quaternary"
												class="rounded-none"
												onClick={() => {
													// 打开装备选择器
													setSelectSheetIsOpen(true);
													setDialogVistualTableType("player_weapon");
													setOperateTarget("weaponId");
													setSelectSheetTitle(dictionary().ui.character.tabs.equipment.mainHand);
												}}
											/>
											<Show
												when={character().weaponId}
												fallback={
													<Button
														icon={<Icons.Outline.DocmentAdd />}
														level="quaternary"
														class="rounded-none rounded-tr"
													/>
												}
											>
												<Button
													icon={<Icons.Outline.Trash />}
													level="quaternary"
													class="rounded-none rounded-tr"
													onClick={async () => {
														await updateCharacter(character().id, {
															weaponId: "",
														});
														await refetchCharacter();
													}}
												/>
											</Show>
										</button>
									</section>
									{/* 副手 */}
									<section
										role="application"
										onClick={() => {
											const subWeaponId = character().subWeaponId;
											if (subWeaponId) {
												setStore("pages", "cardGroup", store.pages.cardGroup.length, {
													type: "player_weapon",
													id: subWeaponId,
												});
											}
										}}
										onKeyUp={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												e.stopPropagation();
											}
										}}
										class="SubHand  border-dividing-color flex flex-col gap-1 overflow-hidden backdrop-blur portrait:w-[calc(50%-6px)] portrait:rounded portrait:border landscape:w-full landscape:border-b"
									>
										<div class="Label px-4 py-3">{dictionary().ui.character.tabs.equipment.subHand}</div>
										<div class="Selector flex w-full items-center gap-2 overflow-hidden px-4 text-ellipsis whitespace-nowrap">
											<Show when={subWeapon()} fallback={<Icons.Spirits iconName="unknown" size={36} />}>
												{(subWeapon) => (
													<>
														<Icons.Spirits iconName={subWeapon().type ?? ""} size={36} />
														{subWeapon().name}
													</>
												)}
											</Show>
										</div>
										<button type="button" onClick={(e) => e.stopPropagation()} class="Function flex flex-none">
											<Button
												icon={<Icons.Outline.Category />}
												level="quaternary"
												class="rounded-none"
												onClick={() => {
													// 打开装备选择器
													setSelectSheetIsOpen(true);
													setDialogVistualTableType("player_weapon");
													setOperateTarget("subWeaponId");
													setSelectSheetTitle(dictionary().ui.character.tabs.equipment.subHand);
												}}
											/>
											<Show
												when={character().subWeaponId}
												fallback={
													<Button
														icon={<Icons.Outline.DocmentAdd />}
														level="quaternary"
														class="rounded-none rounded-tr"
													/>
												}
											>
												<Button
													icon={<Icons.Outline.Trash />}
													level="quaternary"
													class="rounded-none rounded-tr"
													onClick={async () => {
														await updateCharacter(character().id, {
															subWeaponId: "",
														});
														await refetchCharacter();
													}}
												/>
											</Show>
										</button>
									</section>
									{/* 防具 */}
									<section
										role="application"
										onClick={() => {
											const armorId = character().armorId;
											if (armorId) {
												setStore("pages", "cardGroup", store.pages.cardGroup.length, {
													type: "player_armor",
													id: armorId,
												});
											}
										}}
										onKeyUp={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												e.stopPropagation();
											}
										}}
										class="Armor  border-dividing-color flex w-full flex-col overflow-hidden backdrop-blur portrait:flex-row portrait:rounded portrait:border portrait:py-2 landscape:border-b"
									>
										<div class="Label px-4 py-3 portrait:hidden">{dictionary().ui.character.tabs.equipment.armor}</div>
										<div class="Selector flex w-full items-center gap-2 overflow-hidden px-4 text-ellipsis whitespace-nowrap">
											<Show when={armor()} fallback={<Icons.Spirits iconName="unknown" size={36} />}>
												{(armor) => (
													<>
														<Icons.Spirits iconName={armor().ability ?? ""} size={36} />
														{armor().name}
													</>
												)}
											</Show>
										</div>
										<button type="button" onClick={(e) => e.stopPropagation()} class="Function flex flex-none">
											<Button
												icon={<Icons.Outline.Category />}
												level="quaternary"
												class="rounded-none"
												onClick={() => {
													// 打开装备选择器
													setSelectSheetIsOpen(true);
													setDialogVistualTableType("player_armor");
													setOperateTarget("armorId");
													setSelectSheetTitle(dictionary().ui.character.tabs.equipment.armor);
												}}
											/>
											<Show
												when={character().armorId}
												fallback={
													<Button
														icon={<Icons.Outline.DocmentAdd />}
														level="quaternary"
														class="rounded-none rounded-tr"
													/>
												}
											>
												<Button
													icon={<Icons.Outline.Trash />}
													level="quaternary"
													class="rounded-none rounded-tr"
													onClick={async () => {
														await updateCharacter(character().id, {
															armorId: "",
														});
														await refetchCharacter();
													}}
												/>
											</Show>
										</button>
									</section>
									{/* 追加 */}
									<section
										role="application"
										onClick={() => {
											const optionId = character().optionId;
											if (optionId) {
												setStore("pages", "cardGroup", store.pages.cardGroup.length, {
													type: "player_option",
													id: optionId,
												});
											}
										}}
										onKeyUp={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												e.stopPropagation();
											}
										}}
										class="OptEquip  border-dividing-color flex w-full flex-col overflow-hidden backdrop-blur portrait:flex-row portrait:rounded portrait:border portrait:py-2 landscape:border-b"
									>
										<div class="Label px-4 py-3 portrait:hidden">{dictionary().ui.character.tabs.equipment.option}</div>
										<div class="Selector flex w-full items-center gap-2 overflow-hidden px-4 text-ellipsis whitespace-nowrap">
											<Show when={option()} fallback={<Icons.Spirits iconName="unknown" size={36} />}>
												{(option) => (
													<>
														<Icons.Spirits iconName={"option"} size={36} />
														{option().name}
													</>
												)}
											</Show>
										</div>
										<button type="button" onClick={(e) => e.stopPropagation()} class="Function flex flex-none">
											<Button
												icon={<Icons.Outline.Category />}
												level="quaternary"
												class="rounded-none"
												onClick={() => {
													// 打开装备选择器
													setSelectSheetIsOpen(true);
													setDialogVistualTableType("player_option");
													setOperateTarget("optionId");
													setSelectSheetTitle(dictionary().ui.character.tabs.equipment.option);
												}}
											/>
											<Show
												when={character().optionId}
												fallback={
													<Button
														icon={<Icons.Outline.DocmentAdd />}
														level="quaternary"
														class="rounded-none rounded-tr"
													/>
												}
											>
												<Button
													icon={<Icons.Outline.Trash />}
													level="quaternary"
													class="rounded-none rounded-tr"
													onClick={async () => {
														await updateCharacter(character().id, {
															optionId: "",
														});
														await refetchCharacter();
													}}
												/>
											</Show>
										</button>
									</section>
									{/* 特殊 */}
									<section
										role="application"
										onClick={() => {
											const specialId = character().specialId;
											if (specialId) {
												setStore("pages", "cardGroup", store.pages.cardGroup.length, {
													type: "player_special",
													id: specialId,
												});
											}
										}}
										onKeyUp={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												e.stopPropagation();
											}
										}}
										class="SpeEquip  border-dividing-color flex w-full flex-col overflow-hidden backdrop-blur portrait:flex-row portrait:rounded portrait:border portrait:py-2 landscape:border-b"
									>
										<div class="Label px-4 py-3 portrait:hidden">
											{dictionary().ui.character.tabs.equipment.special}
										</div>
										<div class="Selector flex w-full items-center gap-2 overflow-hidden px-4 text-ellipsis whitespace-nowrap">
											<Show when={special()} fallback={<Icons.Spirits iconName="unknown" size={36} />}>
												{(special) => (
													<>
														<Icons.Spirits iconName={"special"} size={36} />
														{special().name}
													</>
												)}
											</Show>
										</div>
										<button type="button" onClick={(e) => e.stopPropagation()} class="Function flex flex-none">
											<Button
												icon={<Icons.Outline.Category />}
												level="quaternary"
												class="rounded-none"
												onClick={() => {
													// 打开装备选择器
													setSelectSheetIsOpen(true);
													setDialogVistualTableType("player_special");
													setOperateTarget("specialId");
													setSelectSheetTitle(dictionary().ui.character.tabs.equipment.special);
												}}
											/>
											<Show
												when={character().specialId}
												fallback={
													<Button
														icon={<Icons.Outline.DocmentAdd />}
														level="quaternary"
														class="rounded-none rounded-tr"
													/>
												}
											>
												<Button
													icon={<Icons.Outline.Trash />}
													level="quaternary"
													class="rounded-none rounded-tr"
													onClick={async () => {
														await updateCharacter(character().id, {
															specialId: "",
														});
														await refetchCharacter();
													}}
												/>
											</Show>
										</button>
									</section>
									{/* 时装 */}
								</div>
							</OverlayScrollbarsComponent>
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
											await updateCharacter(character().id, {
												name: e.target.value,
											});
											await refetchCharacter();
										}}
										description="请输入角色名称"
									/>
								</div>
							</div>
						</Show>

						{/* 属性面板 */}
						<div class="Divider landscape:bg-dividing-color flex-none portrait:h-6 portrait:w-full landscape:mx-2 landscape:h-full landscape:w-px" />
						<OverlayScrollbarsComponent
							element="div"
							options={{ scrollbars: { autoHide: "scroll" } }}
							defer
							class="MemberStats flex flex-col gap-2 w-full landscape:flex-none"
						>
							<StatsRenderer data={primaryMember()?.attrs} />
						</OverlayScrollbarsComponent>
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
								<Input type="text" value={globalFilterStr()} onInput={(e) => setGlobalFilterStr(e.target.value)} />
								{VirtualTable<DB[keyof DB]>({
									measure: DATA_CONFIG[dialogVistualTableType()]?.table.measure,
									primaryKeyField: getPrimaryKeys(dialogVistualTableType())[0],
									dataFetcher: async () => (await repositoryMethods[dialogVistualTableType()]?.selectAll?.()) ?? [],
									// @ts-expect-error-next-line  数组联合类型问题，暂时忽略
									columnsDef: DATA_CONFIG[dialogVistualTableType()]?.table.columnsDef,
									// @ts-expect-error-next-line  数组联合类型问题，暂时忽略
									hiddenColumnDef: DATA_CONFIG[dialogVistualTableType()]?.table.hiddenColumnDef,
									// @ts-expect-error-next-line  数组联合类型问题，暂时忽略
									tdGenerator: DATA_CONFIG[dialogVistualTableType()]?.table.tdGenerator,
									// @ts-expect-error-next-line  数组联合类型问题，暂时忽略
									defaultSort: DATA_CONFIG[dialogVistualTableType()]?.table.defaultSort,
									dictionary: dictionary().db[dialogVistualTableType()],
									globalFilterStr,
									rowHandleClick: async (id) => {
										console.log("目标数据外键id", id);
										await updateCharacter(character().id, {
											[operateTarget()]: id,
										});
										setGlobalFilterStr("");
										setSelectSheetIsOpen(false);
										await refetchCharacter();
									},
									columnVisibility: {},
									onColumnVisibilityChange: () => {},
								})}
							</div>
						</Sheet>
					</Portal>
				</Motion.div>
			)}
		</Show>
	);
}
