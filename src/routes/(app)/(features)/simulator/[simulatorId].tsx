import { selectSimulatorForEngine } from "@db/repositories/simulatorEngine";
import { useNavigate, useParams } from "@solidjs/router";
import { createEffect, createMemo, createResource, Match, on, onCleanup, onMount, Show, Switch } from "solid-js";
import { Motion } from "solid-motionone";
import { Button } from "~/components/controls/button";
import { LoadingBar } from "~/components/controls/loadingBar";
import { useSimulatorSession } from "~/features/simulator/SimulatorSession";
import {
	type SimulatorRouteSessionPhase,
	selectSimulatorRouteProjection,
} from "~/features/simulator/simulatorRouteProjection";
import { RealtimeSimulator } from "~/routes/(app)/(features)/simulator/RealtimeSimulator";
import { setStore, store } from "~/store";

/** Simulator 路由仅加载持久设计并挂载会话投影，不拥有引擎或运行记录生命周期。 */
export default function SimulatorPage() {
	const params = useParams();
	const navigate = useNavigate();
	const session = useSimulatorSession();
	const [simulatorData, { refetch }] = createResource(
		() => params.simulatorId,
		async (simulatorId) => (simulatorId ? await selectSimulatorForEngine(simulatorId) : undefined),
	);
	const profile3DWasOpen = store.settings.userInterface.is3DSceneEnabled;
	const sessionPhase = (): SimulatorRouteSessionPhase => {
		const snapshot = session.snapshot();
		if (snapshot.matches("inactive")) return "inactive";
		if (snapshot.matches("ready")) return "ready";
		if (
			snapshot.matches("loading") ||
			snapshot.matches("parsingSwitch") ||
			snapshot.matches("awaitingSwitchAuthorization") ||
			snapshot.matches("switching") ||
			snapshot.matches("awaitingEndAuthorization") ||
			snapshot.matches("ending")
		) {
			return "transitioning";
		}
		return "busy";
	};
	const routeProjection = createMemo(() =>
		selectSimulatorRouteProjection({
			targetSimulatorId: params.simulatorId ?? null,
			dataStatus:
				!store.database.hasInitialSnapshot.simulator || simulatorData.loading
					? "loading"
					: simulatorData()
						? "available"
						: "missing",
			sessionSimulatorId: session.simulatorId(),
			sessionPhase: sessionPhase(),
		}),
	);

	createEffect(
		on(
			() => store.database.hasInitialSnapshot.simulator,
			(ready) => {
				if (ready) void refetch();
			},
		),
	);

	createEffect(() => {
		const projection = routeProjection();
		const design = simulatorData();
		if (projection.kind === "loading" && projection.requestInitialLoad && design) {
			session.send({ type: "session.initialLoad.requested", design });
		}
	});

	const returnToCurrentSession = (simulatorId: string) => {
		navigate(`/simulator/${simulatorId}`, { replace: true });
	};
	const requestTargetSwitch = () => {
		const projection = routeProjection();
		const design = simulatorData();
		if (projection.kind !== "mismatch" || !projection.canSwitch || !design) return;
		session.send({ type: "session.switch.requested", design });
	};

	onMount(() => setStore("settings", "userInterface", "is3DSceneEnabled", true));
	onCleanup(() => setStore("settings", "userInterface", "is3DSceneEnabled", profile3DWasOpen));

	return (
		<Switch>
			<Match when={routeProjection().kind === "loading"}>
				<Motion.div
					animate={{ opacity: [0, 1] }}
					exit={{ opacity: 0 }}
					transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
					class="flex h-full w-full flex-col items-center justify-center gap-3"
				>
					<LoadingBar class="w-1/2 min-w-72" />
					<p>正在加载 Simulator 设计</p>
				</Motion.div>
			</Match>
			<Match when={routeProjection().kind === "current"}>
				<RealtimeSimulator />
			</Match>
			<Match when={routeProjection().kind === "mismatch"}>
				{(() => {
					const projection = routeProjection();
					if (projection.kind !== "mismatch") return null;
					return (
						<main class="flex h-full w-full items-center justify-center p-6">
							<section class="border-dividing-color bg-area-color flex w-full max-w-xl flex-col gap-4 border p-5">
								<div>
									<h1 class="text-lg font-bold">Simulator 会话与当前地址不一致</h1>
									<p class="text-accent-color-70 mt-1 text-sm">
										内存会话仍保留 {projection.currentSimulatorId}，当前地址指向 {params.simulatorId}。
									</p>
								</div>
								<Show when={!projection.canSwitch}>
									<p class="text-accent-color-70 text-sm">当前会话正在验证或处理命令，暂时不能切换方案。</p>
								</Show>
								<Show when={session.error()}>{(message) => <p class="text-danger-color text-sm">{message()}</p>}</Show>
								<div class="flex flex-wrap gap-2">
									<Button level="secondary" onClick={() => returnToCurrentSession(projection.currentSimulatorId)}>
										返回当前会话
									</Button>
									<Button level="primary" disabled={!projection.canSwitch} onClick={requestTargetSwitch}>
										切换到目标方案
									</Button>
								</div>
							</section>
						</main>
					);
				})()}
			</Match>
			<Match when={routeProjection().kind === "missing"}>
				{(() => {
					const projection = routeProjection();
					if (projection.kind !== "missing") return null;
					return (
						<main class="flex h-full w-full items-center justify-center p-6">
							<section class="border-dividing-color bg-area-color flex w-full max-w-lg flex-col gap-3 border p-5">
								<h1 class="text-lg font-bold">Simulator 不存在或尚未同步</h1>
								<p class="text-accent-color-70 text-sm">目标方案未加载，现有内存会话没有被修改。</p>
								<Button
									level="secondary"
									onClick={() =>
										projection.currentSimulatorId
											? returnToCurrentSession(projection.currentSimulatorId)
											: navigate("/simulator", { replace: true })
									}
								>
									{projection.currentSimulatorId ? "返回当前会话" : "返回方案列表"}
								</Button>
							</section>
						</main>
					);
				})()}
			</Match>
			<Match when={routeProjection().kind === "transitioning"}>
				<Motion.div
					animate={{ opacity: [0, 1] }}
					exit={{ opacity: 0 }}
					transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
					class="flex h-full w-full flex-col items-center justify-center gap-3"
				>
					<LoadingBar class="w-1/2 min-w-72" />
					<p>正在提交 Simulator 会话转换</p>
				</Motion.div>
			</Match>
		</Switch>
	);
}
