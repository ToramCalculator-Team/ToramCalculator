/**
 * UI组件模块
 *
 * 功能：
 * - 按功能区域组织的UI组件
 * - 状态栏、控制面板、成员面板等
 * - 可复用的UI组件
 */

import { type Accessor, createEffect, createSignal, For, Match, Show, Switch } from "solid-js";
import { Button } from "~/components/controls/button";
import { LoadingBar } from "~/components/controls/loadingBar";
import { Select } from "~/components/controls/select";
import type { ComputedSkillInfo } from "../core/GameEngine";
import type { MemberSerializeData } from "../core/Member/Member";
import { MemberStatusPanel } from "../core/Member/MemberStatusPanel";
import type { EngineTelemetry } from "../core/thread/protocol";

// ============================== 状态栏组件 ==============================

interface StatusBarProps {
	isRunning: Accessor<boolean>;
	isPaused: Accessor<boolean>;
	telemetry: Accessor<EngineTelemetry | null>;
}

/**
 * 状态栏组件 - 显示模拟器运行状态和关键指标
 */
export function EngineStatusBar(props: StatusBarProps) {
	return (
		<div class="portrait:bg-area-color flex items-center rounded p-4">
			<div class="flex w-full items-center gap-4 portrait:justify-between">
				<Show when={props.isRunning() || props.isPaused()}>
					<div class="flex items-center gap-2">
						<span class="text-sm font-medium">运行时间：</span>
						<span class="text-sm">{((props.telemetry()?.runTime ?? 0) / 1000).toFixed(1)}s</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="text-sm font-medium">成员数：</span>
						<span class="text-sm">{props.telemetry()?.memberCount ?? 0}</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="text-sm font-medium">帧号：</span>
						<span class="text-sm">{props.telemetry()?.frameNumber ?? 0}</span>
					</div>
				</Show>
			</div>
		</div>
	);
}

// ============================== 控制面板组件 ==============================

interface ControlPanelProps {
	engineActor: any; // 状态机 Actor
	onStart: () => void;
	onReset: () => void;
	onPause: () => void;
	onResume: () => void;
	onStep: () => void;
}

/**
 * 控制面板组件 - 模拟器控制按钮
 */
export function ControlPanel(props: ControlPanelProps) {
	// 使用响应式信号来跟踪按钮状态
	const [canStart, setCanStart] = createSignal(false);
	const [canReset, setCanReset] = createSignal(false);
	const [canPause, setCanPause] = createSignal(false);
	const [canResume, setCanResume] = createSignal(false);
	const [canStep, setCanStep] = createSignal(false);

	const updateFromSnapshot = () => {
		const snapshot = props.engineActor.getSnapshot();
		// GameEngineSM 现使用 CMD_* 协议，这里直接用状态匹配来驱动按钮可用性
		setCanStart(snapshot.matches("ready"));
		setCanPause(snapshot.matches("running"));
		setCanResume(snapshot.matches("paused"));
		setCanStep(snapshot.matches("paused"));
		// RESET 在除 idle/initializing 外基本都应该可用（按当前 SM 转移定义）
		setCanReset(!snapshot.matches("idle") && !snapshot.matches("initializing"));
	};

	// 监听状态机变化并更新按钮状态
	createEffect(() => {
		updateFromSnapshot();
	});

	// 订阅状态机变化
	createEffect(() => {
		const subscription = props.engineActor.subscribe(() => {
			updateFromSnapshot();
		});

		return () => subscription.unsubscribe();
	});

	return (
		<div class="ControlPanel flex w-full flex-1 gap-2">
			{/* 启动/暂停/恢复按钮 - 互斥 */}
			<Show when={!canPause() && !canResume()}>
				<Button onClick={props.onStart} disabled={!canStart()} class="w-full">
					启动模拟
				</Button>
			</Show>
			<Show when={canPause()}>
				<Button onClick={props.onPause} class="bg-brand-color-1st w-full">
					暂停
				</Button>
			</Show>
			<Show when={canResume()}>
				<Button onClick={props.onResume} class="w-full">
					恢复
				</Button>
			</Show>

			{/* 重置按钮 - 启动后才可用 */}
			<Button onClick={props.onReset} disabled={!canReset()} class="w-full">
				重置模拟
			</Button>

			{/* 单步按钮 - 仅在暂停状态下可用 */}
			<Button onClick={props.onStep} disabled={!canStep()} class="w-full">
				单步推进
			</Button>
		</div>
	);
}

// ============================== 成员管理组件 ==============================

interface MemberSelectProps {
	members: Accessor<MemberSerializeData[]>;
	selectedId: Accessor<string | null>;
	onSelect: (memberId: string) => void;
	placeholder?: string;
}

/**
 * 成员选择组件
 */
export function MemberSelect(props: MemberSelectProps) {
	return (
		<div class="MemberSelect flex w-full flex-1 items-center gap-2">
			<Show
				when={props.members().length > 0}
				fallback={
					<div class="bg-area-color flex h-12 w-full items-center justify-center rounded">
						<LoadingBar />
					</div>
				}
			>
				<Select
					value={props.selectedId() || ""}
					setValue={(v) => {
						if (!v && props.members().length > 0) return;
						props.onSelect(v);
					}}
					options={[
						...props.members().map((member) => ({
							label: `${member.name || member.id} (${member.type || "unknown"})`,
							value: member.id,
						})),
					]}
					placeholder={props.placeholder || "请选择成员"}
					optionPosition="top"
				/>
			</Show>
		</div>
	);
}
