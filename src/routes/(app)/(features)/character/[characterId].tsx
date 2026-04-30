import { selectAllCharactersByBelongtoplayerid, updateCharacter } from "@db/generated/repositories/character";
import type { MemberWithRelations } from "@db/generated/repositories/member";
import { selectPlayerByIdWithRelations } from "@db/generated/repositories/player";
import type { TeamWithRelations } from "@db/generated/repositories/team";
import type { character, DB } from "@db/generated/zod";
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
import { Motion, Presence } from "solid-motionone";
import { Button } from "~/components/controls/button";
import { LoadingBar } from "~/components/controls/loadingBar";
import { Select } from "~/components/controls/select";
import { CharacterConfigPanel } from "~/components/features/character/CharacterConfigPanel";
import { CharacterView } from "~/components/features/character/CharacterView";
import { Icons } from "~/components/icons";
import { MediaContext } from "~/contexts/Media";
import { useEngine } from "~/lib/engine/core/thread/EngineContext";
import { createPreviewConfig, type EngineScenarioData } from "~/lib/engine/core/types";
import { StatsRenderer } from "~/lib/engine/core/World/Member/MemberStatusPanel";
import { createLogger } from "~/lib/Logger";
import { setStore, store } from "~/store";
import { createCharacter } from "./createCharacter";

const logger = createLogger("CharacterPage");

export default function CharactePage() {
	const navigate = useNavigate();
	const media = useContext(MediaContext);
	const params = useParams();

	type PanelModeType = "Config" | "AttrPreview" | "SkillPreview";
	const [panelMode, setPanelMode] = createSignal<PanelModeType>("Config");

	const charactersFinder = (id: string) => selectAllCharactersByBelongtoplayerid(id);
	const [characters, { refetch: refetchCharacters }] = createResource(
		() => store.session.account.player?.id ?? "",
		charactersFinder,
	);

	const [playerWithRelations, { refetch: refetchPlayerWithRelations }] = createResource(
		() => store.session.account.player?.id,
		async (playerId) => {
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

	const engine = useEngine();
	const previewTeamAId = "CHARACTER_PREVIEW_TEAM_A";
	const previewTeamBId = "CHARACTER_PREVIEW_TEAM_B";
	const previewMemberId = "CHARACTER_PREVIEW_MEMBER";
	const previewStatisticId = "CHARACTER_PREVIEW_STATISTIC";
	const [scenarioLoaded, setScenarioLoaded] = createSignal(false);
	let rangeUpdateTimer: number | undefined;
	let pendingCharacterPatch: Partial<character> = {};

	const queueCharacterPatch = (patch: Partial<character>, debounceMs = 200) => {
		pendingCharacterPatch = { ...pendingCharacterPatch, ...patch };
		if (rangeUpdateTimer !== undefined) {
			window.clearTimeout(rangeUpdateTimer);
		}
		rangeUpdateTimer = window.setTimeout(() => {
			rangeUpdateTimer = undefined;
			const patchToCommit = pendingCharacterPatch;
			pendingCharacterPatch = {};
			void commitCharacterPatch(patchToCommit);
		}, debounceMs);
	};

	const commitCharacterPatch = async (patch: Partial<character>) => {
		const current = character();
		if (!current) return;
		const patchToCommit = { ...pendingCharacterPatch, ...patch };
		pendingCharacterPatch = {};
		if (rangeUpdateTimer !== undefined) {
			window.clearTimeout(rangeUpdateTimer);
			rangeUpdateTimer = undefined;
		}
		if (Object.keys(patchToCommit).length === 0) return;
		await updateCharacter(current.id, patchToCommit);
		await refetchPlayerWithRelations();
	};

	// 角色配置变化后同步预览引擎；配置面板只提交 character patch，预览生命周期留在页面层。
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

	const previewDataItem = (type: keyof DB, data: unknown) => {
		setStore("pages", "cardGroup", store.pages.cardGroup.length, {
			type,
			data: data as Record<string, unknown>,
		});
	};

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
			{(validCharacter) => (
				<Motion.div
					animate={{ opacity: [0, 1] }}
					exit={{ opacity: 0 }}
					transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
					class="CharacterPage relative flex h-full w-full flex-col overflow-hidden"
				>
					<div class="Title w-full flex">
						<Show when={characters.latest} fallback={<LoadingBar class="w-full h-12" />}>
							{(validCharacters) => (
								<Select
									value={validCharacter().id}
									setValue={(value) => navigate(`/character/${value}`)}
									options={validCharacters().map((character) => ({ label: character.name, value: character.id })) ?? []}
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
							)}
						</Show>
						<Button
							icon={<Icons.Outline.AddUser />}
							level="quaternary"
							onClick={async () => {
								const character = await createCharacter();
								await refetchCharacters();
								navigate(`/character/${character.id}`);
							}}
							class="absolute right-6 top-0"
						/>
					</div>
					<div class="Content flex h-full w-full flex-1 flex-col overflow-hidden p-6 landscape:flex-row">
						<Show when={panelMode() === "Config" || media.width >= 1024}>
							<CharacterView character={validCharacter()} />
							<div class="Divider landscape:bg-dividing-color flex-none portrait:h-6 portrait:w-full landscape:mx-2 landscape:hidden landscape:h-full landscape:w-px"></div>
							<CharacterConfigPanel
								character={validCharacter()}
								onPatchRequested={commitCharacterPatch}
								onDebouncedPatchRequested={queueCharacterPatch}
								onItemPreviewRequested={previewDataItem}
							/>
						</Show>

						<Show when={panelMode() === "AttrPreview" || media.width >= 1024}>
							<div class="Divider landscape:bg-dividing-color flex-none portrait:hidden landscape:mx-2 landscape:h-full landscape:w-px" />
							<OverlayScrollbarsComponent
								element="div"
								options={{ scrollbars: { autoHide: "scroll" } }}
								defer
								class="MemberStats flex flex-col gap-2 w-full landscape:basis-1/2"
							>
								<StatsRenderer data={primaryMember()?.attrs} />
							</OverlayScrollbarsComponent>
						</Show>

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
				</Motion.div>
			)}
		</Show>
	);
}
