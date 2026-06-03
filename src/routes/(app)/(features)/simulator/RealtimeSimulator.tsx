/**
 * 实时模拟器 - 沉浸式 HUD 会话层
 *
 * 职责：
 * 1. 维护 SimulationEngine 的场景数据和控制器绑定
 * 2. 向 SceneRuntime 申请实时渲染 session
 * 3. 将成员状态、技能和生命周期控制投影为全屏 HUD
 */

import type { SimulatorWithRelations } from "@db/generated/repositories/simulator";
import { A } from "@solidjs/router";
import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { Button } from "~/components/controls/button";
import { Select } from "~/components/controls/select";
import { Icons } from "~/components/icons";
import { AddMemberControllerButton } from "~/lib/engine/controller/AddMemberControllerButton";
import { ControlPanel } from "~/lib/engine/controller/components";
import { MemberController } from "~/lib/engine/controller/MemberController";
import { useEngine } from "~/lib/engine/core/thread/EngineContext";
import { ControllerDomainEventBatchSchema, type EngineTelemetry } from "~/lib/engine/core/thread/protocol";
import { type ControllerDomainEvent, createRealtimeConfig, type FrameSnapshot } from "~/lib/engine/core/types";
import type { MemberSerializeData } from "~/lib/engine/core/World/Member/Member";
import { MemberStatusPanel } from "~/lib/engine/core/World/Member/MemberStatusPanel";
import { type RealtimeSceneSession, useSceneRuntime } from "~/lib/engine/render/SceneRuntime";
import { store } from "~/store";

export interface RealtimeSimulatorProps {
	simulatorData: SimulatorWithRelations;
}

type ControllerEntry = {
	id: string;
	controller: MemberController;
	boundMemberId: string;
};

type ControllerEventState = {
	skillAvailability?: Record<string, boolean>;
	hp?: number | null;
	mp?: number | null;
	position?: { x: number; y: number; z: number };
};

