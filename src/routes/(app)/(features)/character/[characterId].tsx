import type { character, DB } from "@db/generated/zod";
import { useNavigate, useParams } from "@solidjs/router";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createMemo, createSignal, onMount, Show, useContext } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { Button } from "~/components/controls/button";
import { LoadingBar } from "~/components/controls/loadingBar";
import { Select } from "~/components/controls/select";
import { CharacterConfigPanel } from "~/components/features/character/CharacterConfigPanel";
import { CharacterView } from "~/components/features/character/CharacterView";
import { SkillPreviewPanel } from "~/components/features/character/SkillPreviewPanel";
import { Icons } from "~/components/icons";
import { MediaContext } from "~/contexts/Media";
import { useEngine } from "~/lib/engine/core/thread/EngineContext";
import { StatsRenderer } from "~/lib/engine/core/World/Member/MemberStatusPanel";
import { createLogger } from "~/lib/Logger";
import { setStore, store } from "~/store";
import { createCharacterPageModel } from "./characterPageModel";
import { createCharacter } from "./createCharacter";

const logger = createLogger("CharacterPage");

export default function CharactePage() {
	const navigate = useNavigate();
	const media = useContext(MediaContext);
	const params = useParams();
	const engine = useEngine();

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

	const primaryMember = createMemo(() => {
		const list = engine.members();
		const primaryMember = list.find((member) => member.id === previewMemberId);
		logger.info("primaryMember", primaryMember);
		return primaryMember;
	});

	const dispatchCharacterPatch = (patch: Partial<character>) => {
		model.dispatch({ type: "character.patch", patch });
	}; 

	const previewDataItem = (type: keyof DB, data: unknown) => {
		setStore("pages", "cardGroup", store.pages.cardGroup.length, {
			type,
			data: data as Record<string, unknown>,
		});
	};

	onMount(() => {
		logger.info("--CharacterIdPage render");
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
						<div class={isConfigPanelVisible() ? "contents" : "hidden"}>
							{/* 面板隐藏时移除3d渲染逻辑以降低功耗和性能损失 */}
							<Show when={isConfigPanelVisible()}>
								<CharacterView character={validCharacter()} />
							</Show>
							<div class="Divider landscape:bg-dividing-color flex-none portrait:h-6 portrait:w-full landscape:mx-2 landscape:hidden landscape:h-full landscape:w-px"></div>
							<CharacterConfigPanel
								character={validCharacter()}
								onPatchRequested={dispatchCharacterPatch}
								onItemPreviewRequested={previewDataItem}
								onCommand={model.dispatch}
							/>
						</div>

						<div class={isAttrPreviewVisible() ? "contents" : "hidden"}>
							<div class="Divider landscape:bg-dividing-color flex-none portrait:hidden landscape:mx-2 landscape:h-full landscape:w-px" />
							<OverlayScrollbarsComponent
								element="div"
								options={{ scrollbars: { autoHide: "scroll" } }}
								defer
								class="MemberStats flex flex-col gap-2 w-full landscape:basis-1/2"
							>
								<StatsRenderer data={primaryMember()?.attrs} />
							</OverlayScrollbarsComponent>
						</div>

						<div class={isSkillPreviewVisible() ? "contents" : "hidden"}>
							<div class="Divider landscape:bg-dividing-color flex-none portrait:hidden landscape:mx-2 landscape:h-full landscape:w-px" />
							<OverlayScrollbarsComponent
								element="div"
								options={{ scrollbars: { autoHide: "scroll" } }}
								defer
								class="SkillPreview flex w-full flex-col gap-2 landscape:basis-1/2"
							>
								<SkillPreviewPanel memberId={previewMemberId} learnedSkills={validCharacter().skills ?? []} />
							</OverlayScrollbarsComponent>
						</div>

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
