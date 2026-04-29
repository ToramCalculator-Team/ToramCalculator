import { getPrimaryKeys } from "@db/generated/dmmf-utils";
import {
	type CharacterWithRelations,
	selectAllCharactersByBelongtoplayerid,
	updateCharacter,
} from "@db/generated/repositories/character";
import type { MemberWithRelations } from "@db/generated/repositories/member";
import { selectPlayerByIdWithRelations } from "@db/generated/repositories/player";
import type { PlayerArmorWithRelations } from "@db/generated/repositories/player_armor";
import type { PlayerOptionWithRelations } from "@db/generated/repositories/player_option";
import type { PlayerSpecialWithRelations } from "@db/generated/repositories/player_special";
import type { PlayerWeaponWithRelations } from "@db/generated/repositories/player_weapon";
import type { TeamWithRelations } from "@db/generated/repositories/team";
import type { character, DB } from "@db/generated/zod";
import { useNavigate, useParams } from "@solidjs/router";
import type { VisibilityState } from "@tanstack/solid-table";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import {
	type Accessor,
	createEffect,
	createMemo,
	createResource,
	createSignal,
	For,
	on,
	onCleanup,
	onMount,
	Show,
	useContext,
} from "solid-js";
import { Portal } from "solid-js/web";
import { Motion, Presence } from "solid-motionone";
import { DATA_CONFIG, type TableDataConfig } from "~/components/business/data-config";
import { Sheet } from "~/components/containers/sheet";
import { Button } from "~/components/controls/button";
import { Input } from "~/components/controls/input";
import { LoadingBar } from "~/components/controls/loadingBar";
import { Select } from "~/components/controls/select";
import { VirtualTable } from "~/components/dataDisplay/virtualTable";
import { AbiPanel } from "~/components/features/character/AbiPanel";
import { CharacterView } from "~/components/features/character/CharacterView";
import { EquipmentPanel, type EquipmentSlot } from "~/components/features/character/EquipmentPanel";
import { Icons } from "~/components/icons";
import { useDictionary } from "~/contexts/Dictionary";
import { MediaContext } from "~/contexts/Media";
import { useEngine } from "~/lib/engine/core/thread/EngineContext";
import { createPreviewConfig, type EngineScenarioData } from "~/lib/engine/core/types";
import { StatsRenderer } from "~/lib/engine/core/World/Member/MemberStatusPanel";
import { createLogger } from "~/lib/Logger";
import { createLiveKyselyQuery } from "~/lib/liveQuery";
import type { Dictionary } from "~/locales/type";
import { setStore, store } from "~/store";
import { createCharacter } from "./createCharacter";

const logger = createLogger("CharacterPage");

