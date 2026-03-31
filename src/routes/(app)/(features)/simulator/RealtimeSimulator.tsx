/**
 * 实时模拟器 - 终端会话层
 *
 * 职责：
 * 1. 连接 SimulatorPool（单 worker）
 * 2. 维护引擎生命周期控制器（单 operator）
 * 3. 维护成员控制器列表（可动态添加）
 * 4. 接收并分发快照/事件到 UI
 */

import type { SimulatorWithRelations } from "@db/generated/repositories/simulator";
import { A } from "@solidjs/router";
import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { waitFor } from "xstate";
import { AddMemberControllerButton } from "~/components/features/simulator/controller/AddMemberControllerButton";
import { ControlPanel, EngineStatusBar } from "~/components/features/simulator/controller/components";
import { MemberController } from "~/components/features/simulator/controller/MemberController";
import { MemberControllerPanel } from "~/components/features/simulator/controller/MemberControllerPanel";
import { useEngine } from "~/components/features/simulator/core/thread/EngineContext";
import {
	ControllerDomainEventBatchSchema,
	type EngineTelemetry,
} from "~/components/features/simulator/core/thread/protocol";
import type { ControllerDomainEvent, FrameSnapshot } from "~/components/features/simulator/core/types";
import type { MemberSerializeData } from "~/components/features/simulator/core/World/Member/Member";
import { GameView } from "~/components/features/simulator/render/Renderer";
import { Icons } from "~/components/icons";
import { store } from "~/store";

export interface RealtimeSimulatorProps {
	simulatorData: SimulatorWithRelations;
}

