/**
 * 实时模拟器 - 终端会话层
 *
 * 职责：
 * 1. 连接 SimulatorPool（单 worker）
 * 2. 维护引擎生命周期控制器（单 operator）
 * 3. 维护成员控制器列表（可动态添加）
 * 4. 接收并分发快照/事件到 UI
 */

import { createSignal, createMemo, onCleanup, onMount, For, Show } from "solid-js";
import { EngineLifecycleController } from "./controller/EngineLifecycleController";
import { MemberController } from "./controller/MemberController";
import { realtimeSimulatorPool } from "./core/thread/SimulatorPool";
import type { EngineControlMessage } from "./core/GameEngineSM";
import type { FrameSnapshot } from "./core/GameEngine";
import type { SimulatorWithRelations } from "@db/generated/repositories/simulator";
import type { MemberSerializeData } from "./core/Member/Member";
import { EngineStatusBar, ControlPanel } from "./controller/components";
import { AddMemberControllerButton } from "./controller/AddMemberControllerButton";
import { MemberControllerPanel } from "./controller/MemberControllerPanel";
import { Icons } from "~/components/icons";

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

	/** 引擎统计（暂时保留，后续可能用于显示） */
	// const [engineStats, setEngineStats] = createSignal<unknown | null>(null);

	// ==================== 状态信号 ====================

	const [isRunning, setIsRunning] = createSignal(false);
	const [isPaused, setIsPaused] = createSignal(false);

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
	});

	// ==================== 数据同步 ====================

	const setupDataSync = () => {
		// 监听引擎状态机消息
		realtimeSimulatorPool.on("engine_state_machine", (data: { workerId: string; event: unknown }) => {
			if (data.event && typeof data.event === "object" && "type" in data.event) {
				// 转发引擎状态机消息到 lifecycle controller
				(lifecycle.engineActor as { send: (msg: EngineControlMessage) => void }).send(
					data.event as EngineControlMessage,
				);
			}
		});

		// 监听帧快照
		realtimeSimulatorPool.on("frame_snapshot", (data: { workerId: string; event: unknown }) => {
			if (data.event && typeof data.event === "object" && "frameNumber" in data.event) {
				const snapshot = data.event as FrameSnapshot;
				setLatestFrameSnapshot(snapshot);
			}
		});

		// 监听系统事件
		realtimeSimulatorPool.on("system_event", (_data: { workerId: string; event: unknown }) => {
			// 系统事件处理
			// primary_target_changed 等事件不再影响 UI（多控制器架构下不再有单主控概念）
			// 这些事件可能仍用于渲染层等其他用途，但终端层不再处理
		});

		// 监听渲染命令
		realtimeSimulatorPool.on("render_cmd", (data: { workerId: string; event: unknown }) => {
			// 渲染命令由 UI 层处理
			console.log("RealtimeSimulator: 收到渲染命令:", data.event);
		});
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
		<div class="RealtimeSimulator flex flex-col h-full w-full overflow-y-auto p-2 gap-2">
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
							onRemove={() => removeMemberController(item.id)}
						/>
					)}
				</For>
			</div>

			{/* 引擎控制栏 */}
			<div class="flex gap-1">
				<div class="Left flex gap-1 p-3 items-center w-fit">
					<Icons.Brand.LogoText class="w-fit h-6" />
				</div>

				<div class="flex gap-2 w-full">
					<EngineStatusBar isRunning={isRunning} isPaused={isPaused} engineView={latestFrameSnapshot} />
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
		</div>
	);
}
