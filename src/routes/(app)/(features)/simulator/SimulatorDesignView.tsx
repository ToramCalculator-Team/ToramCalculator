import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import { Button } from "~/components/controls/button";
import { Select } from "~/components/controls/select";
import { Icons } from "~/components/icons";
import type { DesignCopy } from "~/features/simulator/designCopy";
import { useSimulatorSession } from "~/features/simulator/SimulatorSession";
import type { SimulationDesignMember } from "~/features/simulator/simulationDesignSchema";
import { completeSimulatorPerformanceMeasureAfterPaint } from "~/features/simulator/simulatorPerformance";

type Camp = "A" | "B";

const characterFields = ["lv", "str", "int", "vit", "agi", "dex"] as const;

const memberTypeLabel = (member: SimulationDesignMember) => {
	switch (member.type) {
		case "Player":
			return "玩家";
		case "Partner":
			return "伙伴";
		case "Mercenary":
			return "佣兵";
		case "Mob":
			return "Mob";
	}
};

const memberTitle = (member: SimulationDesignMember) =>
	member.name || member.character?.name || member.mob?.name || "未命名成员";

const memberDescription = (member: SimulationDesignMember) => {
	if (member.type === "Player" && member.character) {
		return member.character.weapon?.template?.name || `Lv.${member.character.lv}`;
	}
	if (member.type === "Mob" && member.mob) {
		return `${member.mobDifficultyFlag ?? "Normal"} · Lv.${member.mob.baseLv}`;
	}
	return "成员配置";
};

function MemberCard(props: { member: SimulationDesignMember; primaryMemberId: string | null; expanded: boolean }) {
	const isPrimary = () => props.member.id === props.primaryMemberId;
	return (
		<article
			class={`border-accent-color bg-area-color shadow-dividing-color grid w-full grid-cols-[6rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border px-4 py-3 shadow-card ${
				props.expanded ? "min-h-56" : "min-h-20"
			}`}
		>
			<div class="text-main-text-color flex items-center gap-2">
				<Show when={props.member.type === "Player"}>
					<span
						role="img"
						class={`border-accent-color h-8 w-8 flex-none rounded-full border-2 p-1 ${isPrimary() ? "bg-accent-color" : ""}`}
						aria-label={isPrimary() ? "当前主控成员" : "普通成员"}
					>
						<span class={`block h-full w-full rounded-full ${isPrimary() ? "bg-primary-color" : ""}`} />
					</span>
				</Show>
				<span class="truncate">{memberTypeLabel(props.member)}</span>
			</div>
			<div class="flex min-w-0 items-center gap-3">
				<div class="bg-primary-color flex h-12 w-12 flex-none items-center justify-center rounded-lg">
					<Show when={props.member.type === "Mob"} fallback={<Icons.Outline.Gamepad class="h-7 w-7" />}>
						<Icons.Outline.Flag class="h-7 w-7" />
					</Show>
				</div>
				<div class="min-w-0">
					<strong class="block truncate">{memberTitle(props.member)}</strong>
					<span class="text-accent-color-70 block truncate text-sm">{memberDescription(props.member)}</span>
				</div>
			</div>
			<button
				type="button"
				disabled
				class="rounded-lg p-3 opacity-45"
				title="成员配置编辑尚未接入当前会话"
				aria-label="成员配置"
			>
				<Icons.Outline.Category class="h-6 w-6" />
			</button>
		</article>
	);
}

