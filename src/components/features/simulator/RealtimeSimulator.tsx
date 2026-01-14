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
import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { Icons } from "~/components/icons";
import { AddMemberControllerButton } from "./controller/AddMemberControllerButton";
import { ControlPanel, EngineStatusBar } from "./controller/components";
import { EngineLifecycleController } from "./controller/EngineLifecycleController";
import { MemberController } from "./controller/MemberController";
import { MemberControllerPanel } from "./controller/MemberControllerPanel";
import type { EngineControlMessage } from "./core/GameEngineSM";
import type { MemberSerializeData } from "./core/Member/Member";
import { ControllerDomainEventBatchSchema, type EngineTelemetry } from "./core/thread/protocol";
import { realtimeSimulatorPool } from "./core/thread/SimulatorPool";
import type { ControllerDomainEvent, FrameSnapshot } from "./core/types";
import { Motion, Presence } from "solid-motionone";
import { store } from "~/store";

export interface RealtimeSimulatorProps {
	simulatorData: SimulatorWithRelations;
}

export function RealtimeSimulator(props: RealtimeSimulatorProps) {
	// ==================== 核心控制器 ====================

	/** 引擎生命周期控制器（单 operator） */
	const lifecycle = new EngineLifecycleController();

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

		// 先注册 SimulatorPool 事件监听（必须在初始化之前，以便接收 RESULT_INIT）
		setupDataSync();

		// 初始化引擎（会发送 CMD_INIT，需要监听器接收 RESULT_INIT）
		await lifecycle.initialize(props.simulatorData);

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
			const snapshot = lifecycle.engineActor.getSnapshot();
			setIsRunning(snapshot.matches("running"));
			setIsPaused(snapshot.matches("paused"));
		}, 100);

		onCleanup(() => {
			clearInterval(interval);
		});
	});

	onCleanup(() => {
		console.log(`--RealtimeSimulator Page Unmount`);
		lifecycle.destroy();
		// 清理所有成员控制器
		memberControllers().forEach(({ controller }) => {
			controller.unbind().catch(console.error);
		});
		// 卸载所有监听器
		realtimeSimulatorPool.off("engine_state_machine", handleEngineStateMachine);
		realtimeSimulatorPool.off("frame_snapshot", handleFrameSnapshot);
		realtimeSimulatorPool.off("engine_telemetry", handleEngineTelemetry);
		realtimeSimulatorPool.off("domain_event_batch", handleDomainEventBatch);
		realtimeSimulatorPool.off("system_event", handleSystemEvent);
		realtimeSimulatorPool.off("render_cmd", handleRenderCmd);
	});

	// ==================== 数据同步 ====================

	// 保存所有监听器引用，确保可以正确卸载
	const handleEngineStateMachine = (data: { workerId: string; event: unknown }) => {
		if (data.event && typeof data.event === "object" && "type" in data.event) {
			// 转发引擎状态机消息到 lifecycle controller
			(lifecycle.engineActor as { send: (msg: EngineControlMessage) => void }).send(data.event as EngineControlMessage);
		}
	};

	const handleFrameSnapshot = (data: { workerId: string; event: unknown }) => {
		if (data.event && typeof data.event === "object" && "frameNumber" in data.event) {
			const snapshot = data.event as FrameSnapshot;
			setLatestFrameSnapshot(snapshot);
		}
	};

	const handleEngineTelemetry = (data: { workerId: string; event: unknown }) => {
		if (!data.event || typeof data.event !== "object") return;
		const evt = data.event as { frameNumber?: unknown; runTime?: unknown; fps?: unknown; memberCount?: unknown };
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

	const handleDomainEventBatch = (data: { workerId: string; event: unknown }) => {
		const parsed = ControllerDomainEventBatchSchema.safeParse(data.event);
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

	const handleSystemEvent = (_data: { workerId: string; event: unknown }) => {
		// 系统事件现在只用于 worker_ready/error/日志等，不再处理领域事件
		// 领域事件已提升为 domain_event_batch 顶层消息
	};

	const handleRenderCmd = (data: { workerId: string; event: unknown }) => {
		// 渲染命令由 UI 层处理
		console.log("RealtimeSimulator: 收到渲染命令:", data.event);
	};

	const setupDataSync = () => {
		// 监听引擎状态机消息
		realtimeSimulatorPool.on("engine_state_machine", handleEngineStateMachine);

		// 监听帧快照
		realtimeSimulatorPool.on("frame_snapshot", handleFrameSnapshot);

		// 监听引擎遥测（轻量指标）
		realtimeSimulatorPool.on("engine_telemetry", handleEngineTelemetry);

		// 监听领域事件批（从 system_event 提升为顶层消息）
		realtimeSimulatorPool.on("domain_event_batch", handleDomainEventBatch);

		// 监听系统事件（worker_ready/error/日志等杂项，不再包含领域事件）
		realtimeSimulatorPool.on("system_event", handleSystemEvent);

		// 监听渲染命令
		realtimeSimulatorPool.on("render_cmd", handleRenderCmd);
	};

	// ==================== 成员管理 ====================

	const refreshMembers = async () => {
		try {
			const result = await realtimeSimulatorPool.getMembers();
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

		const controller = new MemberController();
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
						class="AnimationArea flex h-full w-full items-center justify-center"
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
						{/* 成员控制器面板列表 */}
						<For each={memberControllers()}>
							{(item) => (
								<MemberControllerPanel
									controller={item.controller}
									boundMemberId={item.boundMemberId}
									latestSnapshot={latestFrameSnapshot}
									members={members}
									controllerEventState={controllerEventState}
									onRemove={() => removeMemberController(item.id)}
								/>
							)}
						</For>
					</div>

					{/* 引擎控制栏 */}
					<div class="flex gap-1">
						<div class="Left flex gap-1 p-3 items-center w-fit">
							<Icons.Brand.NoPaddingLogoText class="w-[160px] h-6" />
						</div>

						<div class="flex gap-2 w-full">
							<EngineStatusBar isRunning={isRunning} isPaused={isPaused} telemetry={engineTelemetry} />
							<ControlPanel
								engineActor={lifecycle.engineActor}
								onStart={() => lifecycle.start()}
								onReset={() => lifecycle.reset()}
								onPause={() => lifecycle.pause()}
								onResume={() => lifecycle.resume()}
								onStep={() => lifecycle.step()}
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