export function RealtimeSimulator(props: RealtimeSimulatorProps) {
	const { createEngine, disposeEngine } = useEngine();
	const engine = createEngine("simulator");

	const cleanupFunctions: Array<() => void> = [];

	function registerCleanup(fn: () => void) {
		cleanupFunctions.push(fn);
	}

	/** 成员控制器列表（可动态添加） */
	const [memberControllers, setMemberControllers] = createSignal<
		Array<{ id: string; controller: MemberController; boundMemberId: string }>
	>([]);

	// ==================== 数据状态 ====================

	/** 成员列表 */
	const [members, setMembers] = createSignal<MemberSerializeData[]>([]);

	/** 最新帧快照（包含 byController） */
	const [latestFrameSnapshot, setLatestFrameSnapshot] = createSignal<FrameSnapshot | null>(null);

	/** 控制器域事件聚合状态（按 controller 投影） */
	const [controllerEventState, setControllerEventState] = createSignal<
		Record<
			string,
			{
				skillAvailability?: Record<string, boolean>;
				hp?: number | null;
				mp?: number | null;
				position?: { x: number; y: number; z: number };
			}
		>
	>({});

	/** 引擎统计（暂时保留，后续可能用于显示） */
	// const [engineStats, setEngineStats] = createSignal<unknown | null>(null);

	// ==================== 状态信号 ====================

	const [isInitialized, setIsInitialized] = createSignal(false);
	const [isRunning, setIsRunning] = createSignal(false);
	const [isPaused, setIsPaused] = createSignal(false);
	const [engineTelemetry, setEngineTelemetry] = createSignal<EngineTelemetry | null>(null);

	// ==================== 初始化 ====================

	onMount(async () => {
		console.log(`--RealtimeSimulator Page Mount`);

		setupDataSync();

		await engine.loadScenario(props.simulatorData as unknown as Parameters<typeof engine.loadScenario>[0]);
		await waitFor(engine.lifecycleActor, (state) => state.matches("ready"), { timeout: 5000 });

		// 预加载成员数据
		await refreshMembers();

		// 自动创建默认成员控制器（绑定到第一个成员）
		const firstMember = members()[0];
		if (firstMember && memberControllers().length === 0) {
			console.log("自动创建默认成员控制器，绑定到:", firstMember.name);
			await addMemberController(firstMember.id);
			setIsInitialized(true);
		}

		// 定期检查状态变化
		const interval = setInterval(() => {
			const snapshot = engine.lifecycleActor.getSnapshot();
			setIsRunning(snapshot.matches("running"));
			setIsPaused(snapshot.matches("paused"));
		}, 100);

		registerCleanup(() => {
			clearInterval(interval);
		});
	});

	onCleanup(() => {
		console.log(`--RealtimeSimulator Page Unmount`);
		// 执行所有注册的清理函数
		cleanupFunctions.forEach((fn) => {
			try {
				fn();
			} catch (error) {
				console.error("清理函数执行失败:", error);
			}
		});
		engine.reset();
		// 清理所有成员控制器
		memberControllers().forEach(({ controller }) => {
			controller.unbind().catch(console.error);
		});
		// 卸载所有监听器
		engine.off("frame_snapshot", handleFrameSnapshot);
		engine.off("engine_telemetry", handleEngineTelemetry);
		engine.off("domain_event_batch", handleDomainEventBatch);
		engine.off("system_event", handleSystemEvent);
		engine.off("render_cmd", handleRenderCmd);
		void disposeEngine("simulator");
	});

	// ==================== 数据同步 ====================

	const handleFrameSnapshot = (data: { engineId: string; snapshot: FrameSnapshot }) => {
		if (data.snapshot && typeof data.snapshot === "object" && "frameNumber" in data.snapshot) {
			const snapshot = data.snapshot;
			setLatestFrameSnapshot(snapshot);
		}
	};

	const handleEngineTelemetry = (data: { engineId: string; telemetry: unknown }) => {
		if (!data.telemetry || typeof data.telemetry !== "object") return;
		const evt = data.telemetry as { frameNumber?: unknown; runTime?: unknown; fps?: unknown; memberCount?: unknown };
		if (
			typeof evt.frameNumber === "number" &&
			typeof evt.runTime === "number" &&
			typeof evt.fps === "number" &&
			typeof evt.memberCount === "number"
		) {
			setEngineTelemetry({
				frameNumber: evt.frameNumber,
				runTime: evt.runTime,
				fps: evt.fps,
				memberCount: evt.memberCount,
			});
		}
	};

	const handleDomainEventBatch = (data: { engineId: string; batch: unknown }) => {
		const parsed = ControllerDomainEventBatchSchema.safeParse(data.batch);
		if (parsed.success) {
			const batch = parsed.data;
			setControllerEventState((prev) => {
				const next = { ...prev };
				for (const e of batch.events as ControllerDomainEvent[]) {
					const bucket = next[e.controllerId] ?? {
						skillAvailability: {},
						hp: null,
						mp: null,
						position: undefined,
					};

					switch (e.type) {
						case "state_changed":
							bucket.hp = e.hp;
							bucket.mp = e.mp;
							if (e.position) bucket.position = e.position;
							break;
						case "hit":
							if (e.hp !== undefined) bucket.hp = e.hp;
							break;
						case "death":
							bucket.hp = 0;
							break;
						case "move_started":
						case "move_stopped":
							if (e.position) bucket.position = e.position;
							break;
						case "skill_availability_changed":
							bucket.skillAvailability = {
								...(bucket.skillAvailability ?? {}),
								[e.skillId]: e.available,
							};
							break;
						case "cast_progress":
							// 可扩展：如果 UI 需要展示施法进度，可在此存储
							break;
						case "camera_follow":
							// 相机事件交由渲染层处理
							break;
					}
					next[e.controllerId] = bucket;
				}
				return next;
			});
		}
	};

	const handleSystemEvent = (_data: { engineId: string; event: unknown }) => {
		// 系统事件现在只用于 worker_ready/error/日志等，不再处理领域事件
		// 领域事件已提升为 domain_event_batch 顶层消息
	};

	const handleRenderCmd = (data: { engineId: string; cmd: unknown }) => {
		// 渲染命令由 UI 层处理
		console.log("RealtimeSimulator: 收到渲染命令:", data.cmd);
	};

	const setupDataSync = () => {
		engine.on("frame_snapshot", handleFrameSnapshot);
		engine.on("engine_telemetry", handleEngineTelemetry);
		engine.on("domain_event_batch", handleDomainEventBatch);
		engine.on("system_event", handleSystemEvent);
		engine.on("render_cmd", handleRenderCmd);
	};

	// ==================== 成员管理 ====================

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

	// ==================== 成员控制器管理 ====================

	/** 获取已绑定的成员ID集合 */
	const boundMemberIds = createMemo(() => {
		return new Set(memberControllers().map((mc) => mc.boundMemberId));
	});

	/** 是否可以添加新的成员控制器 */
	const canAddMemberController = createMemo(() => {
		const bound = boundMemberIds();
		return members().some((m) => !bound.has(m.id));
	});

	/** 获取未绑定的成员列表 */
	const unboundMembers = createMemo(() => {
		const bound = boundMemberIds();
		return members().filter((m) => !bound.has(m.id));
	});

	/** 添加成员控制器 */
	const addMemberController = async (memberId: string) => {
		if (!unboundMembers().some((m) => m.id === memberId)) {
			console.warn("无法添加控制器: 成员已绑定或不存在", memberId);
			return;
		}

		const controller = new MemberController(engine);
		await controller.bind(memberId);

		setMemberControllers((prev) => [...prev, { id: controller.controllerId, controller, boundMemberId: memberId }]);
	};

	/** 移除成员控制器 */
	const removeMemberController = async (controllerId: string) => {
		const controller = memberControllers().find((mc) => mc.id === controllerId);
		if (controller) {
			await controller.controller.unbind();
			setMemberControllers((prev) => prev.filter((mc) => mc.id !== controllerId));
		}
	};

	// ==================== UI 渲染 ====================
	return (
		<Presence exitBeforeEnter>
			<Show
				when={isInitialized()}
				fallback={
					<Motion.div
						animate={{
							opacity: [0, 1],
						}}
						exit={{
							opacity: [1, 0],
						}}
						transition={{
							duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0,
						}}
						class="AnimationArea flex h-full w-full items-center justify-center backdrop-blur"
					>
						<div
							id="loadingBox"
							style={{
								transform: "none",
								position: "relative",
								left: "unset",
								bottom: "unset",
							}}
						>
							<div class="Shadow shadow-none">
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
							</div>
							<div id="maskElement2"></div>
							<div id="maskElement3"></div>
							<div class="line">
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
								<div class="Circle"></div>
							</div>
						</div>
					</Motion.div>
				}
			>
				<Motion.div
					animate={{
						opacity: [0, 1],
					}}
					exit={{
						opacity: [1, 0],
					}}
					transition={{
						duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0,
					}}
					class="RealtimeSimulator flex flex-col h-full w-full overflow-y-auto p-2 gap-2"
				>
					{/* 成员控制器面板列表 */}
					<div class="flex w-full h-full gap-2">
						<For each={memberControllers()}>
							{(item) => (
								<MemberControllerPanel
									controller={item.controller}
									boundMemberId={item.boundMemberId}
									latestSnapshot={latestFrameSnapshot}
									members={members}
									controllerEventState={controllerEventState}
									onRemove={() => removeMemberController(item.id)}
									gameView={<GameView followEntityId={members()[0]?.id} engine={engine} />}
								/>
							)}
						</For>
					</div>

					{/* 引擎控制栏 */}
					<div class="flex gap-1">
						<A href="/" class="Left flex gap-1 p-3 items-center w-fit">
							<Icons.Brand.NoPaddingLogoText class="w-[160px] h-6" />
						</A>

						<div class="flex gap-2 w-full">
							<EngineStatusBar isRunning={isRunning} isPaused={isPaused} telemetry={engineTelemetry} />
							<ControlPanel
								engineActor={engine.lifecycleActor}
								onStart={() => engine.start()}
								onReset={() => engine.reset()}
								onPause={() => engine.pause()}
								onResume={() => engine.resume()}
								onStep={() => engine.step()}
							/>
						</div>

						<div class="Right flex items-center gap-1 w-fit">
							{/* 添加控制器按钮 */}
							<Show when={canAddMemberController()}>
								<AddMemberControllerButton unboundMembers={unboundMembers} onAdd={addMemberController} />
							</Show>
						</div>
					</div>
				</Motion.div>
			</Show>
		</Presence>
	);
}
