/**
 * Simulator 会话的具体界面投影。
 *
 * 页面形态只消费应用级 AUI 的 designing / validating / analyzing 状态；SimulatorSession
 * 只提供阶段内数据与语义命令，不能反向成为第二份页面阶段事实。
 */
import { useNavigate } from "@solidjs/router";
import { createEffect, createMemo, createSignal, onCleanup, Show, untrack } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { computeMemberFormation } from "~/engine/core/World/Member/memberFormation";
import { useSimulatorRuntimeProjection, useSimulatorSession } from "~/features/simulator/session/SimulatorSession";
import { SimulatorAnalysisView } from "~/features/simulator/ui/SimulatorAnalysisView";
import { SimulatorDesignView } from "~/features/simulator/ui/SimulatorDesignView";
import { SimulatorValidationView } from "~/features/simulator/ui/SimulatorValidationView";
import { useInterfaceSnapshot } from "~/machines/AppActorContext";
import { type RealtimeSceneSession, useSceneRuntime } from "~/platform/render/scene/SceneRuntime";
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
		// 响应式读取：绑定控制器在 startValidation onDone 写入，AUI 的 validating 可能先于
		// session 快照推送触发本 effect；未就绪时等待下一帧重跑，避免无端口重建场景。
		const controller = activeController();
		if (!controller) {
			return;
		}
		const controllerIds = untrack(() => session.controllers().map((entry) => entry.controllerId));
		const primarySkillId = untrack(() => session.activeSkills()[0]?.id);
		const movementSink = runtime.getControllerMovementSink(controller.controllerId);
		if (!movementSink) return;
		const request = ++sceneRequest;
		const followId = controller?.boundMemberId ?? copy.design.primaryMemberId ?? undefined;
		const formation = computeMemberFormation(
			copy.resolvedScene.engineInput.scenario.campA,
			copy.resolvedScene.engineInput.scenario.campB,
		);
		const engineMembers = new Map(untrack(() => session.members()).map((member) => [member.id, member]));
		const initialWorldPoses = copy.resolvedScene.worldResources.map((resource) => {
			const member = engineMembers.get(resource.memberId);
			if (!member) throw new Error(`引擎初始状态缺少世界资源对应成员: ${resource.memberId}`);
			return {
				memberId: resource.memberId,
				position: member.position,
				yaw: formation.get(resource.memberId)?.yaw ?? 0,
			};
		});
		const initialCameraTarget = followId ? engineMembers.get(followId)?.position : undefined;
		releaseSceneSession();
		void sceneRuntime
			.acquireRealtimeSession({
				renderSource: runtime.renderSource(),
				terrain: copy.resolvedScene.engineInput.terrain,
				worldResources: copy.resolvedScene.worldResources,
				initialWorldPoses,
				followEntityId: followId,
				activeControllerId: controller?.controllerId ?? null,
				controllerIds,
				initialCameraTarget,
				controllerInput: controller
					? {
							movementSink,
							onAction: (action) => {
								switch (action.type) {
									case "skill_triggered":
										session.send({ type: "skill.cast.requested", skillId: action.skillId });
										break;
									case "jump_triggered":
										session.send({ type: "jump.requested" });
										break;
									default: {
										const unreachableAction: never = action;
										throw new Error(`未知控制器动作: ${JSON.stringify(unreachableAction)}`);
									}
								}
							},
							skillBindings: primarySkillId ? { Digit1: primarySkillId } : undefined,
						}
					: undefined,
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
		if (session.snapshot().matches("inactive")) navigate("/");
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
						class="pointer-events-none inset-0 z-stack h-full w-full overflow-hidden"
					>
						<Show when={phase() === "designing"}>
							<SimulatorDesignView copy={copy} />
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