export function RealtimeSimulator(props: RealtimeSimulatorProps) {
	const { defaultEngine } = useEngine();
	const sceneRuntime = useSceneRuntime();
	const engine = defaultEngine();
	const cleanupFunctions: Array<() => void> = [];

	const [memberControllers, setMemberControllers] = createSignal<ControllerEntry[]>([]);
	const [activeControllerId, setActiveControllerId] = createSignal<string | null>(null);
	const [sceneSession, setSceneSession] = createSignal<RealtimeSceneSession | null>(null);
	const [members, setMembers] = createSignal<MemberSerializeData[]>([]);
	const [latestFrameSnapshot, setLatestFrameSnapshot] = createSignal<FrameSnapshot | null>(null);
	const [controllerEventState, setControllerEventState] = createSignal<Record<string, ControllerEventState>>({});
	const [activeSkillList, setActiveSkillList] = createSignal<Array<{ id: string; name: string; level: number }>>([]);
	const [isInitialized, setIsInitialized] = createSignal(false);
	const [isRunning, setIsRunning] = createSignal(false);
	const [isPaused, setIsPaused] = createSignal(false);
	const [engineTelemetry, setEngineTelemetry] = createSignal<EngineTelemetry | null>(null);
	let sceneSessionRequestSeq = 0;
	let disposed = false;

	function registerCleanup(fn: () => void) {
		cleanupFunctions.push(fn);
	}

	const boundMemberIds = createMemo(() => new Set(memberControllers().map((item) => item.boundMemberId)));
	const canAddMemberController = createMemo(() => {
		const bound = boundMemberIds();
		return members().some((member) => !bound.has(member.id));
	});
	const unboundMembers = createMemo(() => {
		const bound = boundMemberIds();
		return members().filter((member) => !bound.has(member.id));
	});
	const activeControllerEntry = createMemo(() => {
		const id = activeControllerId();
		return memberControllers().find((item) => item.id === id) ?? memberControllers()[0] ?? null;
	});
	const activeMember = createMemo(() => {
		const entry = activeControllerEntry();
		if (!entry) return null;
		return members().find((member) => member.id === entry.boundMemberId) ?? null;
	});
	const activeMemberStatus = createMemo<MemberSerializeData | null>(() => {
		const entry = activeControllerEntry();
		const member = activeMember();
		if (!entry || !member) return null;
		const snapshot = latestFrameSnapshot();
		const controllerView = snapshot?.byController?.[entry.id];
		const memberBasic = snapshot?.members.find((item) => item.id === entry.boundMemberId);
		return {
			...member,
			attrs: controllerView?.boundMemberDetail?.attrs ?? member.attrs ?? {},
			position: memberBasic?.position ?? member.position,
		} satisfies MemberSerializeData;
	});
	const activeControllerEvents = createMemo<ControllerEventState>(() => {
		const entry = activeControllerEntry();
		if (!entry) return {};
		return controllerEventState()[entry.id] ?? {};
	});
	const controllerOptions = createMemo(() =>
		memberControllers().map((item, index) => {
			const member = members().find((candidate) => candidate.id === item.boundMemberId);
			return {
				value: item.id,
				label: `${index + 1}. ${member?.name ?? item.boundMemberId}`,
			};
		}),
	);

	const activateSceneSession = async (controllerId: string | null, followEntityId?: string) => {
		const requestSeq = ++sceneSessionRequestSeq;
		sceneSession()?.release();
		setSceneSession(null);
		try {
			const session = await sceneRuntime.acquireRealtimeSession({
				engine,
				followEntityId,
				activeControllerId: controllerId,
				controllerIds: memberControllers().map((item) => item.id),
			});
			if (disposed || requestSeq !== sceneSessionRequestSeq) {
				session.release();
				return;
			}
			setSceneSession(session);
		} catch (error) {
			console.error("激活实时渲染场景失败:", error);
		}
	};

	createEffect(() => {
		const session = sceneSession();
		const entry = activeControllerEntry();
		if (!session || !entry) return;
		session.setActiveController(entry.id);
		session.setFollowTarget(entry.boundMemberId);
	});

	createEffect(() => {
		const entry = activeControllerEntry();
		if (!entry && activeControllerId() !== null) {
			setActiveControllerId(null);
		}
	});

	let skillRequestSeq = 0;
	createEffect(() => {
		const entry = activeControllerEntry();
		if (!entry) {
			setActiveSkillList([]);
			return;
		}
		const target = entry.controller.getPrimaryTarget();
		if (!target) {
			setActiveSkillList([]);
			return;
		}
		const seq = ++skillRequestSeq;
		target
			.getMemberSkillList(entry.boundMemberId)
			.then((list) => {
				if (seq === skillRequestSeq) {
					setActiveSkillList(list);
				}
			})
			.catch((error) => {
				if (seq === skillRequestSeq) {
					setActiveSkillList([]);
				}
				console.error("获取成员技能列表失败:", error);
			});
	});

	onMount(async () => {
		console.log("--RealtimeSimulator Page Mount");
		setupDataSync();

		await engine.loadScenario({
			simulator: props.simulatorData,
			runtimeSelection: {
				primaryMemberId: props.simulatorData.campA[0].members[0].id,
			},
		});
		await engine.setRuntimeConfig(createRealtimeConfig());
		await refreshMembers();

		const firstMember = members()[0];
		let firstController: ControllerEntry | null = null;
		if (firstMember) {
			firstController = await addMemberController(firstMember.id);
		}
		if (firstController) {
			setActiveControllerId(firstController.id);
		}
		setIsInitialized(true);
		void activateSceneSession(firstController?.id ?? null, firstController?.boundMemberId ?? firstMember?.id);

		const interval = setInterval(() => {
			const snapshot = engine.lifecycleActor.getSnapshot();
			setIsRunning(snapshot.matches("running"));
			setIsPaused(snapshot.matches("paused"));
		}, 100);
		registerCleanup(() => clearInterval(interval));
	});

	onCleanup(() => {
		console.log("--RealtimeSimulator Page Unmount");
		disposed = true;
		sceneSessionRequestSeq += 1;
		sceneSession()?.release();
		setSceneSession(null);
		cleanupFunctions.forEach((fn) => {
			try {
				fn();
			} catch (error) {
				console.error("清理函数执行失败:", error);
			}
		});
		engine.reset();
		memberControllers().forEach(({ controller }) => {
			controller.unbind().catch(console.error);
		});
		engine.off("frame_snapshot", handleFrameSnapshot);
		engine.off("engine_telemetry", handleEngineTelemetry);
		engine.off("domain_event_batch", handleDomainEventBatch);
		engine.off("system_event", handleSystemEvent);
	});

	const handleFrameSnapshot = (data: { engineId: string; snapshot: FrameSnapshot }) => {
		if (data.snapshot && typeof data.snapshot === "object" && "tickIndex" in data.snapshot) {
			setLatestFrameSnapshot(data.snapshot);
		}
	};

	const handleEngineTelemetry = (data: { engineId: string; telemetry: unknown }) => {
		if (!data.telemetry || typeof data.telemetry !== "object") return;
		const evt = data.telemetry as {
			tickIndex?: unknown;
			currentTimeMs?: unknown;
			runTime?: unknown;
			ticksPerSecond?: unknown;
			memberCount?: unknown;
		};
		if (
			typeof evt.tickIndex === "number" &&
			typeof evt.currentTimeMs === "number" &&
			typeof evt.runTime === "number" &&
			typeof evt.ticksPerSecond === "number" &&
			typeof evt.memberCount === "number"
		) {
			setEngineTelemetry({
				tickIndex: evt.tickIndex,
				currentTimeMs: evt.currentTimeMs,
				runTime: evt.runTime,
				ticksPerSecond: evt.ticksPerSecond,
				memberCount: evt.memberCount,
			});
		}
	};

	const handleDomainEventBatch = (data: { engineId: string; batch: unknown }) => {
		const parsed = ControllerDomainEventBatchSchema.safeParse(data.batch);
		if (!parsed.success) return;
		setControllerEventState((prev) => {
			const next = { ...prev };
			for (const event of parsed.data.events as ControllerDomainEvent[]) {
				const bucket = next[event.controllerId] ?? {
					skillAvailability: {},
					hp: null,
					mp: null,
					position: undefined,
				};
				switch (event.type) {
					case "state_changed":
						bucket.hp = event.hp;
						bucket.mp = event.mp;
						if (event.position) bucket.position = event.position;
						break;
					case "hit":
						if (event.hp !== undefined) bucket.hp = event.hp;
						break;
					case "death":
						bucket.hp = 0;
						break;
					case "move_started":
					case "move_stopped":
						if (event.position) bucket.position = event.position;
						break;
					case "skill_availability_changed":
						bucket.skillAvailability = {
							...(bucket.skillAvailability ?? {}),
							[event.skillId]: event.available,
						};
						break;
					case "cast_progress":
					case "camera_follow":
						break;
				}
				next[event.controllerId] = bucket;
			}
			return next;
		});
	};

	const handleSystemEvent = (_data: { engineId: string; event: unknown }) => {};

	const setupDataSync = () => {
		engine.on("frame_snapshot", handleFrameSnapshot);
		engine.on("engine_telemetry", handleEngineTelemetry);
		engine.on("domain_event_batch", handleDomainEventBatch);
		engine.on("system_event", handleSystemEvent);
	};

	const refreshMembers = async () => {
		try {
			const result = await engine.getMembers();
			if (Array.isArray(result)) {
				const validMembers = result.filter(
					(member) => member && typeof member === "object" && "id" in member && "type" in member && "name" in member,
				) as MemberSerializeData[];
				setMembers(validMembers);
			} else {
				console.warn("获取成员列表失败: 结果不是数组", result);
				setMembers([]);
			}
		} catch (error) {
			console.error("刷新成员列表失败:", error);
			setMembers([]);
		}
	};

	const addMemberController = async (memberId: string): Promise<ControllerEntry | null> => {
		if (!unboundMembers().some((member) => member.id === memberId)) {
			console.warn("无法添加控制器: 成员已绑定或不存在", memberId);
			return null;
		}
		const controller = new MemberController(engine);
		await controller.bind(memberId);
		const entry = { id: controller.controllerId, controller, boundMemberId: memberId };
		setMemberControllers((prev) => [...prev, entry]);
		if (!activeControllerId()) {
			setActiveControllerId(entry.id);
		}
		return entry;
	};

	const removeMemberController = async (controllerId: string) => {
		const current = memberControllers();
		const target = current.find((item) => item.id === controllerId);
		if (!target) return;
		await target.controller.unbind();
		const next = current.filter((item) => item.id !== controllerId);
		setMemberControllers(next);
		if (activeControllerId() === controllerId) {
			setActiveControllerId(next[0]?.id ?? null);
		}
	};

	const handleCastSkill = (skillId: string) => {
		activeControllerEntry()?.controller.castSkill(skillId).catch(console.error);
	};

	const handleAddControllerFromHud = async (memberId: string): Promise<void> => {
		const entry = await addMemberController(memberId);
		if (entry) {
			setActiveControllerId(entry.id);
		}
	};

	const statusText = createMemo(() => {
		if (isRunning()) return "运行中";
		if (isPaused()) return "已暂停";
		return "待机";
	});

	return (
		<Presence exitBeforeEnter>
			<Show
				when={isInitialized()}
				fallback={
					<Motion.div
						animate={{ opacity: [0, 1] }}
						exit={{ opacity: [1, 0] }}
						transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0 }}
						class="AnimationArea fixed inset-0 z-stack flex h-dvh w-dvw items-center justify-center backdrop-blur"
					>
						<div id="loadingBox" style={{ transform: "none", position: "relative", left: "unset", bottom: "unset" }}>
							<div class="Shadow shadow-none">
								<For each={Array.from({ length: 16 })}>{() => <div class="Circle"></div>}</For>
							</div>
							<div id="maskElement2"></div>
							<div id="maskElement3"></div>
							<div class="line">
								<For each={Array.from({ length: 16 })}>{() => <div class="Circle"></div>}</For>
							</div>
						</div>
					</Motion.div>
				}
			>
				<Motion.div
					animate={{ opacity: [0, 1] }}
					exit={{ opacity: [1, 0] }}
					transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0 }}
					class="RealtimeSimulator pointer-events-none fixed inset-0 z-stack h-dvh w-dvw overflow-hidden"
				>
					<div class="pointer-events-auto absolute left-3 top-3 flex max-w-[min(92vw,720px)] items-start gap-2">
						<A href="/" class="bg-primary-color-60 hidden rounded px-3 py-2 backdrop-blur-md landscape:flex">
							<Icons.Brand.NoPaddingLogoText class="h-6 w-40" />
						</A>
						<div class="bg-primary-color-70 border-dividing-color flex min-w-72 flex-col gap-2 rounded border p-2 backdrop-blur-md">
							<div class="flex items-center justify-between gap-2 text-sm">
								<span class="font-bold">{statusText()}</span>
								<Show when={engineTelemetry()}>
									{(telemetry) => (
										<span class="text-accent-color-70">
											TPS {telemetry().ticksPerSecond.toFixed(0)} · {telemetry().memberCount} 成员
										</span>
									)}
								</Show>
							</div>
							<MemberStatusPanel
								controllerId={activeControllerEntry()?.id ?? "active-controller"}
								member={() => activeMemberStatus() ?? activeMember()}
							/>
						</div>
					</div>

					<div class="pointer-events-auto absolute right-3 top-3 flex w-[min(92vw,360px)] flex-col gap-2">
						<div class="bg-primary-color-70 border-dividing-color flex items-center gap-2 rounded border p-2 backdrop-blur-md">
							<Select
								value={activeControllerEntry()?.id ?? ""}
								setValue={(value) => setActiveControllerId(value || null)}
								options={controllerOptions()}
								placeholder="选择主控成员"
								class="min-w-0 flex-1"
							/>
							<Show when={canAddMemberController()}>
								<AddMemberControllerButton unboundMembers={unboundMembers} onAdd={handleAddControllerFromHud} />
							</Show>
						</div>
						<Show when={memberControllers().length > 1}>
							<div class="bg-primary-color-70 border-dividing-color flex flex-wrap gap-1 rounded border p-2 backdrop-blur-md">
								<For each={memberControllers()}>
									{(item) => {
										const member = members().find((candidate) => candidate.id === item.boundMemberId);
										return (
											<Button
												level={activeControllerEntry()?.id === item.id ? "primary" : "secondary"}
												onClick={() => setActiveControllerId(item.id)}
												class="min-w-0 flex-1"
											>
												<span class="truncate text-xs">{member?.name ?? item.boundMemberId}</span>
											</Button>
										);
									}}
								</For>
							</div>
						</Show>
					</div>

					<div class="pointer-events-auto absolute bottom-3 left-1/2 flex w-[min(96vw,960px)] -translate-x-1/2 flex-col gap-2">
						<div class="bg-primary-color-70 border-dividing-color rounded border p-2 backdrop-blur-md">
							<ControlPanel
								engineActor={engine.lifecycleActor}
								onStart={() => engine.start()}
								onReset={() => engine.reset()}
								onPause={() => engine.pause()}
								onResume={() => engine.resume()}
								onStep={() => engine.step()}
							/>
						</div>
						<div class="bg-primary-color-70 border-dividing-color grid min-h-16 grid-flow-col grid-rows-1 gap-2 overflow-x-auto rounded border p-2 backdrop-blur-md auto-cols-[minmax(5.5rem,1fr)]">
							<Show
								when={activeSkillList().length > 0}
								fallback={<div class="flex h-12 items-center justify-center text-sm opacity-70">暂无可用技能</div>}
							>
								<For each={activeSkillList()}>
									{(skill) => (
										<Button
											onClick={() => handleCastSkill(skill.id)}
											disabled={activeControllerEvents().skillAvailability?.[skill.id] === false}
											class="h-12 min-w-0"
											level="secondary"
										>
											<Icons.Spirits iconName={skill.name} />
											<span class="truncate text-xs">{skill.name}</span>
										</Button>
									)}
								</For>
							</Show>
						</div>
					</div>

					<Show when={activeControllerEntry()}>
						{(entry) => (
							<Button
								level="secondary"
								onClick={() => removeMemberController(entry().id)}
								class="pointer-events-auto absolute bottom-3 right-3 h-12 w-12"
							>
								<Icons.Outline.Close />
							</Button>
						)}
					</Show>
				</Motion.div>
			</Show>
		</Presence>
	);
}
