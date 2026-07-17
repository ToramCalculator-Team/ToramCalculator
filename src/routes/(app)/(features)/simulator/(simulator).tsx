import { selectAllCharactersByBelongtoplayerid } from "@db/generated/repositories/character";
import { selectAllSimulators } from "@db/generated/repositories/simulator";
import { A, useLocation, useNavigate } from "@solidjs/router";
import { createEffect, createMemo, createResource, createSignal, For, Show } from "solid-js";
import { Motion } from "solid-motionone";
import { ConcaveFrame } from "~/components/containers/concaveFrame";
import { Button } from "~/components/controls/button";
import { Input } from "~/components/controls/input";
import { LoadingBar } from "~/components/controls/loadingBar";
import { Select } from "~/components/controls/select";
import { Icons } from "~/components/icons";
import { createTrainingSimulator } from "~/features/simulator/createTrainingSimulator";
import { useSimulatorSession } from "~/features/simulator/SimulatorSession";
import { setStore, store } from "~/store";

/** 持久 Simulator 选择入口；路由只选择投影身份，会话由应用级 Provider 拥有。 */
export default function SimulatorPage() {
	const location = useLocation();
	const navigate = useNavigate();
	const session = useSimulatorSession();
	const [simulators, { refetch: refetchSimulators }] = createResource(
		() => store.database.hasInitialSnapshot.simulator,
		async (ready) => (ready ? await selectAllSimulators() : []),
	);
	const [characters] = createResource(
		() => store.session.account.player?.id,
		async (playerId) => await selectAllCharactersByBelongtoplayerid(playerId),
	);
	const [createOpen, setCreateOpen] = createSignal(false);
	const [name, setName] = createSignal("木桩验证方案");
	const [characterId, setCharacterId] = createSignal("");
	const [creating, setCreating] = createSignal(false);
	const [pageError, setPageError] = createSignal<string | null>(null);
	const simulatorDataReady = createMemo(() => store.database.hasInitialSnapshot.simulator === true);
	const canChangeSession = createMemo(
		() => session.snapshot().matches("inactive") || session.snapshot().matches("ready"),
	);
	const characterOptions = createMemo(() =>
		(characters() ?? []).map((character) => ({
			label: character.name || "未命名 Character",
			value: character.id,
		})),
	);
	const isMenuItemActive = (path: string) => location.pathname.includes(path);
	const menuItemClass = (path: string) =>
		`w-fit border-b px-1 py-2 ${
			isMenuItemActive(path) ? "border-accent-color font-bold" : "border-transparent hover:border-accent-color"
		}`;

	createEffect(() => {
		if (characterId() || characterOptions().length === 0) return;
		const activeCharacterId = store.session.account.player?.character?.id;
		setCharacterId(
			characterOptions().some((option) => option.value === activeCharacterId)
				? (activeCharacterId ?? characterOptions()[0].value)
				: characterOptions()[0].value,
		);
	});

	const openSimulator = (simulatorId: string) => {
		if (!canChangeSession()) throw new Error("当前会话正在转换或验证，暂时不能切换 Simulator");
		navigate(`/simulator/${simulatorId}`);
	};

	const createSimulator = async () => {
		if (creating()) return;
		setCreating(true);
		setPageError(null);
		try {
			if (!simulatorDataReady()) throw new Error("Simulator 数据尚未完成首轮同步，请稍后重试");
			const simulator = await createTrainingSimulator({ name: name(), characterId: characterId() });
			await refetchSimulators();
			openSimulator(simulator.id);
		} catch (error) {
			setPageError(error instanceof Error ? error.message : String(error));
		} finally {
			setCreating(false);
		}
	};

	return (
		<Motion.div
			animate={{ opacity: [0, 1] }}
			exit={{ opacity: 0 }}
			transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
			class="SimulatorPage relative flex h-full w-full flex-col overflow-hidden"
		>
			<div class="mx-auto flex  w-full flex-col gap-6 p-6 landscape:px-12 lg:landscape:min-h-full lg:landscape:px-24 lg:landscape:py-12">
				<header class="border-accent-color w-fit border-b-2 p-4 landscape:p-6">
					<A href="/" aria-label="返回首页" class="block">
						<Icons.Brand.LogoText class="h-auto w-[366px] max-w-[70vw]" />
					</A>
				</header>

				<div class="min-h-12 flex-1" />

				<div class="flex w-full flex-col items-start gap-10 lg:landscape:flex-row lg:landscape:items-center lg:landscape:justify-between lg:landscape:gap-16 lg:landscape:p-6">
					<nav
						aria-label="主要功能"
						class="grid w-full grid-cols-2 gap-x-6 gap-y-1 text-lg lg:landscape:w-44 lg:landscape:grid-cols-1"
					>
						<A
							href="/wiki/mob"
							aria-current={isMenuItemActive("/wiki") ? "page" : undefined}
							class={menuItemClass("/wiki")}
						>
							游戏资料库
						</A>
						<A
							href="/character"
							aria-current={isMenuItemActive("/character") ? "page" : undefined}
							class={menuItemClass("/character")}
						>
							机体构建平台
						</A>
						<A
							href="/simulator"
							aria-current={isMenuItemActive("/simulator") ? "page" : undefined}
							class={menuItemClass("/simulator")}
						>
							实战模拟场景
						</A>
						<button
							type="button"
							class="hover:border-accent-color w-fit cursor-pointer border-b border-transparent px-1 py-2 text-left"
							onClick={() => setStore("pages", "settingsDialogState", true)}
						>
							系统设置
						</button>
						<a
							href="https://github.com/ToramCalculator-Team/ToramCalculator"
							target="_blank"
							rel="noreferrer"
							class="hover:border-accent-color w-fit border-b border-transparent px-1 py-2"
						>
							关于此项目
						</a>
					</nav>

					<section
						aria-labelledby="simulator-plans-title"
						class="flex min-w-0 w-full flex-col items-end gap-3 lg:landscape:max-w-[844px]"
					>
						<div class="flex w-full items-end justify-end gap-4 px-1">
							<div class="min-w-0">
								<h1 id="simulator-plans-title" class="text-lg font-bold">
									Simulator 方案
								</h1>
								<p class="text-main-text-color mt-1 text-sm">选择方案进入设计与验证</p>
							</div>
							<Show when={createOpen()}>
								<button
									type="button"
									title="关闭创建表单"
									aria-label="关闭创建表单"
									class="border-dividing-color hover:border-accent-color flex size-10 shrink-0 cursor-pointer items-center justify-center border"
									onClick={() => setCreateOpen(false)}
								>
									<Icons.Outline.Close class="size-5" />
								</button>
							</Show>
						</div>

						<Show when={createOpen()}>
							<div class="border-accent-color bg-primary-color-90 grid w-full gap-3 border-t-2 px-1 pt-4 lg:landscape:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:landscape:items-end">
								<Input
									type="text"
									title="方案名称"
									value={name()}
									onInput={(event) => setName(event.currentTarget.value)}
								/>
								<div class="flex min-w-0 flex-col gap-2">
									<span class="p-1">验证 Character</span>
									<Select
										value={characterId()}
										setValue={setCharacterId}
										options={characterOptions()}
										placeholder={characters.loading ? "正在加载 Character" : "请选择 Character"}
										disabled={characters.loading || characterOptions().length === 0}
									/>
								</div>
								<Show
									when={characterOptions().length > 0}
									fallback={
										<Button level="secondary" onClick={() => navigate("/character/create")}>
											创建 Character
										</Button>
									}
								>
									<Button
										level="primary"
										disabled={creating() || !name().trim() || !characterId()}
										onClick={() => void createSimulator()}
									>
										{creating() ? "创建中..." : "创建并加载"}
									</Button>
								</Show>
							</div>
						</Show>

						<Show when={session.error()}>
							{(message) => <p class="text-brand-color-3rd w-full text-sm">{message()}</p>}
						</Show>
						<Show when={pageError()}>
							{(message) => <p class="text-brand-color-3rd w-full text-sm">{message()}</p>}
						</Show>

						<Show
							when={simulatorDataReady() && !simulators.loading}
							fallback={
								<ConcaveFrame
									class="h-[239px] w-full"
									contentClass="flex items-center justify-center"
									decorationClass="text-dividing-color"
								>
									<LoadingBar class="w-full max-w-80" />
								</ConcaveFrame>
							}
						>
							<div class="flex landscape:justify-end w-full snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
								<For each={simulators()}>
									{(simulator, index) => (
										<button
											type="button"
											disabled={!canChangeSession()}
											class="group h-[239px] w-[202px] shrink-0 snap-start cursor-pointer text-left disabled:cursor-not-allowed disabled:opacity-50"
											onClick={() => {
												setPageError(null);
												try {
													openSimulator(simulator.id);
												} catch (error) {
													setPageError(error instanceof Error ? error.message : String(error));
												}
											}}
										>
											<ConcaveFrame
												contentClass="flex flex-col justify-between"
												decorationClass="text-dividing-color group-hover:text-brand-color-3rd"
											>
												<span class="text-boundary-color text-xs font-bold">
													方案 {String(index() + 1).padStart(2, "0")}
												</span>
												<span class="min-w-0">
													<strong class="line-clamp-2 break-words text-lg leading-7">
														{simulator.name || "未命名 Simulator"}
													</strong>
													<span class="text-main-text-color mt-2 line-clamp-3 block break-words text-sm leading-5">
														{simulator.details || `Seed ${simulator.randomSeed} · ${simulator.logicHz} Hz`}
													</span>
												</span>
												<span class="flex items-center gap-2 text-sm font-bold">
													<Icons.Outline.Play class="size-4" />
													打开方案
												</span>
											</ConcaveFrame>
										</button>
									)}
								</For>

								<button
									type="button"
									disabled={!canChangeSession() || !simulatorDataReady()}
									aria-pressed={createOpen()}
									class="group h-[239px] w-[202px] shrink-0 snap-start cursor-pointer text-center disabled:cursor-not-allowed disabled:opacity-50"
									onClick={() => {
										setPageError(null);
										setCreateOpen((open) => !open);
									}}
								>
									<ConcaveFrame
										contentClass="flex flex-col items-center justify-center gap-3"
										decorationClass="text-dividing-color group-hover:text-brand-color-3rd"
									>
										<Icons.Outline.DocmentAdd class="size-8" />
										<span class="font-bold">创建方案</span>
										<Show when={(simulators()?.length ?? 0) === 0}>
											<span class="text-boundary-color px-5 text-xs leading-5">当前还没有可加载的方案</span>
										</Show>
									</ConcaveFrame>
								</button>
							</div>
						</Show>
					</section>
				</div>
			</div>
		</Motion.div>
	);
}