function CampPanel(props: { camp: Camp; copy: DesignCopy }) {
	const teams = createMemo(() => props.copy.design.teams.filter((team) => team.camp === props.camp));
	const [selectedTeamId, setSelectedTeamId] = createSignal<string | null>(null);
	const selectedTeam = createMemo(() => {
		const available = teams();
		return available.find((team) => team.id === selectedTeamId()) ?? available[0] ?? null;
	});

	return (
		<section class="flex min-w-0 flex-col gap-3 lg:min-h-[40rem]">
			<h2 class="px-2 py-1 text-center text-xl font-bold">阵营{props.camp}</h2>
			<div class="flex min-h-14 items-center gap-1 overflow-x-auto rounded-lg p-1">
				<For each={teams()}>
					{(team, index) => (
						<Button
							size="md"
							active={selectedTeam()?.id === team.id}
							onClick={() => setSelectedTeamId(team.id)}
							class="flex-none"
						>
							{team.name || `队伍${index() + 1}`}
						</Button>
					)}
				</For>
			</div>
			<Show
				when={selectedTeam()}
				fallback={
					<div class="border-dividing-color bg-area-color flex min-h-80 items-center justify-center rounded-lg border">
						当前阵营没有队伍
					</div>
				}
			>
				{(team) => (
					<div class="flex min-h-0 flex-1 flex-col gap-3">
						<div class="flex flex-col gap-3">
							<For each={team().members}>
								{(member) => (
									<MemberCard
										member={member}
										primaryMemberId={props.copy.design.primaryMemberId}
										expanded={team().members.length === 1}
									/>
								)}
							</For>
						</div>
						<button
							type="button"
							disabled
							class="bg-area-color flex min-h-40 flex-1 items-center justify-center gap-2 rounded-lg opacity-65 lg:min-h-52"
							title="添加成员尚未接入当前会话"
						>
							<Icons.Outline.AddUser />
							<span class="underline">添加成员</span>
						</button>
						<div class="flex min-h-14 flex-wrap items-center gap-1">
							<strong class="px-3">晶石配置</strong>
							<For each={team().gems}>{(gem) => <span class="bg-area-color rounded-lg px-4 py-3">{gem}</span>}</For>
							<button
								type="button"
								disabled
								class="bg-area-color flex h-12 w-12 items-center justify-center rounded-lg opacity-45"
								title="晶石配置尚未接入当前会话"
								aria-label="添加晶石"
							>
								<span class="text-xl">+</span>
							</button>
						</div>
					</div>
				)}
			</Show>
		</section>
	);
}