export default function CharactePage() {
	const navigate = useNavigate();
	const dictionary = useDictionary();
	const media = useContext(MediaContext);

	// 从url获取机体id参数
	const params = useParams();

	// 面板模式
	type PanelModeType = "Config" | "AttrPreview" | "SkillPreview";
	const [panelMode, setPanelMode] = createSignal<PanelModeType>("Config");

	// 页面数据获取
	const [playerWithRelations, { refetch: refetchPlayerWithRelations }] = createResource(
		() => params.characterId,
		async () => {
			const playerId = store.session.account.player?.id;
			if (!playerId) return null;
			const player = await selectPlayerByIdWithRelations(playerId);
			logger.info("player", player);
			return player;
		},
	);
	const character = createMemo(() => {
		const player = playerWithRelations();
		if (!player) return null;
		const character = player.characters.find((c) => c.id === params.characterId);
		if (!character) return null;
		logger.info("character", character);
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

	// 监听玩家配置变化，更新引擎场景数据
	createEffect(
		on(
			() => ({
				ready: engine.ready(),
				playerWithRelations: playerWithRelations(),
			}),
			async () => {
				if (!engine.ready()) return null;
				logger.info("玩家配置发生变化，将更新引擎初始化数据");

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
						logger.info("loading scenario", scenario);
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
		logger.info("primaryMember", primaryMember);
		return primaryMember;
	});

	// 抽屉状态管理
	const [sheetIsOpen, setSheetIsOpen] = createSignal(false);
	const [sheetTitle, setSheetTitle] = createSignal("");

	// 选择器（表格）状态管理
	const [isSelectorOpen, setIsSelectorOpen] = createSignal(false);
	const [selectorType, setSelectorType] = createSignal<keyof DB>("player_weapon");
	const [selectorColumnVisibility, setSelectorColumnVisibility] = createSignal<VisibilityState>({});
	const [selectorPrimaryKey, setSelectorPrimaryKey] = createSignal<string>("");

	// 对应character的字段
	const [dataSolt, setDataSolt] = createSignal<keyof CharacterWithRelations>("id");

	const EquipmentSelector = <T extends Record<string, unknown>>(
		dataConfig: TableDataConfig<T>,
		dictionary: Accessor<Dictionary>,
		rowClickHandler: (data: T) => void,
	) => {
		const cfg = dataConfig(dictionary);
		if (!cfg) return null;

		// 响应式订阅当前表的行数据（如果 dataConfig 声明了 liveQuery）。
		// 切换 wikiStore.type 时，createEffect 内部会自动退订旧订阅、订阅新表。
		const liveTableRows = createLiveKyselyQuery((db) => {
			if (!cfg) return null;
			const liveQueryBuilder = cfg.dataFetcher.liveQuery;
			if (!liveQueryBuilder) return null;
			return liveQueryBuilder(db);
		});
		const [selectorFilterStr, setSelectorFilterStr] = createSignal("");

		return (
			<>
				<Input type="text" value={selectorFilterStr()} onInput={(e) => setSelectorFilterStr(e.target.value)} />
				<VirtualTable
					measure={cfg.table.measure}
					data={liveTableRows.rows}
					primaryKey={cfg.primaryKey}
					columnsDef={cfg.table.columnsDef}
					hiddenColumnDef={cfg.table.hiddenColumnDef}
					tdGenerator={cfg.table.tdGenerator}
					defaultSort={cfg.table.defaultSort}
					dictionary={cfg.dictionary}
					globalFilterStr={selectorFilterStr}
					rowHandleClick={rowClickHandler}
					columnVisibility={selectorColumnVisibility()}
					onColumnVisibilityChange={(updater) => {
						if (typeof updater === "function") {
							setSelectorColumnVisibility(updater(selectorColumnVisibility()));
						}
					}}
				/>
			</>
		);
	};

	const equipmentSlotConfig: Record<EquipmentSlot, keyof DB> = {
		weaponId: "player_weapon",
		subWeaponId: "player_weapon",
		armorId: "player_armor",
		optionId: "player_option",
		specialId: "player_special",
	};

	// 打开装备选择器
	const openEquipmentPicker = (slot: EquipmentSlot) => {
		// 将抽屉内容设置为选择器
		setIsSelectorOpen(true);
		setDataSolt(slot);
		const tableType = equipmentSlotConfig[slot];
		const primaryKey = getPrimaryKeys(tableType)[0];
		if (!primaryKey) return;
		logger.info("tableType", tableType, "primaryKey", primaryKey);
		setSheetTitle(dictionary().db[tableType].selfName);
		setSelectorType(tableType);
		setSelectorPrimaryKey(primaryKey);
		setSheetIsOpen(true);
	};

	// 清空装备槽
	const clearEquipmentSlot = (slot: EquipmentSlot) => {
		queueCharacterPatch({
			[slot]: "",
		} as Partial<character>);
	};

	// 装备属性预览
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

	const dataConfig = createMemo(() => DATA_CONFIG[selectorType()]);

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

	onMount(() => {
		logger.info("--CharacterIdPage render");
	});

	onCleanup(() => {
		if (rangeUpdateTimer !== undefined) {
			window.clearTimeout(rangeUpdateTimer);
		}
		logger.info("--CharacterIdPage unmount");
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
						return (
							<Motion.div
								animate={{ opacity: [0, 1] }}
								exit={{ opacity: 0 }}
								transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
								class="CharacterPage relative flex h-full w-full flex-col overflow-hidden"
							>
								{/* 角色选择器 */}
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
										<CharacterView character={character()} />
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
													{dictionary().ui.character.tabs.skill.selfName}
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
													{dictionary().ui.character.tabs.base.selfName}
												</Button>
											</div>
										</OverlayScrollbarsComponent>
										<div class="Divider landscape:bg-dividing-color flex-none portrait:h-6 portrait:w-full landscape:mx-2 landscape:h-full landscape:w-px"></div>

										{/* 配置面板组 */}
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
														onPickRequested={(slot) => openEquipmentPicker(slot)}
														onClearRequested={clearEquipmentSlot}
														onItemPreviewRequested={previewEquipmentItem}
													/>
												</Show>

												{/* 基本配置 */}
												<Show when={activeTab() === "base"}>
													<div class="BasicConfig flex flex-col gap-2">
														<div class="BasicConfigItem flex flex-col gap-2">
															<div class="BasicConfigItemLabel">{dictionary().ui.character.tabs.base.name}</div>
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
													<AbiPanel
														slots={{
															lv: character().lv,
															str: character().str,
															int: character().int,
															vit: character().vit,
															agi: character().agi,
															dex: character().dex,
															personalityType: character().personalityType,
															personalityValue: character().personalityValue,
														}}
														onChangeRequested={async (slot, value) => {
															await commitCharacterPatch({
																[slot]: value,
															});
														}}
													/>
												</Show>

												{/* 技能 */}
												<Show when={activeTab() === "skill"}>
													<div class="SkillConfig flex flex-col gap-2">
														<div class="SkillTree flex flex-col">
															<div class="SkillConfigLabel flex justify-between">
																<span class="font-bold">{dictionary().ui.character.tabs.skill.treeSkill}</span>
																<Button
																	icon={<Icons.Outline.DocmentAdd />}
																	level="quaternary"
																	onClick={() => {
																		console.log("add skill");
																	}}
																/>
															</div>
															<For each={character().skills.filter((skill) => !skill.isStarGem)}>
																{(skill, index) => (
																	<button
																		type="button"
																		class={`SkillItem flex flex-col gap-2 py-3 ${index() === character().skills.length - 1 ? "" : "border-b border-dividing-color"}`}
																	>
																		<div class="w-full h-full flex items-center">
																			<div
																				class={`Label w-full flex gap-1 px-4 py-3 border-l-2 ${
																					{
																						0: "border-brand-color-1st",
																						1: "border-brand-color-2nd",
																						2: "border-brand-color-3rd",
																						3: "border-brand-color-4th",
																					}[index() % 4]
																				}`}
																			>
																				{skill.template.name}
																			</div>
																			<div class="flex flex-none w-14 px-4 py-3">
																				<Button
																					icon={<Icons.Outline.Edit />}
																					level="quaternary"
																					onClick={() => console.log("edit skill")}
																				/>
																				<Button
																					icon={<Icons.Outline.Trash />}
																					level="quaternary"
																					onClick={() => console.log("delete skill")}
																				/>
																			</div>
																		</div>
																	</button>
																)}
															</For>
														</div>
														<div class="StarGem flex flex-col">
															<div class="StarGemLabel flex justify-between">
																<span class="font-bold">{dictionary().ui.character.tabs.skill.starGem}</span>
																<Button
																	icon={<Icons.Outline.DocmentAdd />}
																	level="quaternary"
																	onClick={() => {
																		console.log("add skill");
																	}}
																/>
															</div>
															<For each={character().skills.filter((skill) => skill.isStarGem)}>
																{(skill) => (
																	<div class="SkillItem flex flex-col gap-2">
																		<div class="SkillItemLabel">{skill.template.name}</div>
																	</div>
																)}
															</For>
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
										state={sheetIsOpen()}
										setState={(state) => {
											setSheetIsOpen(state);
										}}
									>
										<div class="flex h-[90dvh] w-full flex-col gap-2 p-6">
											<div class="sheetTitle w-full text-xl font-bold flex items-center justify-between">
												{sheetTitle()}
												<Button
													icon={<Icons.Outline.Close />}
													level="quaternary"
													class="rounded-none rounded-tr"
													onClick={() => {
														setSheetIsOpen(false);
														setIsSelectorOpen(false);
													}}
												/>
											</div>
											<Show when={isSelectorOpen()}>
												{EquipmentSelector(validDataConfig(), dictionary, (data) => {
													const dataPrimaryValue = data[selectorPrimaryKey()];
													if (!dataPrimaryValue) return;
													logger.info("commitCharacterPatch", {
														[dataSolt()]: dataPrimaryValue,
													});
													commitCharacterPatch({
														[dataSolt()]: dataPrimaryValue,
													});
													setSheetIsOpen(false);
													setSelectorColumnVisibility({});
												})}
											</Show>
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
