/**
 * Simulator 会话的具体界面投影。
 *
 * 页面形态只消费应用级 AUI 的 designing / validating / analyzing 状态；SimulatorSession
 * 只提供阶段内数据与语义命令，不能反向成为第二份页面阶段事实。
 */
import { useNavigate } from "@solidjs/router";
import { createEffect, createMemo, createSignal, onCleanup, Show, untrack } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { type RealtimeSceneSession, useSceneRuntime } from "~/lib/3dScene/SceneRuntime";
import { computeMemberFormation } from "~/lib/engine/core/World/Member/memberFormation";
import { useSimulatorRuntimeProjection, useSimulatorSession } from "~/features/simulator/SimulatorSession";
import { useInterfaceSnapshot } from "~/machines/AppActorContext";
import { SimulatorAnalysisView } from "~/routes/(app)/(features)/simulator/SimulatorAnalysisView";
import { SimulatorDesignView } from "~/routes/(app)/(features)/simulator/SimulatorDesignView";
import { SimulatorValidationView } from "~/routes/(app)/(features)/simulator/SimulatorValidationView";
import { store } from "~/store";

export function RealtimeSimulator() {
	const session = useSimulatorSession();
	const navigate = useNavigate();
	const interfaceSnapshot = useInterfaceSnapshot();
	const sceneRuntime = useSceneRuntime();
	const runtime = useSimulatorRuntimeProjection();
	const [sceneSession, setSceneSession] = createSignal<RealtimeSceneSession | null>(null);
	let sceneRequest = 0;
	let disposed = false;

	const phase = createMemo<"designing" | "validating" | "analyzing" | "inactive">(() => {
		const snapshot = interfaceSnapshot();
		if (snapshot.matches({ simulator: "designing" })) return "designing";
		if (snapshot.matches({ simulator: "validating" })) return "validating";
		if (snapshot.matches({ simulator: "analyzing" })) return "analyzing";
		return "inactive";
	});
	const activeController = createMemo(
		() =>
			session.controllers().find((entry) => entry.controllerId === session.activeControllerId()) ??
			session.controllers()[0] ??
			null,
	);

	const releaseSceneSession = () => {
		untrack(sceneSession)?.release();
		setSceneSession(null);
	};

	createEffect(() => {
		const currentPhase = phase();
		if (currentPhase !== "validating") {
			sceneRequest += 1;
			releaseSceneSession();
			return;
		}

		// AUI 提交 validating 时，Session 已完成场景准备；阶段内的暂停、选人等局部变化不得重建 3D session。
		const copy = untrack(() => session.currentDesignCopy());
		if (!copy) return;
		const controller = untrack(activeController);
		const controllerIds = untrack(() => session.controllers().map((entry) => entry.controllerId));
		const request = ++sceneRequest;
		const followId = controller?.boundMemberId ?? copy.design.primaryMemberId ?? undefined;
		const formation = computeMemberFormation(
			copy.resolvedScene.engineInput.scenario.campA,
			copy.resolvedScene.engineInput.scenario.campB,
		);
		const initialWorldPoses = copy.resolvedScene.worldResources.map((resource) => {
			const pose = formation.get(resource.memberId);
			return {
				memberId: resource.memberId,
				position: pose?.position ?? { x: 0, y: 0, z: 0 },
				yaw: pose?.yaw ?? 0,
			};
		});
		releaseSceneSession();
		void sceneRuntime
			.acquireRealtimeSession({
				renderSource: runtime.renderSource(),
				worldResources: copy.resolvedScene.worldResources,
				initialWorldPoses,
				followEntityId: followId,
				activeControllerId: controller?.controllerId ?? null,
				controllerIds,
				initialCameraTarget: followId ? formation.get(followId)?.position : undefined,
			})
			.then((next) => {
				if (disposed || request !== sceneRequest) {
					next.release();
					return;
				}
				setSceneSession(next);
			})
			.catch((cause) => console.error("Simulator 场景投影失败", cause));
	});

	createEffect(() => {
		if (session.snapshot().matches("inactive")) navigate("/simulator");
	});

	createEffect(() => {
		const current = sceneSession();
		const controller = activeController();
		if (!current || !controller) return;
		current.setActiveController(controller.controllerId);
		current.setFollowTarget(controller.boundMemberId);
	});

	onCleanup(() => {
		disposed = true;
		sceneRequest += 1;
		releaseSceneSession();
	});

	return (
		<Presence exitBeforeEnter>
			<Show when={session.currentDesignCopy()}>
				{(copy) => (
					<Motion.div
						animate={{ opacity: [0, 1] }}
						exit={{ opacity: [1, 0] }}
						transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.35 : 0 }}
						class="pointer-events-none fixed inset-0 z-stack h-dvh w-dvw overflow-hidden"
					>
						<Show when={phase() === "designing"}>
							<SimulatorDesignView copy={copy()} />
						</Show>
						<Show when={phase() === "validating"}>
							<SimulatorValidationView />
						</Show>
						<Show when={phase() === "analyzing"}>
							<SimulatorAnalysisView />
						</Show>
					</Motion.div>
				)}
			</Show>
		</Presence>
	);
}