export function SimulatorDesignView(props: { copy: DesignCopy }) {
	const session = useSimulatorSession();
	onMount(() => completeSimulatorPerformanceMeasureAfterPaint("return-to-design"));
	const [settingsOpen, setSettingsOpen] = createSignal(false);
	const copyOptions = createMemo(() =>
		session.designCopies().map((copy, index) => ({
			value: copy.id,
			label: `${copy.design.name || `设计副本 ${index + 1}`}${copy.hasRun ? " · 已验证" : ""}`,
		})),
	);
	const currentDifferences = createMemo(() => session.previewCurrentDifferences());
	const primaryCharacter = createMemo(
		() =>
			props.copy.design.teams
				.flatMap((team) => team.members)
				.find((member) => member.id === props.copy.design.primaryMemberId)?.character ?? null,
	);

	const editCharacterNumber = (field: (typeof characterFields)[number], value: number) => {
		if (Number.isFinite(value)) session.send({ type: "design.characterNumber.changed", field, value });
	};
	const editSimulatorNumber = (field: "randomSeed" | "logicHz", value: number) => {
		if (Number.isFinite(value)) session.send({ type: "design.simulatorNumber.changed", field, value });
	};

	return (
		<div class="pointer-events-auto absolute inset-0 overflow-y-auto">
			<div class="mx-auto flex min-h-full w-full flex-col gap-6 px-4 py-5 sm:px-8 lg:px-12 lg:py-8 xl:px-24">
				<header class="relative z-20 grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-3">
					<div class="border-dividing-color rounded-lg border p-1">
						<Select
							value={props.copy.id}
							setValue={(copyId) => session.send({ type: "design.copy.selected", copyId })}
							options={copyOptions()}
							placeholder="选择 Simulator 设计"
						/>
					</div>
					<button
						type="button"
						onClick={() => setSettingsOpen((open) => !open)}
						class={`flex h-12 w-12 items-center justify-center rounded-lg ${settingsOpen() ? "bg-area-color" : "hover:bg-area-color"}`}
						aria-label="Simulator 设置"
						aria-expanded={settingsOpen()}
					>
						<Icons.Outline.Settings />
					</button>
					<Show when={settingsOpen()}>
						<aside class="bg-primary-color border-dividing-color shadow-dividing-color absolute right-0 top-16 z-50 flex max-h-[calc(100dvh-6rem)] w-[min(92vw,28rem)] flex-col gap-4 overflow-y-auto rounded-lg border p-4 shadow-card">
							<div class="flex items-center justify-between gap-3">
								<div class="min-w-0">
									<strong class="block truncate">{props.copy.design.name || "未命名 Simulator"}</strong>
									<span class="text-accent-color-70 text-sm">设计设置</span>
								</div>
								<button
									type="button"
									onClick={() => setSettingsOpen(false)}
									class="hover:bg-area-color rounded-lg p-3"
									aria-label="关闭设置"
								>
									<Icons.Outline.Close />
								</button>
							</div>
							<section class="grid grid-cols-2 gap-3">
								<label class="flex min-w-0 flex-col gap-1 text-sm">
									随机种子
									<input
										type="number"
										value={props.copy.design.randomSeed}
										onInput={(event) => editSimulatorNumber("randomSeed", Number(event.currentTarget.value))}
										class="border-dividing-color bg-area-color min-w-0 rounded-lg border px-3 py-2"
									/>
								</label>
								<label class="flex min-w-0 flex-col gap-1 text-sm">
									逻辑频率
									<input
										type="number"
										min="1"
										value={props.copy.design.logicHz}
										onInput={(event) => editSimulatorNumber("logicHz", Number(event.currentTarget.value))}
										class="border-dividing-color bg-area-color min-w-0 rounded-lg border px-3 py-2"
									/>
								</label>
							</section>
							<Show when={primaryCharacter()}>
								{(character) => (
									<section>
										<h3 class="mb-2 text-sm font-bold">主控 Character</h3>
										<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
											<For each={characterFields}>
												{(field) => (
													<label class="flex min-w-0 items-center justify-between gap-2 text-xs uppercase">
														{field}
														<input
															type="number"
															value={character()[field]}
															onInput={(event) => editCharacterNumber(field, Number(event.currentTarget.value))}
															class="border-dividing-color bg-area-color min-w-0 w-20 rounded-lg border px-2 py-1 text-right"
														/>
													</label>
												)}
											</For>
										</div>
									</section>
								)}
							</Show>
							<Show when={currentDifferences().length > 0}>
								<section>
									<h3 class="mb-2 text-sm font-bold">正式设计差异</h3>
									<div class="max-h-40 overflow-y-auto">
										<For each={currentDifferences()}>
											{(difference) => (
												<div class="border-dividing-color grid grid-cols-[1fr_auto] gap-2 border-b py-2 text-xs">
													<span>
														{difference.entityType}.{difference.field}
													</span>
													<span>
														{String(difference.before)} → {String(difference.after)}
													</span>
												</div>
											)}
										</For>
									</div>
									<Button
										level="secondary"
										onClick={() => session.send({ type: "design.apply.requested" })}
										class="mt-3 w-full"
									>
										应用为正式设计
									</Button>
								</section>
							</Show>
							<Show when={session.error()}>{(message) => <p class="text-danger-color text-sm">{message()}</p>}</Show>
							<Button
								level="secondary"
								icon={<Icons.Outline.Stop />}
								onClick={() => session.send({ type: "session.end.requested" })}
								class="w-full"
							>
								结束会话
							</Button>
						</aside>
					</Show>
				</header>

				<main class="grid min-h-0 flex-1 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)] lg:gap-6">
					<CampPanel camp="A" copy={props.copy} />
					<div class="flex items-center justify-center lg:pt-24">
						<div class="flex flex-col items-center gap-3">
							<button
								type="button"
								onClick={() => session.send({ type: "validation.start.requested" })}
								class="bg-brand-color-2nd text-accent-color shadow-dividing-color flex h-[4.625rem] items-center gap-2 rounded-lg px-4 shadow-card transition-transform hover:scale-[1.02] active:scale-100"
							>
								<span class="bg-accent-color text-primary-color flex h-12 w-12 items-center justify-center rounded-lg">
									<Icons.Outline.Play class="h-8 w-8" />
								</span>
								<strong class="text-3xl">START</strong>
							</button>
							<span class="border-dividing-color bg-area-color rounded-lg border px-4 py-2 text-sm">
								{props.copy.design.logicHz} Hz
							</span>
						</div>
					</div>
					<CampPanel camp="B" copy={props.copy} />
				</main>
			</div>
		</div>
	);
}
